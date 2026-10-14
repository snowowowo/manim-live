/**
 * Python 运行时：跑在 Pyodide 上（真 CPython 编译成 WASM），numpy 是真的 numpy。
 *
 * 为什么不是 Skulpt：Skulpt 是纯 JS 的 Python 子集解释器，numpy 得我们自己手写——
 * 「撞到才补」的子集永远补不完（np.sin 补了还有 np.linspace，再往后还有 pandas）。
 * Pyodide 直接跑真 CPython，numpy 装上就能用。
 *
 * 随包只带 numpy + sympy（高频、且加起来才 7 MB）；代码里 import 了别的库时按需取：
 * 浏览器侧 Pyodide 只会去取 indexURL 那一个地址（源码里浏览器走 indexURL、且**不回落 CDN**），
 * 所以 Host 就在那条资源路由上把缺的包下载、按 lock 的 sha256 校验、落进用户缓存目录再发过去；
 * Node 侧（干跑预检）走它自己配的 packageCacheDir，同一个目录。
 *
 * 与 Skulpt 最大的不同是**同步模型**：Skulpt 靠 suspension 能在同步函数里等 Promise，
 * CPython 不行。所以 `construct` 会被改写成 `async def`、其中的 play/wait 补上 await
 * （见 manim-shim.ts 的 _AwaitTransform），由 runPythonAsync 的顶层 await 驱动。
 *
 * 本模块不关心 Pyodide 从哪来（Host 读本地目录、Client 走 HTTP 资源路由），
 * 由使用方用 setPyodideLoader 注入。
 */
import type { ManimBridge } from './bridge.ts'
import { extrasModuleSource, MANIM_SHIM_SOURCE } from './manim-shim.ts'

/** Python 执行失败：带行号。Host 预检把它回给模型，卡片把它显示给用户。 */
export class PyRuntimeError extends Error {
  readonly line?: number
  constructor(message: string, line?: number) {
    super(line === undefined ? message : `第 ${line} 行：${message}`)
    this.name = 'PyRuntimeError'
    this.line = line
  }
}

/** Pyodide 实例中本模块用到的部分（不引 pyodide 的类型，两端加载方式不同）。 */
export interface PyodideRuntime {
  runPythonAsync(code: string): Promise<unknown>
  loadPackage(name: string): Promise<unknown>
  /**
   * 按源码里的 import 取包。两端取法不同、但用户代码看不出差别：
   * Client 侧走本机资源路由（宿主在那里按需下载、校验、落进用户缓存目录），
   * Host 侧走它自己配的 packageCacheDir。取不到**不 reject**，只逐个走 errorCallback。
   *
   * 可选：缺席时跳过取包这一步（测试里的替身运行时就不必实现它）。
   */
  loadPackagesFromImports?(
    code: string,
    options?: { messageCallback?: (text: string) => void; errorCallback?: (text: string) => void },
  ): Promise<unknown>
  setStdout(options: { batched: (text: string) => void }): void
  globals: { set(name: string, value: unknown): void }
}

/** 加载并初始化一个 Pyodide 实例（Host 与 Client 各有一套实现）。 */
export type PyodideLoader = () => Promise<PyodideRuntime>

let loader: PyodideLoader | null = null
let runtimePromise: Promise<PyodideRuntime> | null = null

/**
 * 注入 Pyodide 加载器。可在首次执行前调用多次——会丢弃已缓存的实例重新加载。
 */
export function setPyodideLoader(next: PyodideLoader): void {
  loader = next
  runtimePromise = null
}

/**
 * 取包失败后的**补诊断**接缝：拿失败包名，再花几个请求把「为什么」问清楚；问不出更多就返 `null`。
 *
 * 为什么要做成接缝而不是在这儿直接判：只有加载器那头知道 `indexURL` 是谁（见 engine/pyodide.ts）。
 * 为什么非做不可：浏览器侧取 wheel 是**带 SRI 校验的 fetch**，「文件不在」与「网络不通」抛的是
 * **同一句 `Failed to fetch`**——原话直接给用户，等于把人往「是不是网断了」上引。完整实测见
 * engine/pyodide.ts 的 `diagnosePackageNames`。
 */
