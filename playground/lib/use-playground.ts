/**
 * playground 的状态机：一个 hook 管住画布、渲染队列、批量、导出与落盘。
 *
 * 为什么集中成一个 hook（而不是像 DSH 实验场那样把画布交给卡片组件）：
 * 那一页同时只挂一张卡，卡自己管自己的画布；这一页**只有一块活画布**，`#stage` 这个 DOM 节点
 * 是它的家，而烟测脚本正是靠 `#stage canvas` 判「真画出来了」。把画布交给某个子组件，
 * 等于把「谁是那块画布」这件事藏进组件树，烟测与页面就各说各话。
 *
 * 契约（改这个文件之前先读这几条）：
 *
 * ① **一次渲染 = 一块新画布**。这是从 DSH 卡片带过来的口径，也是「画面会无限叠加」的根治办法。
 *    manim-web 的场景没有安全的「原地清空」（`Scene.clear()` 会连 3D 灯光一起摘掉），
 *    而适配层的 `Scene.__init__` 又**不清场**——所以复用一块画布跑第二条语料，`self.add(...)`
 *    就是往上一幅画上继续加：点三条就是三幅叠在一起。DSH 那边的解法是每次 run 都
 *    `createSurface()` 一块新的（卡片按 callId 挂载，天然如此）。这里照做。
 *    代价是每次渲染建一个 WebGL 上下文——先 dispose 旧的再建新的，不会撞上浏览器的上下文上限。
 *
 * ② **画布与 fast 档挂钩**：极速是建画布时的属性（`SurfaceOptions.fast`），不是可以事后拨的开关。
 *    反正每次渲染都新建，于是「切档」这件事就只剩「把手上这条按新档位重跑一遍」——
 *    与 DSH 的 `toggleFast` 一致（不然开关点了像没反应）。
 *
 * ③ **只有单条渲染走预检**。批量不走：`check()` 是真跑一遍 Python（干跑桥），
 *    两百多条等于把批量耗时翻倍，而批量要的是「哪几条不对」，run() 自己的报错已经够了。
 *    单条的预检结论按源码缓存（语料不可变，同一段代码的结论永远是同一个），所以反复点同一条
 *    不会反复干跑。
 *
 * ④ **一次只跑一个**：surface 内部的 tail 队列保证串行，`running` 只是 UI 层的闸。
 *
 * ⑤ **「点一条」= 一条完整的动作序列，不是两步**。`openExample` 直接调 `runJob`，
 *    中间**不许有 await 把两件事串成一条前后依赖的链**——踩过一次，见 `runJob` 的注释：
 *    那种写法会让每次点击干等 60 秒的超时兜底才开演。
 *
 * ⑥ **作废的趟一个字都不报**（`cancelled`）。判断「还是不是当前那趟」用 `runSeed`：
 *    换一条、按停止、清记录都会把它顶掉。
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  createManimRenderer,
  type CheckResult,
  type ManimExample,
  type ManimRenderer,
  type Playback,
  type PlaybackSegment,
  type RenderController,
  type Session,
  type SessionAppend,
  type SessionVerdict,
  type Surface,
} from 'manim-live'
import { loadPlaygroundCorpus } from './corpus.ts'
import { T } from './i18n.ts'
import {
  clearGround, clearMarks, loadGround, loadMarks, saveGround, saveMarks,
} from './storage.ts'
import {
  FREE_SAMPLE, SEGMENT_SAMPLE, TIMEOUT_MS,
  type CardResult, type GroundFilter, type GroundView, type Job, type LayoutMode,
  type ManualMark, type Overlay, type ThemeMode,
} from './types.ts'

/** 状态行的三种色调（错误红 / 成功绿 / 其余中性）。 */
export type StatusKind = 'idle' | 'running' | 'ok' | 'error'

export interface Status {
  text: string
  kind: StatusKind
  /**
   * 递增计数器：**每开始一次、每结束一次都 +1**。
   *
   * 存在的唯一理由是让烟测能区分「屏幕上那句『渲染完成』是这一轮的，还是上一轮留下的」——
   * 光靠文本判断会撞上重渲染的时序（点下去到状态翻新之间有一帧空档，轮询正好读到旧值）。
   * 页面自己不用它。
   */
  seq: number
}

/** 当前展示的是什么（预览面板据此取预期表现、截图与源码）。 */
export interface Shown {
  job: Job
  run: number
  fast: boolean
}

