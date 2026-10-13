// 画布（Surface）：一块固定 1280×720 的 manim 画布 + 串行执行队列。
// 对外三个动作——run(code) 跑一段、replay() 从头真播一遍、dispose() 拆掉；
// 多次 run 按提交顺序串行（画布是单写入方）。
//
// 代码路径：Manim Python → Pyodide 里的真 CPython → manim 适配层 → 桥 → 这块真场景。
// 每次 run 用一块新桥（句柄表重新计数），句柄不跨次串味。
//
// 跨**画布**的串行由 runtime 的全局队列保证（一个页面只有一份解释器，见 py/runtime.ts 的 queue）——
// 这里那条 tail 只管同一块画布上的先后。
import { PyRunCancelled, PyRuntimeError, runPython } from '../py/runtime.ts'
import { createManimWebBridge, type ManimNamespace } from '../py/manim-bridge.ts'
import { createSceneSlot } from './canvas.ts'
import { loadManim } from './library.ts'
import { collectPlayback, type Playback } from './playback.ts'
import { createPySession, type Session } from './session.ts'

const WIDTH = 1280
const HEIGHT = 720

export interface RunResult {
  ok: boolean
  error?: string
  /** 该段运行已作废（画布在执行到它之前已被销毁）：不是错误，调用方不应显示任何内容。 */
  cancelled?: boolean
}

export interface RunHandlers {
  /** 按 import 取包时的进展：开始时给包名，取完给空数组（见 runtime 的 RunOptions.onLoading）。 */
  onLoading?: (names: string[]) => void
  /**
   * 执行上下文（**尚未实现**，此处只保留签名占位，传入会抛错）。
   *
   * 既定语义：同一 context 内**变量跨次保留**（第 N 次能看到第 1 次建的 `circle`，且禁止重画）；
   * **新 context = 从零开始**（冷挂载与纠错重演依赖它）。当前三层都是刻意隔离的：Python 命名空间
   * 每次新建、每次 run 用新桥、updater 包装表清空——因此实现它是一次行为反转，不能与其他改动混做。
   */
  context?: string
}

export interface Surface {
  /** 执行一段 Manim Python（内部交给 Pyodide 执行并驱动画布）。 */
  run(code: string, handlers?: RunHandlers): Promise<RunResult>
  /**
   * 时间轴回放（实验场形态）：整段代码收集成一条可任意定位的时间轴，不实时播。
   * 返回的控制器支持 seek（帧级）/ play / pause / step，见 engine/playback.ts。
   * 同时至多一个「活形态」——开回放会先收掉活会话与旧回放；随 `dispose()` 级联销毁。
   */
  createPlayback(python: string, handlers?: RunHandlers): Promise<Playback>
  /**
   * 场景会话（黑板步进）：持久命名空间 + 段提交协议（见 engine/session.ts）。
   * 同时至多一个活会话——开新的会先收旧的；随 `dispose()` 级联销毁。
   */
  createSession(): Promise<Session>
  /**
   * 作废当前画布 → 创建一块新画布 → 把上一段代码从头完整播放一遍。resolve 表示这一遍播放完毕。
   *
   * ⚠️ **它会更换 canvas 元素**（新场景带新 canvas）。导出那条路不再依赖「画布元素不变」了
   * （逐帧导出直接从场景取画布，见 `RenderController.collect`），但**会留下副作用**：
   * 收集模式真的把代码跑了一遍，屏幕上的画面会停在收集完的样子。
   */
  replay(): Promise<void>
  /**
   * 收集模式跑一遍源码并把**场景**交出去（导出接入者用，见 export/types.ts 的 RenderController.collect）。
   *
   * 与 `createPlayback` 同一条路，只差回报的东西：那个给回放控制器，这个给场景。
   * 副作用同 `replay()`——代码会真的跑一遍（动画不实时播），画面会停在收集完的样子。
   */
  collect(python: string): Promise<unknown | null>
  /** 当前画布元素；尚未创建时为 null。 */
  canvas(): HTMLCanvasElement | null
  /** 画布上是否已有内容。 */
  isRendered(): boolean
  /** 销毁这块画布；之后的 run 全部作废（cancelled），不会执行。 */
  dispose(): void
}