export type PackageDiagnoser = (names: string[]) => Promise<string | null>

let diagnoser: PackageDiagnoser | null = null

/** 登记诊断器（幂等；传 `null` 撤掉）。 */
export function setPackageDiagnoser(next: PackageDiagnoser | null): void {
  diagnoser = next
}

/**
 * 运行时生命周期的播报接缝：浏览器入口的「环境状态」订这里（Node 侧不设，no-op）。
 * 为什么做成接缝而不是让环境状态模块自己包一层：初始化与重试的时机只在本模块的
 * `getRuntime` 里（失败要把缓存的 Promise 摘掉），外面包只能看到结果、看不到阶段。
 */
export type RuntimePhaseListener = (phase: 'loading' | 'ready' | 'error', error?: string) => void

let runtimePhaseListener: RuntimePhaseListener | null = null

export function setRuntimePhaseListener(next: RuntimePhaseListener | null): void {
  runtimePhaseListener = next
}

/**
 * 取包进展的播报接缝：`fetching` 空数组 = 这一轮取包结束；带 `lastError` = 本轮失败的人话原因。
 * 与 per-call 的 `onLoading` 并存：那个挂在调用上、给单张卡片用；这个挂在模块上、给全页状态用。
 */
export type PackageStatusListener = (fetching: string[], lastError?: string) => void

let packageStatusListener: PackageStatusListener | null = null

export function setPackageStatusListener(next: PackageStatusListener | null): void {
  packageStatusListener = next
}

/** print 的落点；每次 runPython 覆盖，跑完清空。 */
let outputSink: (text: string) => void = () => {}

/**
 * 把桥的六个动作注册成 Python 内置函数（只做一次）。
 * 用 `_mb_` 单下划线前缀：双下划线在 class 体内会被 Python 名字改编，适配层就调不到了。
 *
 * 名字以 `_` 开头，所以**不能**用 `js.xxx` 去取（Pyodide 的 js 模块不暴露下划线名），
 * 走 globals.set 直接落到 __main__ 全局里。
 */
const BRIDGE_BOOTSTRAP = `
import builtins as _builtins
import js as _js
from pyodide.ffi import to_js as _to_js

_CONVERT = _js.Object.fromEntries


def _to_py(value):
    return value.to_py() if hasattr(value, "to_py") else value


def _mb_create(kind, args, kwargs):
    return _to_py(_dsh_bridge.create(kind, _to_js(args, dict_converter=_CONVERT), _to_js(kwargs, dict_converter=_CONVERT)))


def _mb_method(handle, name, args, kwargs):
    return _to_py(_dsh_bridge.method(handle, name, _to_js(args, dict_converter=_CONVERT), _to_js(kwargs, dict_converter=_CONVERT)))


def _mb_getattr(handle, name):
    return _to_py(_dsh_bridge.getAttr(handle, name))


def _mb_add(handle, mobjects):
    _dsh_bridge.add(handle, _to_js(mobjects))


async def _mb_play(handle, animations, kwargs):
    return _to_py(await _dsh_bridge.play(handle, _to_js(animations, dict_converter=_CONVERT), _to_js(kwargs, dict_converter=_CONVERT)))


async def _mb_wait(handle, duration):
    return _to_py(await _dsh_bridge.wait(handle, duration))


async def _mb_flush():
    await _dsh_bridge.flush()


for _name in ("_mb_create", "_mb_method", "_mb_getattr", "_mb_add", "_mb_play", "_mb_wait", "_mb_flush"):
    setattr(_builtins, _name, globals()[_name])
`

/** 把适配层注册成 sys.modules['manim']——用户代码的 from manim import * 才能拿到它。 */
const MANIM_MODULE_SETUP = `
import sys as _sys
import types as _types
_dsh_manim = _types.ModuleType("manim")
exec(compile(_dsh_manim_src, "<manim-shim>", "exec"), _dsh_manim.__dict__)
_sys.modules["manim"] = _dsh_manim
`