/**
 * 起手选中哪一条：`basic` 组里最简单的那个圆——第一屏就能跑通，是最好的自我介绍。
 * 找不到（语料被改）就退回列表第一条。
 */
const DEFAULT_EXAMPLE_ID = 'basic-circle'

/** 骨架屏那层。常量对象：`setOverlay` 反复设同一个引用不会触发额外渲染。 */
const SKELETON: Overlay = { kind: 'skeleton' }

export function usePlayground() {
  // ---- 落盘过的那一份（只读一次，作为各状态的初值）----
  const [restored] = useState(() => loadGround())

  const loaded = useRef(loadPlaygroundCorpus()).current
  const { corpus } = loaded

  const [view, setView] = useState<GroundView>(restored.view ?? 'corpus')
  const [layout, setLayout] = useState<LayoutMode>(restored.layout ?? 'list')
  const [theme, setTheme] = useState<ThemeMode>(restored.theme ?? 'dark')
  const [filter, setFilter] = useState<GroundFilter>(restored.filter ?? 'all')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Record<string, CardResult>>(() => restored.results ?? {})
  const [source, setSource] = useState(restored.source ?? FREE_SAMPLE)
  const [fast, setFastState] = useState(restored.fast ?? false)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [marks, setMarks] = useState<Record<string, ManualMark>>(() => loadMarks())
  /** 加载失败的截图（语料还在、图被删了）：按路径记下来就别再试，免得控制台一直报 404。 */
  const [brokenShots, setBrokenShots] = useState<Record<string, true>>({})

  const [shown, setShown] = useState<Shown | null>(null)
  /**
   * 预览面板正在讲哪一条。与 `shown` 分开：`shown` 是「画布上那块画面是哪来的」，
   * 而选中的那条**未必已经渲染过**——刚打开页面时预览里要有预期表现、截图与源码可看，
   * 但画布是空的（这一页刻意不自动渲染：自动化一上来就跑一遍，既慢又让烟测的时序变得不可判）。
   */
  const [selected, setSelected] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  /** 批量进度。null = 没在批量跑。 */
  const [batch, setBatch] = useState<{ done: number; total: number } | null>(null)
  /** 盖在画布上的那层（骨架 / 取包进度）。见 types.ts 的 Overlay。 */
  const [overlay, setOverlay] = useState<Overlay | null>(null)
  const [status, setStatus] = useState<Status>({ text: T.warmup, kind: 'running', seq: 0 })
  const [warm, setWarm] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [note, setNote] = useState<string | null>(null)
  // 会话视图：当前段的代码（不落盘——会话本身是临时的）与投影读数。
  const [sessionCode, setSessionCode] = useState(SEGMENT_SAMPLE)
  const [sessionInfo, setSessionInfo] = useState<{ count: number; source: string } | null>(null)
  // 时间轴视图：收好之后的静态读数（控制器本体在 playbackRef，时刻由面板自己轮询）。
  const [playbackInfo, setPlaybackInfo] = useState<{ duration: number; segments: PlaybackSegment[] } | null>(null)
  // 「导出」分节：onProgress 的过程播报与进行中那次导出的取消把手。
  const [exportLog, setExportLog] = useState<string[]>([])
  const exportAbort = useRef<AbortController | null>(null)

  const statusSeq = useRef(0)
  const runSeed = useRef(0)
  /** 批量渲染的取消信号：每开一轮 +1，循环每步都比一次，不等号就停。 */
  const token = useRef(0)
  /** 当前这条渲染完成的落点：批量循环 await 它。 */
  const waiter = useRef<((result: CardResult) => void) | null>(null)
  const timer = useRef<number | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const surfaceRef = useRef<Surface | null>(null)
  const rendererRef = useRef<ManimRenderer | null>(null)
  // 会话与时间轴的当前控制器（核心包的「活形态」：同画布至多一个，切换视图时收掉）。
  const sessionRef = useRef<Session | null>(null)
  const playbackRef = useRef<Playback | null>(null)

  const say = useCallback((text: string, kind: StatusKind = 'idle'): void => {
    statusSeq.current += 1
    setStatus({ text, kind, seq: statusSeq.current })
  }, [])

  /** 给渲染器选项里那个 `onLoading` 用：它建一次就用一辈子，不能闭包住每次渲染都变的 `say`。 */
  const sayRef = useRef(say)
  sayRef.current = say

  /** 取包进展的延迟器（见 showPackages）。 */
  const packagesTimer = useRef<number | null>(null)
  /**
   * 「正在取包」这件事**延后 300ms 才显示**。
   *
   * 为什么不立刻报：随包件（numpy / sympy）与磁盘缓存命中都是瞬时的，立刻报会让提示闪一下
   * 就没了——看起来像卡了一帧，比不报更让人不安。DSH 卡片那里同一个 300ms 阈值。
   *
   * 取完（`names` 为空）时把浮层收掉，并且**交还给骨架屏**：批量跑的时候一条语料里既可能取包、
   * 也可能在极速落终态，取包结束时该回到「极速在跑」那层，而不是把画布敞开。
   */
  const showPackages = useRef<(names: string[]) => void>(() => {})
  showPackages.current = (names: string[]): void => {
    if (packagesTimer.current !== null) {
      window.clearTimeout(packagesTimer.current)
      packagesTimer.current = null
    }
    if (names.length === 0) {
      setOverlay(fastRef.current ? SKELETON : null)
      return
    }
    const text = T.loadingPackages(names.join('、'))
    packagesTimer.current = window.setTimeout(() => {
      packagesTimer.current = null
      setOverlay({ kind: 'packages', text })
    }, 300)
  }

  /**
   * 当前档位，**用 ref 而不是闭包**。
   *
   * 为什么不直接读 `fast`：`freshSurface` 一旦闭包住 `fast`，它的身份就会随档位变，
   * 而批量循环是在**开跑那一刻**把 `runJob` / `execute` 一起捕获下来的——
   * 循环里那几十次调用用的是旧闭包，于是「批量开头切到极速」这件事只对第一条生效，
   * 后面全部按旧档位真时序慢慢跑（表现：批量卡在第二条不动，像死住）。
   * ref 是**当下**的值，与闭包何时生成无关。
   */
  const fastRef = useRef(fast)
  fastRef.current = fast

  const getRenderer = useCallback((): ManimRenderer => {
    rendererRef.current ??= createManimRenderer({
      // 自托管那条路：资源由本目录的 vite 中间件挂在本机（见 playground/vite.config.ts）。
      pyodideIndexURL: '/pyodide/',
      katexBaseURL: '/katex/',
      // 「正在取包：pandas…」——这一条以前是空的（工厂里那个选项没接线），
      // 于是「需联网」那三组跑起来像卡死。现在它真的会报进度（延后 300ms，见 showPackages）。
      onLoading: (names) => {
        sayRef.current(
          names.length === 0 ? T.rendering : T.loadingPackages(names.join('、')),
          'running',
        )
        showPackages.current(names)
      },
    })
    return rendererRef.current
  }, [])

  /** 拆掉当前画布。`#stage` 里不放 React 子节点，所以可以放心把容器清空。 */
  const dropSurface = useCallback((): void => {
    surfaceRef.current?.dispose()
    surfaceRef.current = null
    stageRef.current?.replaceChildren()
  }, [])

  /**
   * 造一块**全新的**画布（契约 ①）。
   *
   * 每次都新建、且先 dispose 旧的：不复用是「不叠加」的前提，先释放是为了不把 WebGL 上下文
   * 攒起来——浏览器对同时存在的上下文个数有硬上限（十几个），攒到上限会静默丢弃最早的那些，
   * 表现是「跑着跑着前面某块画布黑了」。
   */
  const freshSurface = useCallback(async (): Promise<Surface | null> => {
    const element = stageRef.current
    if (element === null) return null
    dropSurface()
    const surface = await getRenderer().createSurface(element, { fast: fastRef.current })
    surfaceRef.current = surface
    return surface
  }, [dropSurface, getRenderer])

  // ---- 主题：换 <html> 上的类，token 由 CSS 翻面（见 index.css）----
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark')
  }, [theme])

  // ---- 状态落盘（防抖：批量渲染时 results 会连变上百次）----
  useEffect(() => {
    const pending = window.setTimeout(() => {
      saveGround({ results, fast, source, view, layout, theme, filter })
    }, 400)
    return () => window.clearTimeout(pending)
  }, [results, fast, source, view, layout, theme, filter])

  // 人工标注很小，直存即可。
  useEffect(() => saveMarks(marks), [marks])

  // ---- 预热：先把 Pyodide 拉起来，别等点了渲染才发现要下十几 MB 的运行时 ----
  useEffect(() => {
    let alive = true
    getRenderer()
      .warmup()
      .then(() => {
        if (!alive) return
        setWarm('ready')
        say(`${T.ready}${T.readyHint}`, 'ok')
      })
      .catch((error: unknown) => {
        if (!alive) return
        setWarm('failed')
        say(`${T.warmupFailed}：${error instanceof Error ? error.message : String(error)}`, 'error')
      })
    return () => { alive = false }
  }, [getRenderer, say])

  // 卸载时把画布收干净：SPA 路由切走不 dispose 就是内存泄漏（核心包门面里写明的契约）。
  useEffect(() => () => {
    surfaceRef.current?.dispose()
    surfaceRef.current = null
  }, [])

  /** 只改档位、不重跑（批量自己马上就会跑，重跑等于白跑一条）。 */
  const applyFast = useCallback((next: boolean): void => {
    // 先写 ref 再 setState：`freshSurface` 读的是 ref，这样**这一轮里**建出来的画布就已经是新档位了，
    // 不必等 React 重渲染（也就没有「批量第一条按新档、后面按旧档」那个坑）。
    fastRef.current = next
    setFastState(next)
    dropSurface()
  }, [dropSurface])

  /** 放掉正在等的那条（完成 / 超时 / 被停止 / 被换掉都走这里），超时器一并清掉。 */
  const settle = useCallback((result: CardResult): void => {
    const resolve = waiter.current
    waiter.current = null
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
    resolve?.(result)
  }, [])

  /** 这一条要跑哪段源码（自由代码时就是它自己带的那一份快照）。 */
  const codeOf = useCallback(
    (job: Job): string => job.kind === 'free'
      ? job.code
      : (corpus.examples.find((item) => item.id === job.id)?.python ?? ''),
    [corpus.examples],
  )

  /**
   * 预检结论的缓存，键是**源码本身**。
   *
   * 为什么值得缓存：`check()` 是把这段代码在干跑桥里真跑一遍，开销与一次真渲染的 Python 部分同级。
   * 而「点一条看一眼」正是这个台子最主要的用法，语料又是打包时就定下来的、不可变——
   * 同一段源码的预检结论永远是同一个。缓存之后第二次点同一条就是「立刻开演」，
   * 而不是又等一遍干跑。键用源码而不是 id：自由代码那边用户一改，键就变了，不会取到旧结论。
   */
  const checkCache = useRef(new Map<string, CheckResult>())

  const checkCode = useCallback(async (code: string): Promise<CheckResult> => {
    const hit = checkCache.current.get(code)
    if (hit !== undefined) return hit
    const fresh = await getRenderer().check(code)
    checkCache.current.set(code, fresh)
    return fresh
  }, [getRenderer])

  /**
   * 真正去跑一条：**先预检 → 再建画布 → 最后跑**。
   *
   * 顺序是有讲究的。原来是「先建画布、再预检」，于是预检没过时台上留着一块**空画布**——
   * 用户看到一块不明所以的黑 + 一行错。DSH 那边「未通过预检」的卡根本不起画布（头 + 说明就完了），
   * 这里照同一个口径：预检没过就把画布收掉，不留残影也不留空白。
   * （收画布而不是留着上一幅：39 条 `reject` 语料要一条条点过去，若每次都留着上一幅成功的画面，
   * 会让人以为「这次也画出来了」。）
   */
  const execute = useCallback(async (code: string, withCheck: boolean): Promise<CardResult> => {
    if (withCheck) {
      const check = await checkCode(code)
      if (!check.ok) {
        dropSurface()
        return { ok: false, text: `${T.checkFailed}：\n${check.error ?? ''}` }
      }
    }
    const target = await freshSurface()
    if (target === null) return { ok: false, text: T.noStage }
    const result = await target.run(code)
    if (result.cancelled === true) return { ok: false, text: T.cancelled, cancelled: true }
    return result.ok ? { ok: true, text: '' } : { ok: false, text: result.error ?? T.renderFailed }
  }, [checkCode, dropSurface, freshSurface])

  /**
   * 跑一条：发布「画布上这条是谁」→ 起干活 → 返回一个**在完成 / 超时 / 被停止时兑现**的 Promise。
   *
   * ⚠️ 这里是本轮最关键的一处修复，改动之前务必读完这段。
   *
   * 原来分成两个互相等的函数：
   *
   *     await render(job)      // render 返回的 Promise 只由 settle() 兑现
   *     await runJob(job)      // 而正常路径里 settle() 只在 runJob 里被调用
   *
   * 那个 Promise 于是**谁也兑现不了**，只能靠 `TIMEOUT_MS`（60 秒）的超时兜底——
   * 实测每点一条都要干等 63.7 秒才开演（两条语料各测一次：63.7s / 63.5s），
   * 批量更惨：239 条 × 60 秒。用户看到的现象就是「点下去没反应」。
   *
   * 修法是把「等」和「干」**拆开**：
   *   · 干活那条链自己在跑完时兑现 Promise（这才是真的「跑完了」）；
   *   · `waiter` / 超时 / `stop()` 仍然保留，负责让等待方在**被停止或真卡住**时脱身——
   *     批量循环 `await` 的就是它，所以「停止」一按，循环立刻从 `await` 里出来。
   */
  const runJob = useCallback((job: Job, useFast: boolean, withCheck = true): Promise<CardResult> => {
    // 上一条还在等的先放掉（完成 / 超时 / 被停止 / 被换掉都走 settle）
    settle({ ok: false, text: T.stopped })
    const mine = runSeed.current + 1
    runSeed.current = mine
    setShown({ job, run: mine, fast: useFast })
    const guarded = new Promise<CardResult>((resolve) => {
      waiter.current = resolve
      timer.current = window.setTimeout(() => settle({ ok: false, text: T.timeout }), TIMEOUT_MS)
    })
    void (async () => {
      say(useFast ? T.renderingFast : T.rendering, 'running')
      // 极速那趟把画布盖住：极速只是把动画时长压到 0，每个 play 仍然各画一帧，
      // 不盖就会频闪一串中间态（见 types.ts 的 Overlay）。
      setOverlay(useFast ? SKELETON : null)
      const result = await execute(codeOf(job), withCheck)
      // 这一趟已经被顶掉了（又点了一条 / 按了停止 / 清了记录）：一个字都不该报。
      if (runSeed.current !== mine) return
      if (result.cancelled !== true) {
        if (job.kind === 'example') setResults((prev) => ({ ...prev, [job.id]: result }))
        if (result.ok) say(T.renderDone(useFast), 'ok')
        else say(result.text, 'error')
      }
      setOverlay(null)
      settle(result)
    })()
    return guarded
  }, [codeOf, execute, say, settle])

  /**
   * 点一条语料：**选中 + 渲染 + 记录结果**，一条完整的动作序列——与 DSH 实验场同一个口径
   * （「点哪条跑哪条」）。以前这里只切了预览、要再点一次「渲染」才动，是没对齐的那一条。
   */
  const openExample = useCallback((id: string): void => {
    // 批量跑着的时候不插队（那一趟由脚本控节奏）。此时**高亮也不改**：高亮的意思是
    // 「屏幕上这条」，改了就成了「清单说在看 A、画布在演 B」。
    if (running) return
    setSelected(id)
    void runJob({ kind: 'example', id }, fastRef.current)
  }, [runJob, running])

  const renderFree = useCallback((): void => {
    if (running || source.trim().length === 0) return
    void runJob({ kind: 'free', code: source }, fastRef.current)
  }, [runJob, running, source])

  /**
   * 用户点极速开关：改档位 + **把手上这条按新档位重跑一遍**（契约 ②）。
   * 不重跑的话开关点了像没反应——画布上还是旧档位画出来的那一幅。
   */
  const setFast = useCallback((next: boolean): void => {
    applyFast(next)
    // 批量自己马上会按新档位跑，不重跑（重跑等于白跑一条）
    if (running || shown === null) return
    void runJob(shown.job, next)
  }, [applyFast, runJob, running, shown])

  /**
   * 按顺序跑一批语料。**批量一律走极速**——批量要的是「哪几条不对」，不是看动画过程；
   * 两百多条按 run_time 真等要几分钟。批量也**不走预检**（契约 ③）。
   */
  const runBatch = useCallback(async (items: readonly ManimExample[]): Promise<void> => {
    if (running || items.length === 0) return
    const mine = token.current + 1
    token.current = mine
    setRunning(true)
    setBatch({ done: 0, total: items.length })
    // 批量要极速：先把档位切过去。`applyFast` 直接改的是 ref，所以紧接着建出来的画布
    // 就已经是极速档了，不需要等 React 重渲染，也没有「第一条按新档、后面按旧档」这个坑。
    if (!fastRef.current) applyFast(true)
    for (const [index, example] of items.entries()) {
      if (token.current !== mine) return
      setBatch({ done: index + 1, total: items.length })
      // 每一条都 await 到「跑完 / 超时 / 被停止」为止，循环不会吊死也不会抢跑。
      await runJob({ kind: 'example', id: example.id }, true, false)
    }
    if (token.current !== mine) return
    setRunning(false)
    setBatch(null)
  }, [applyFast, runJob, running])

  const stop = useCallback((): void => {
    token.current += 1
    // 顶掉在跑的那一趟：它醒过来会看见编号不等，于是不记结果、不播报（契约 ⑥）
    runSeed.current += 1
    setRunning(false)
    setBatch(null)
    setOverlay(null)
    settle({ ok: false, text: T.stopped })
    say(T.stopped)
  }, [say, settle])

  // ---- 会话与时间轴（核心包的另两个「活形态」；与 run 共用同一块 #stage）----
  // 都走 freshSurface()：一块新画布一个形态，符合契约 ①（不复用画布会叠画面）。

  const endSession = useCallback((): void => {
    sessionRef.current?.dispose()
    sessionRef.current = null
    setSessionInfo(null)
  }, [])

  const dropPlayback = useCallback((): void => {
    playbackRef.current?.dispose()
    playbackRef.current = null
    setPlaybackInfo(null)
  }, [])

  const newSession = useCallback(async (): Promise<void> => {
    if (running || warm !== 'ready') return
    dropPlayback()
    const surface = await freshSurface()
    if (surface === null) return
    try {
      sessionRef.current = await surface.createSession()
      setSessionInfo({ count: 0, source: '' })
      say(T.sessionReady, 'ok')
    } catch (error) {
      say(`${T.sessionOpenFail}：${error instanceof Error ? error.message : String(error)}`, 'error')
    }
  }, [dropPlayback, freshSurface, running, say, warm])

  const sessionCheck = useCallback(async (code: string): Promise<SessionVerdict | null> => {
    const session = sessionRef.current
    if (session === null) {
      say(T.sessionNone, 'error')
      return null
    }
    say(T.sessionChecking, 'running')
    const verdict = await session.check(code)
    say(verdict.ok ? T.sessionCheckOk : `${T.sessionCheckFail}：${verdict.error ?? ''}`, verdict.ok ? 'ok' : 'error')
    return verdict
  }, [say])

  const sessionAppend = useCallback(async (code: string): Promise<SessionAppend | null> => {
    const session = sessionRef.current
    if (session === null) {
      say(T.sessionNone, 'error')
      return null
    }
    if (code.trim().length === 0) return null
    say(T.sessionAppending, 'running')
    const verdict = await session.append(code)
    if (verdict.ok) {
      setSessionInfo({ count: session.count, source: session.source() })
      say(T.sessionAppended(session.count), 'ok')
    } else if (!verdict.cancelled) {
      say(`${T.sessionAppendFail}：${verdict.error ?? ''}`, 'error')
    }
    return verdict
  }, [say])

  const buildTimeline = useCallback(async (code: string): Promise<void> => {
    if (running || warm !== 'ready' || code.trim().length === 0) return
    endSession()
    dropPlayback()
    const surface = await freshSurface()
    if (surface === null) return
    say(T.timelineBuilding, 'running')
    try {
      playbackRef.current = await surface.createPlayback(code)
      setPlaybackInfo({ duration: playbackRef.current.duration(), segments: [...playbackRef.current.segments()] })
      say(T.timelineBuilt(playbackRef.current.duration()), 'ok')
    } catch (error) {
      // catch 必报原始 error（仓规）：栈比消息值钱得多。
      console.error('[playground] 时间轴收集失败:', error)
      say(`${T.timelineBuildFail}：${error instanceof Error ? error.message : String(error)}`, 'error')
    }
  }, [dropPlayback, endSession, freshSurface, running, say, warm])

  /**
   * 换分节先把手上的东西全收掉：会话/时间轴不跟着人走；**画布与状态行也一并清**——
   * 上一节的画面、尤其上一节的红字错误，绝不该出现在下一节里（真机反馈过这一点）。
   */
  const switchView = useCallback((next: GroundView): void => {
    if (next === view) return
    if (running) stop()
    endSession()
    dropPlayback()
    dropSurface()
    setExportLog([])
    setShown(null)
    say(T.switchedSection)
    setView(next)
  }, [dropPlayback, dropSurface, endSession, running, say, setShown, stop, view])

  /** 「画布」分节：surface.replay()（作废画布、新建一块、同一段代码从头真播）。 */
  const replayCurrent = useCallback(async (): Promise<void> => {
    const target = surfaceRef.current
    if (target === null || shown === null) {
      say(T.replayNone, 'error')
      return
    }
    say(T.replayRunning, 'running')
    try {
      await target.replay()
      say(T.replayDone, 'ok')
    } catch (error) {
      say(`${T.replayFailed}：${error instanceof Error ? error.message : String(error)}`, 'error')
    }
  }, [say, shown])

  /** 「画布」分节：surface 的读数（isRendered / canvas 尺寸）。 */
  const surfaceInfo = useCallback((): { rendered: boolean; size: string | null } => {
    const target = surfaceRef.current
    const canvas = target?.canvas() ?? null
    return {
      rendered: target?.isRendered() ?? false,
      size: canvas === null ? null : `${canvas.width}×${canvas.height}`,
    }
  }, [])

  /** 取消进行中的那次导出（AbortSignal）：录屏停表，回一句「已取消」。 */
  const cancelExport = useCallback((): void => {
    if (exportAbort.current === null) return
    exportAbort.current.abort()
    say(T.exportCancelled)
  }, [say])

  /** 「钩子」「导出」等分节用：把一段代码当一次渲染跑（走与自由代码同一条路，onLoading 遮罩照常）。 */
  const runSnippet = useCallback((code: string): void => {
    if (running || code.trim().length === 0) return
    void runJob({ kind: 'free', code }, fastRef.current)
  }, [runJob, running])

  /** 「渲染器」分节用：重新预热（warmup()）。 */
  const warmupNow = useCallback((): void => {
    setWarm('loading')
    say(T.warmup, 'running')
    getRenderer()
      .warmup()
      .then(() => {
        setWarm('ready')
        say(`${T.ready}${T.readyHint}`, 'ok')
      })
      .catch((error: unknown) => {
        setWarm('failed')
        say(`${T.warmupFailed}：${error instanceof Error ? error.message : String(error)}`, 'error')
      })
  }, [getRenderer, say])

  const clearRecord = useCallback((): void => {
    if (running) return
    clearGround()
    runSeed.current += 1
    setResults({})
    setSource(FREE_SAMPLE)
    settle({ ok: false, text: T.stopped })
    setShown(null)
    setNote(null)
    setOverlay(null)
    dropSurface()
    say(warm === 'ready' ? `${T.ready}${T.readyHint}` : T.warmup, warm === 'ready' ? 'ok' : 'running')
  }, [dropSurface, running, say, settle, warm])

  /** 标 / 清当前这条的人工标注（null = 清）。 */
  const setMark = useCallback((id: string, mark: ManualMark | null): void => {
    setMarks((prev) => {
      const next = { ...prev }
      if (mark === null) delete next[id]
      else next[id] = mark
      return next
    })
  }, [])

  const clearAllMarks = useCallback((): void => {
    clearMarks()
    setMarks({})
  }, [])

  /**
   * 导出（录屏）。走核心自带的 `browserRecorder`。
   *
   * **两步走，顺序不能反**（这也是契约 ④ 的推论）：
   *   ① 先建一块**全新的空白画布**。录屏在开录前就 `captureStream()` 抓住当前 canvas，
   *      而「从头真播」如果靠 `Surface.replay()` 实现，它会重建场景、连带换掉 canvas——
   *      录制流于是留在了一块被丢弃的旧画布上，录出来是 **0 字节**的空文件，且全程不报错。
   *      所以要在录制开始前就把新画布准备好，让录制期间的 canvas 元素保持不变。
   *   ② controller.replay 就在这块画布上跑一遍同一段代码（`run` 不会换画布）。
   *
   * **极速档下不给导**：录的是实时过程，极速没有过程可录（会得到一个几乎空的文件）。
   * 与其让用户下一次空文件再回来问，不如按钮灰着并说清原因。
   */
  const exportCurrent = useCallback(async (): Promise<void> => {
    const job = shown?.job ?? null
    // 屏幕上还没有东西可录。**不回退去导自由代码那份**——在语料视图里那么做，
    // 会录出一段跟眼前这块画布毫无关系的东西，比直接说「先渲染一次」更糟。
    if (job === null) {
      say(T.exportNoSurface, 'error')
      return
    }
    const code = codeOf(job)
    if (code.trim().length === 0) {
      say(T.exportNoSurface, 'error')
      return
    }
    const recorder = getRenderer().exporters[0]
    if (recorder === undefined) {
      say(T.exportNoSurface, 'error')
      return
    }
    say(T.exportProbing, 'running')
    setExportLog([])
    const probe = await recorder.probe()
    if (!probe.ready) {
      say(T.exportMissing(probe.missing?.map((item) => item.label).join('、') ?? ''), 'error')
      return
    }
    const target = await freshSurface()
    if (target === null) {
      say(T.noStage, 'error')
      return
    }
    const controller: RenderController = {
      canvas: () => target.canvas(),
      isRendered: () => target.isRendered(),
      // 在这块**已经新建好的空画布**上跑一遍 = 从头真播。不用 surface.replay()（见函数头 ①）。
      replay: async () => { await target.run(code) },
    }
    // 取消把手：ExportRequest 的第二个参数就是 AbortSignal（「导出」分节里那个取消按钮）。
    const abort = new AbortController()
    exportAbort.current = abort
    const result = await recorder.run(
      {
        python: code,
        controller,
        onProgress: (text) => {
          setExportLog((prev) => [...prev, text])
          say(text, 'running')
        },
      },
      abort.signal,
    ).finally(() => { exportAbort.current = null })
    if (!result.ok) {
      say(T.exportFailed(result.error ?? result.reason ?? ''), 'error')
      return
    }
    if (result.kind !== 'blob') {
      say(T.exportNotBlob, 'error')
      return
    }
    const url = URL.createObjectURL(result.blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = result.name
    anchor.click()
    URL.revokeObjectURL(url)
    say(T.exportDone(result.name, result.mime), 'ok')
  }, [codeOf, freshSurface, getRenderer, say, shown])

  /** 起手选一条（配置文件里那条最简单的）——预览面板立刻有东西可讲。 */
  useEffect(() => {
    if (selected !== null || corpus.examples.length === 0) return
    const wanted = corpus.examples.find((item) => item.id === DEFAULT_EXAMPLE_ID)
    setSelected(wanted?.id ?? corpus.examples[0]!.id)
  }, [corpus.examples, selected])

  /**
   * 把「认不出来的 id」从结果与人工标注里剔掉。
   *
   * 为什么要有这一步：两者都是**落盘**的，而语料是随源码变的——删掉一条、改个文件名，
   * 盘上那份记录就挂着一个再也点不到的 id。不清的话它会一直跟着每次 `saveGround` 存来存去，
   * 报告里也会多出对不上的条目。
   */
  useEffect(() => {
    // 语料**没读到**的时候不许清：那样「认不出来的 id」是全部，落盘的结果会被一扫而空。
    // 只读到 0 条正是这种情形（目录不在 / 构建产物里没带语料），此时该保着记录等下次。
    if (corpus.examples.length === 0) return
    const known = new Set(corpus.examples.map((item) => item.id))
    setResults((prev) => {
      const kept = Object.entries(prev).filter(([id]) => known.has(id))
      return kept.length === Object.keys(prev).length ? prev : Object.fromEntries(kept)
    })
    setMarks((prev) => {
      const kept = Object.entries(prev).filter(([id]) => known.has(id))
      return kept.length === Object.keys(prev).length ? prev : Object.fromEntries(kept)
    })
  }, [corpus.examples])

  // 卸载时把取包计时的尾巴收掉（它可能还挂着一次 setOverlay）。
  useEffect(() => () => {
    if (packagesTimer.current !== null) window.clearTimeout(packagesTimer.current)
  }, [])

  return {
    // 数据
    corpus, examples: corpus.examples, groups: corpus.groups,
    loadError: loaded.error, shots: loaded.shots,
    // 视图状态
    view, setView: switchView, layout, setLayout, theme, setTheme, filter, setFilter, query, setQuery,
    collapsed, setCollapsed,
    // 渲染状态
    results, fast, setFast, shown, selected, running, batch, status, overlay, warm, note, setNote,
    marks, setMark, clearAllMarks,
    brokenShots, setBrokenShots,
    // 动作
    stageRef, openExample, renderFree, runBatch, stop, clearRecord, exportCurrent,
    source, setSource,
    // 会话与时间轴
    sessionCode, setSessionCode, sessionInfo, sessionRef,
    newSession, sessionCheck, sessionAppend, endSession,
    playbackInfo, playbackRef, buildTimeline, dropPlayback,
    // 渲染器 / 钩子 / 导出分节
    getRenderer, warmupNow, runSnippet,
    exportLog, cancelExport,
    // 画布分节：重播与 surface 读数
    replayCurrent, surfaceInfo,
  }
}

/** 这一页的全部状态与动作。组件只收这一个对象，省得二十个 props 一路透传。 */
export type Playground = ReturnType<typeof usePlayground>