export interface SurfaceOptions {
  /** 极速：不等时间，直接落终态（playground 的「全部渲染」用，见 manim-bridge 的 fast）。 */
  fast?: boolean
  /**
   * 按 import 取包时的进展回调（开始取时给包名，取完给空数组）。
   *
   * 给**没走工厂**的使用者用（自己 `createSurface` 那种）；走 `createManimRenderer` 的
   * 直接把回调写在工厂选项里就行，会一路传下来。`run()` 的 `handlers.onLoading` 优先于此。
   */
  onLoading?: (names: string[]) => void
}

/** 在给定容器里造一块画布。契约：容器由调用方给、由调用方管生命周期。 */
export async function createSurface(container: HTMLDivElement, options: SurfaceOptions = {}): Promise<Surface> {
  const manim = await loadManim()

  // 场景槽：2D 起手，真跑到 3D 场景时换一块真 3D 画布。**「换」的动作只有一处实现**
  // （engine/canvas.ts 的 createSceneSlot）——工具侧的截图自查台用的是同一份。
  const slot = createSceneSlot(container, manim, WIDTH, HEIGHT)
  let tail: Promise<unknown> = Promise.resolve()
  let disposed = false
  let lastCode: string | null = null
  let lastHandlers: RunHandlers = {}
  let rendered = false
  let endSession: (() => void) | null = null
  let endPlayback: (() => void) | null = null

  /** 跑一段（在 tail 排队内调用）。 */
  const execute = async (code: string, handlers: RunHandlers): Promise<void> => {
    const bridge = createManimWebBridge({
      manim: manim as unknown as ManimNamespace,
      scene: slot.scene(),
      sceneFor: slot.sceneFor,
      fast: options.fast === true,
    })
    await runPython(code, bridge, {
      output: (text) => console.info('[manim-live] print:', text.trimEnd()),
      // 本次 run 自己给的回调优先，其次退化到建画布时给的那一份（工厂选项一路传下来的）。
      onLoading: handlers.onLoading ?? options.onLoading,
      // 排队期间（全页一次只跑一段）这块画布可能已经拆了：轮到这段时再问一次，
      // 作废就整段丢，不占着队首白跑一遍代码。
      active: () => !disposed,
    })
  }

  /**
   * 收集模式跑一遍（在 tail 排队内调用）：整段代码的动画都排进时间轴，返回回放控制器。
   * `createPlayback` 与 `collect` 共用——两者只差「回报什么」。
   */
  const collectPlaybackRun = async (python: string, handlers: RunHandlers): Promise<Playback> => {
    // 「至多一个活形态」：新回放收掉旧会话与旧回放。
    endSession?.()
    endSession = null
    endPlayback?.()
    endPlayback = null
    const { collector, finish } = collectPlayback(manim as unknown as ManimNamespace, slot.scene())
    const bridge = createManimWebBridge({
      manim: manim as unknown as ManimNamespace,
      scene: slot.scene(),
      sceneFor: slot.sceneFor,
      collect: collector,
    })
    await runPython(python, bridge, {
      output: (text) => console.info('[manim-live] print:', text.trimEnd()),
      onLoading: handlers.onLoading ?? options.onLoading,
      active: () => !disposed,
    })
    const playback = finish()
    endPlayback = () => playback.dispose()
    // 记下这段，replay() 依旧可从头真播一遍（走实时路径）。
    lastCode = python
    lastHandlers = handlers
    rendered = true
    return playback
  }

  return {
    run(code: string, handlers: RunHandlers = {}): Promise<RunResult> {
      const job = tail.then(async () => {
        if (handlers.context !== undefined) {
          throw new Error(
            'manim-live：执行上下文（run 的 context 参数）尚未实现——' +
              '现在每次 run 都是独立执行，变量不跨次保留。',
          )
        }
        // 销毁之后全部作废（不是「失败」）：cancelled 不向用户显示、也不作为错误上报——
        // 调用方自己销毁的画布无法执行，不算渲染失败。
        if (disposed) throw new PyRunCancelled()
        // 一块画布一次只有一个「活形态」：跑新代码就收掉旧回放（时间轴）。
        endPlayback?.()
        endPlayback = null
        await execute(code, handlers)
        lastCode = code
        lastHandlers = handlers
        rendered = true
      })
      tail = job.catch(() => {}) // 前一段失败不阻断后面排队的分段
      return job.then(
        () => ({ ok: true }),
        (error: unknown) => {
          if (error instanceof PyRunCancelled) return { ok: false, cancelled: true }
          console.error('[manim-live] run failed:', error)
          const message = error instanceof PyRuntimeError ? error.message : String(error)
          return { ok: false, error: message }
        },
      )
    },

    async createPlayback(python: string, handlers: RunHandlers = {}): Promise<Playback> {
      const job = tail.then(async () => {
        if (disposed) throw new PyRunCancelled()
        return collectPlaybackRun(python, handlers)
      })
      tail = job.catch(() => {})
      return job
    },

    /**
     * 收集模式跑一遍并把**场景**交出去（导出接入者用；见 export/types.ts 的 RenderController.collect）。
     *
     * 与 createPlayback 走同一条路，只是把回报的东西换成场景——上游的逐帧导出器要的正是
     * 「带着时间轴的场景」：它自己 seek 到每一帧再出图，比实时录屏可复现。
     * 收集模式下不换场景种类之外不动画布；若源码是 3D 场景，slot 换过之后返回的是**新的**那一块，
     * 导出器拿到的也就是当前真正在显示的场景。
     */
    async collect(python: string): Promise<unknown | null> {
      const job = tail.then(async () => {
        if (disposed) return null
        await collectPlaybackRun(python, {})
        return slot.scene() as unknown
      })
      tail = job.catch(() => {})
      return job
    },

    async createSession(): Promise<Session> {
      if (disposed) throw new Error('manim-live：画布已销毁，不能再开会话')
      // 同一块画布同时至多一个活会话（回放同理，先收掉）。
      endPlayback?.()
      endPlayback = null
      // 开新的先收旧的（旧句柄表随之作废）。
      endSession?.()
      const session = await createPySession({
        manim: manim as unknown as ManimNamespace,
        scene: slot.scene(),
        sceneFor: slot.sceneFor,
        fast: options.fast === true,
        // 会话的画布工作排进本 Surface 的串行尾：与 run / replay 同一条队，单写入方不破。
        enqueueOnSurface: (job) => {
          const next = tail.then(job, job)
          tail = next.then(() => undefined, () => undefined)
          return next
        },
      })
      endSession = () => session.dispose()
      return session
    },

    async replay(): Promise<void> {
      const code = lastCode
      if (code === null) throw new Error('manim-live：还没跑过任何代码，没得重播')
      const job = tail.then(async () => {
        if (disposed) throw new PyRunCancelled()
        // 作废当前场景并建一块新的（**同一场景种类**）：这条就是「从头真播」——不复用旧场景，
        // 免得上一次留下的物体、追踪器、相机姿态串到这一遍里。
        endPlayback?.()
        endPlayback = null
        slot.reset()
        rendered = false
        await execute(code, lastHandlers)
        rendered = true
      })
      tail = job.catch(() => {})
      await job
    },

    canvas(): HTMLCanvasElement | null {
      const element = container.querySelector('canvas')
      return element instanceof HTMLCanvasElement ? element : null
    },

    isRendered(): boolean {
      return rendered
    },

    dispose(): void {
      disposed = true
      // 回放先收（停表 + 摘时间轴），会话次之（名字空间与排队中的段随之作废），最后才是画布。
      endPlayback?.()
      endPlayback = null
      endSession?.()
      endSession = null
      // slot.dispose() 里就是 scene.dispose()：释放 mobject、WebGL 上下文与 resize 观察者，
      // 并从容器摘掉 canvas。
      slot.dispose()
    },
  }
}