/**
 * 扩展车道：把 manim_live_extra 注册成第二个模块（在 manim 之后——它的源码要 `from manim import _shape`）。
 * 源码为空（extras 表被清空 = 车道卸下）时整段跳过：不注册、import 即 ModuleNotFoundError，
 * manim 里也不再有教错存根——引擎回到纯 CE 面，这就是「可拆卸」的落点。
 */
const EXTRAS_MODULE_SETUP = `
import sys as _sys
import types as _types
if _dsh_extras_src:
    _dsh_extras = _types.ModuleType("manim_live_extra")
    exec(compile(_dsh_extras_src, "<manim-live-extra>", "exec"), _dsh_extras.__dict__)
    _sys.modules["manim_live_extra"] = _dsh_extras
`

const RUN_SNIPPET = 'import manim as _dsh_manim\nawait _dsh_manim._run_source(_dsh_src)\n'
const EXEC_SNIPPET = 'import manim as _dsh_manim\n_dsh_manim._exec_source(_dsh_src)\n'

// ---- 会话（黑板步进）驱动片段：操作对象（命名空间 / 段）由适配层的 _session_* 家族按 _dsh_sid 管理 ----
const SESSION_SNIPPETS = {
  begin: 'import manim as _dsh_manim\n_dsh_manim._session_begin(_dsh_sid)\n',
  exec: 'import manim as _dsh_manim\nawait _dsh_manim._session_exec(_dsh_sid, _dsh_src)\n',
  check: 'import manim as _dsh_manim\nawait _dsh_manim._session_check(_dsh_sid, _dsh_src)\n',
  reset: 'import manim as _dsh_manim\n_dsh_manim._session_reset(_dsh_sid)\n',
  end: 'import manim as _dsh_manim\n_dsh_manim._session_end(_dsh_sid)\n',
} as const

export type SessionOp = keyof typeof SESSION_SNIPPETS

async function getRuntime(): Promise<PyodideRuntime> {
  if (!loader) throw new Error('manim-live：未注入 Pyodide 加载器，无法执行 Python')
  runtimePromise ??= (async () => {
    runtimePhaseListener?.('loading')
    try {
      const runtime = await loader!()
      // numpy 必须先装：适配层模块一 import 就要用
      await runtime.loadPackage('numpy')
      runtime.setStdout({ batched: (text) => outputSink(text) })
      runtime.globals.set('_dsh_manim_src', MANIM_SHIM_SOURCE)
      await runtime.runPythonAsync(BRIDGE_BOOTSTRAP)
      await runtime.runPythonAsync(MANIM_MODULE_SETUP)
      runtime.globals.set('_dsh_extras_src', extrasModuleSource())
      await runtime.runPythonAsync(EXTRAS_MODULE_SETUP)
      runtimePhaseListener?.('ready')
      return runtime
    } catch (error) {
      runtimePhaseListener?.('error', error instanceof Error ? error.message : String(error))
      throw error
    }
  })()
  // 初始化失败要允许重试：把失败的 Promise 从缓存里摘掉，否则会一直拿到同一个拒绝
  runtimePromise.catch(() => {
    runtimePromise = null
  })
  return runtimePromise
}

export interface RunOptions {
  /** print 的输出落点（不传则丢弃）。 */
  output?: (text: string) => void
  /** 跑完是否自动找 Scene 子类执行 construct（默认 true）；纯 Python 片段可关掉。 */
  drive?: boolean
  /**
   * 按 import 取包的进展：开始取时回调一次（给包名），取完再回调一次（给空数组）。
   * 是否显示、显示多久由调用方定——随包件与缓存命中都快，不该闪一下提示。
   */
  onLoading?: (names: string[]) => void
  /**
   * 轮到这段代码时再问一次「调用方还在吗」。返回 false 就整段作废、连解释器都不碰——
   * 卡片滚出视口时画布已经拆了，硬跑的结果必然失败，而那条失败是自伤，不是渲染错误。
   */
  active?: () => boolean
}

/**
 * 这段运行在轮到自己时已经作废：调用方拆了画布、或压根没轮上（见下面的队列）。
 *
 * 单独一类而不是普通 Error：调用方要能把它和「用户代码跑错」分开——
 * 前者不向用户显示，后者必须原样上报。
 */
export class PyRunCancelled extends Error {
  constructor() {
    super('运行已作废：轮到它时调用方已经拆了画布')
    this.name = 'PyRunCancelled'
  }
}

/**
 * 页面级的全局运行队列。
 *
 * 一个页面只有一份解释器、一套全局变量（`_dsh_bridge` / `_dsh_src` / 输出落点），
 * 而适配层的 play / wait / create 是**每次调用现取**这些全局的。两段用户代码同时在里面跑，
 * 后进的那段就把前一段的桥顶掉：前一段后半程的动作全打到别人的画布上（两张卡的内容挤在一块、另一块看着像没渲染），
 * 或者打到一张不存在对应句柄的表上，当场报「未知的对象句柄」。这正是「两张卡同屏就乱、报错过一会儿又没了」的根。
 *
 * 所以「一段跑完才准下一段进」是硬约束，不是优化。排队单位是**整段 runPython**——
 * 含按 import 取包与运行时初始化那几段 await：那几段正是让出解释器的地方，漏在队外等于没排。
 */
let queue: Promise<unknown> = Promise.resolve()

/** 排进队列，按提交顺序一段段跑；前一段失败不阻断后面排队的。 */
function enqueue<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.then(job, job)
  queue = next.then(() => undefined, () => undefined)
  return next
}

/**
 * 完整 class 写法：源码里出现类定义，就当用户自己写好了外壳。
 *
 * ⚠️ 原来只认 `class X(Scene)`——`class X(ThreeDScene)` 会被误判成裸 construct 体，
 * 整段被缩进进函数后 `from manim import *` 不在模块层，报
 * `SyntaxError: import * only allowed at module level`（真机事故：Surface / SpecialThreeDScene
 * 两条语料就是这么挂的，报错完全指不到根因）。基类名五花八门（ThreeDScene / MovingCameraScene /
 * 以及 manim-web 没有的 SpecialThreeDScene），按名字白名单列不全，所以判「有没有类定义」。
 */
const SCENE_CLASS = /(^|\n)[ \t]*class\s+\w+\s*\(/

/** 用户代码里是否已经引入 manim。 */
const MANIM_IMPORT = /(^|\n)\s*(from\s+manim\s+import|import\s+manim\b)/

/** 只写 construct 体时套的外壳。行数固定，供行号还原用。 */
const CONSTRUCT_BODY_PREFIX = 'from manim import *\n\n\nclass _ManimScene(Scene):\n    def construct(self):\n'

/**
 * 两种输入形态都收：完整 class 外壳直接用；裸 construct 体套一层外壳。
 * 返回装入源码与行偏移——报错行号要减去偏移，才是用户视角的行号。
 */
function prepareSource(code: string): { source: string; lineOffset: number } {
  if (SCENE_CLASS.test(code)) {
    // 写了 import 就原样用；只写 class 外壳、漏了 import 时补一行，免得「Scene 未定义」的报错误导用户
    if (MANIM_IMPORT.test(code)) return { source: code, lineOffset: 0 }
    return { source: `from manim import *\n${code}`, lineOffset: 1 }
  }
  // def 已在 4 空格，体必须再进一级（8 空格）
  const body = code.split('\n').map((line) => (line.trim() === '' ? line : `        ${line}`)).join('\n')
  const prefixLines = CONSTRUCT_BODY_PREFIX.split('\n').length - 1
  return { source: CONSTRUCT_BODY_PREFIX + body, lineOffset: prefixLines }
}

/**
 * 执行一段 Manim Python。语法/运行错误统一抛 PyRuntimeError（带行号）。
 * 行号对应传入源码的行号。
 *
 * 入口即排队（见 queue）：同一时刻全页只有一段用户代码在解释器里跑。
 */
export async function runPython(code: string, bridge: ManimBridge, options: RunOptions = {}): Promise<void> {
  return enqueue(async () => {
    // 作废判定要在拿到队位之后：作废的活儿必须「到点直接丢」，不能占着队首也不算数。
    if (options.active?.() === false) throw new PyRunCancelled()
    return execute(code, bridge, options)
  })
}

/**
 * 会话操作：begin / exec / check / reset / end——与 runPython 同一条全局队列、同样的
 * 逐次桥注入（`_dsh_bridge`），区别只在驱动片段与会话状态（`_dsh_sid`）的传递。
 */
export async function runSessionOp(
  op: SessionOp,
  sid: string,
  source: string | undefined,
  bridge: ManimBridge,
  options: RunOptions = {},
): Promise<void> {
  return enqueue(async () => {
    if (options.active?.() === false) throw new PyRunCancelled()
    const runtime = await getRuntime()
    // 段里的 import 也要按需取包（会话段与一次性运行走同一条取包路）。
    await loadImports(runtime, source ?? 'pass', options.onLoading)
    outputSink = options.output ?? (() => {})
    runtime.globals.set('_dsh_bridge', bridge)
    runtime.globals.set('_dsh_sid', sid)
    if (source !== undefined) runtime.globals.set('_dsh_src', source)
    try {
      await runtime.runPythonAsync(SESSION_SNIPPETS[op])
    } catch (error) {
      // 段源码的行号与原文一致（_compile_segment 保行号），没有外壳偏移。
      throw toPyRuntimeError(error, 0)
    } finally {
      outputSink = () => {}
    }
  })
}

/**
 * 预热：把解释器与适配层拉起来（Pyodide 本体 + numpy + manim shim）。
 *
 * 为什么要有它：Pyodide 核心约 13 MB、预热还会带上 numpy（约 3 MB）。不预热时，第一次渲染需等待完整下载结束，期间界面无进展。
 * 走同一条队列，所以预热期间提交的代码会排在它后面，不会两段同时初始化。
 * 不跑任何用户代码——只把运行时准备好。
 */
export async function warmupRuntime(): Promise<void> {
  await enqueue(async () => {
    await getRuntime()
  })
}

async function execute(code: string, bridge: ManimBridge, options: RunOptions): Promise<void> {
  const runtime = await getRuntime()
  const drive = options.drive !== false
  const { source, lineOffset } = drive ? prepareSource(code) : { source: code, lineOffset: 0 }
  // 取包要排在接上输出落点之前：Pyodide 的取包过程会往 stdout 打它自己的消息
  // （实测「Didn't find package … locally, attempting to load from …」，
  // 「caching the wheel …」），那不是用户 print 的东西，混进来会污染卡片里回显的输出。
  await loadImports(runtime, source, options.onLoading)
  outputSink = options.output ?? (() => {})
  runtime.globals.set('_dsh_bridge', bridge)
  runtime.globals.set('_dsh_src', source)
  try {
    await runtime.runPythonAsync(drive ? RUN_SNIPPET : EXEC_SNIPPET)
  } catch (error) {
    throw toPyRuntimeError(error, lineOffset)
  } finally {
    outputSink = () => {}
  }
}

/** Pyodide 取包时的进度行（`Loading numpy, sympy`）。 */
const LOADING = /^Loading (.+)$/

/**
 * 按代码里的 import 把包准备好：随包的（numpy / sympy）本地就有，缺的由加载器去取。
 *
 * 取不到时抛一句人话——Pyodide 的失败**不走 reject、只走 errorCallback**（实测），
 * 不接住的话用户只会看到 `ModuleNotFoundError: No module named 'pandas'`，
 * 完全读不出「首次要联网、之后有缓存」这层信息。
 * 连不上的包名从 errorCallback 的标题行里取（`The following error occurred while loading scipy:`）。
 */
async function loadImports(
  runtime: PyodideRuntime,
  source: string,
  onLoading?: (names: string[]) => void,
): Promise<void> {
  if (typeof runtime.loadPackagesFromImports !== 'function') return
  const failures: string[] = []
  let announced = false
  try {
    await runtime.loadPackagesFromImports(source, {
      messageCallback: (text) => {
        const match = LOADING.exec(text.trim())
        if (match === null) return
        announced = true
        const names = match[1].split(',').map((name) => name.trim())
        onLoading?.(names)
        packageStatusListener?.(names)
      },
      errorCallback: (text) => failures.push(text),
    })
  } catch (error) {
    failures.push(error instanceof Error ? error.message : String(error))
  } finally {
    if (announced) {
      onLoading?.([])
      packageStatusListener?.([])
    }
  }
  if (failures.length === 0) return
  const names = failedPackageNames(failures)
  const message = packageFailureMessage(failures, await diagnoseQuietly(names))
  packageStatusListener?.([], message)
  throw new PyRuntimeError(message)
}

/**
 * 诊断是**锦上添花**：它自己出岔子不该把真正的失败盖掉——问不出来就退回默认文案。
 * 这一层的存在感很低，但没有它，「诊断探针自己挂了」会伪装成「取包失败」。
 */
async function diagnoseQuietly(names: string[]): Promise<string | null> {
  if (diagnoser === null || names.length === 0) return null
  try {
    return await diagnoser(names)
  } catch {
    return null
  }
}

/**
 * 失败消息成对出现（实测）：先一行标题 `The following error occurred while loading scipy:`，
 * 再一行原因。包名**只在标题里**，所以从标题里扣。
 */
export function failedPackageNames(failures: string[]): string[] {
  return [
    ...new Set(
      failures
        .map((text) => /while loading (\S+?):/.exec(text)?.[1])
        .filter((name): name is string => name !== undefined),
    ),
  ]
}

/**
 * 问不出诊断时的兜底建议。
 *
 * 这句话是**按「宿主代取」那条路**写的（Host 把 wheel 下载、校验、落进用户缓存目录），
 * 在那儿是真的；在纯静态自托管下**不成立**——那种环境里没有任何东西替你缓存，
 * 缺的文件只会一直缺。所以一旦诊断器给出更准的话（`hint`），这句就被整句换掉。
 */
const DEFAULT_ADVICE =
  '首次用到需要联网取一次，取到后缓存在本机、之后离线也能用；也可以用 numpy 或标准库改写。'

/**
 * 把 Pyodide 的取包失败拼成一句人话。
 *
 * `hint` 是诊断器问出来的真因（见 engine/pyodide.ts）。给了就**整句替掉**兜底建议：
 * 缺文件那档若还留着「取到后缓存在本机、之后离线也能用」，就是在骗人。
 */
export function packageFailureMessage(failures: string[], hint?: string | null): string {
  const names = failedPackageNames(failures)
  const reason = failures
    .filter((text) => !text.startsWith('The following error occurred'))
    .join(' ')
    .replace(/\s+/g, ' ')
    .slice(0, 160)
  const who = names.length > 0 ? `（${names.join('、')}）` : ''
  return `取不到代码里 import 的库${who}：${reason || '原因未知'}。${hint ?? DEFAULT_ADVICE}`
}

/** 用户代码的栈帧长这样：`  File "<manim>", line 12, in construct`。 */
const MANIM_FRAME = /File "<manim>", line (\d+)/g

/** 取最深一层用户栈帧的行号（traceback 里最深的一帧在最后）。 */
function innermostLine(text: string): number | undefined {
  let last: number | undefined
  MANIM_FRAME.lastIndex = 0
  let match = MANIM_FRAME.exec(text)
  while (match !== null) {
    last = Number(match[1])
    match = MANIM_FRAME.exec(text)
  }
  return last
}

/** traceback 的最后一行就是异常摘要（如 `TypeError: ...`）；没有栈时退回原文。 */
function summarize(text: string): string {
  const lines = text.split('\n').filter((line) => line.trim() !== '')
  const last = lines[lines.length - 1]
  return last === undefined ? text.trim() : last.trim()
}

/**
 * 把 Pyodide 抛出的 PythonError 转成带行号的 PyRuntimeError。
 * 注意：PythonError 的 message 是**整段 traceback**，行号要从里面提取，
 * 文案只取最后一行（异常摘要），否则整段栈会回给模型。
 */
export function toPyRuntimeError(error: unknown, lineOffset = 0): PyRuntimeError {
  if (error instanceof PyRuntimeError) return error
  const text = error instanceof Error ? error.message : String(error)
  const raw = innermostLine(text)
  const line = raw !== undefined && raw - lineOffset > 0 ? raw - lineOffset : undefined
  return new PyRuntimeError(summarize(text), line)
}