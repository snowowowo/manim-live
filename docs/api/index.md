# 公开接口

全部从 `manim-live`（浏览器入口）与 `manim-live/node`（无 DOM 入口）出。
本页照构建产物的 `.d.ts` 语义写；源码出处随条目标注。

## createManimRenderer(options?)

核心包**唯一**的对外入口（工厂）：

```ts
function createManimRenderer(options?: ManimRendererOptions): ManimRenderer
```

```ts
interface ManimRendererOptions {
  /** Pyodide 的取数根（本体与按需包共用一个地址）。不给 = 官方 CDN。 */
  pyodideIndexURL?: string
  /** KaTeX 的取数根（katex.min.css 与字体所在目录）。给了就注入一份 <link>；不给就不碰 DOM。 */
  katexBaseURL?: string
  /** 按 import 取包时的进展回调（开始取时给包名，取完给空数组）。 */
  onLoading?: (names: string[]) => void
  /** 额外的导出接入者。核心自带的 browserRecorder 始终在场，排在列表最前。 */
  exporters?: Exporter[]
}
```

```ts
interface ManimRenderer {
  /** 提前把 Pyodide（约 13 MB）拉起来——不预热，用户第一次点渲染会以为卡死。 */
  warmup(): Promise<void>
  /** 干跑预检：语法错 / 未定义名 / 实测缺失的 manim-web 能力，当场回 ok:false。 */
  check(python: string): Promise<CheckResult>
  /** 在给定容器里造一块画布；容器由调用方给、生命周期也由调用方管。 */
  createSurface(container: HTMLElement, options?: SurfaceOptions): Promise<Surface>
  /** 可用的导出接入者（核心自带的录屏 + 使用者传进来的）。 */
  exporters: readonly Exporter[]
  /** 当前生效的 Pyodide 取数根（诊断用）。 */
  pyodideIndexURL(): string
  /** 拆掉本实例造过的所有画布、摘掉注入的样式与脚本标记。 */
  dispose(): void
}

interface CheckResult {
  ok: boolean
  error?: string
}
```

## Surface

一块画布。`run()` 在内部排队串行执行（同页多实例共享一个队列）：

```ts
interface Surface {
  /** 跑一段 Manim Python。 */
  run(code: string, handlers?: RunHandlers): Promise<RunResult>
  /** 作废当前画布 → 建一块新的 → 把上一段代码从头真播一遍。⚠️ 会换掉 canvas 元素。 */
  replay(): Promise<void>
  /** 当前画布元素；还没建出来时给 null。 */
  canvas(): HTMLCanvasElement | null
  /** 画布上已经有画面了吗（录屏要非空才值得录）。 */
  isRendered(): boolean
  /** 拆掉这块画布；之后 run 一律作废（cancelled），不会真的跑。 */
  dispose(): void
}

interface SurfaceOptions {
  /** 极速：不等时间，直接落终态（截图 / 全量渲染用）。 */
  fast?: boolean
  /** 按 import 取包时的进展回调（没走工厂的使用者用这个；run() 的 handlers 优先）。 */
  onLoading?: (names: string[]) => void
}

interface RunResult {
  ok: boolean
  error?: string
  /** 这段运行作废了（画布在轮到它之前就被拆）：不是错误，调用方一个字都不该显示。 */
  cancelled?: boolean
}

interface RunHandlers {
  /** 同 onLoading；本次 run 独享，优先于工厂与 SurfaceOptions 里的。 */
  onLoading?: (names: string[]) => void
  /**
   * 执行上下文。⚠️ **预留签名，尚未实现**：语义已定案（同一 context 变量跨次保留、
   * 新 context 从零），但当前每次 run 都是独立命名空间——见「三条契约」第三条。
   */
  context?: string
}
```

## 导出

导出是**接入者**模式：核心定接口，实现可以插拔。

```ts
interface Exporter {
  id: string
  label: string
  /** 这个实现此刻能不能用：录屏看 MediaRecorder，本机 CLI 要探 ffmpeg / manim。 */
  probe(): Promise<{ ready: boolean; missing?: Array<{ id: string; label: string }> }>
  run(request: ExportRequest, signal?: AbortSignal): Promise<ExportResult>
}

interface ExportRequest {
  /** 源码。本机 CLI 实现只用这个。 */
  python: string
  /** 渲染控制。浏览器录屏实现只用这个（录屏拿不到源码，它要那只活着的画布）。 */
  controller: RenderController
  /** 进展播报，供 UI 显示。 */
  onProgress?: (note: string) => void
}

/** 浏览器录屏要「从头真播一遍」的控制权；replay 期间 canvas 元素必须不变。 */
interface RenderController {
  canvas(): HTMLCanvasElement | null
  isRendered(): boolean
  replay(): Promise<void>
}

type ExportResult =
  | { ok: true; kind: 'blob'; blob: Blob; name: string; mime: string }  // 浏览器录屏（.webm）
  | { ok: true; kind: 'file'; path: string }                            // 本机 CLI（磁盘路径）
  | { ok: false; reason: 'environment' | 'error'; error?: string }
```

核心自带的 `browserRecorder` 也单独导出（`id: 'browser-recorder'`），可与其他接入者一起传进
`createManimRenderer({ exporters })`。为什么录屏要递「渲染控制权」而不是源码，以及
canvas 不能在 replay 中途换掉的原因，见[三条契约](/guide/contracts#复用画布的已知问题)。

## Node 入口（manim-live/node）

```ts
/** 干跑一段 Python：语法 / 未定义名 / 实测缺失的 manim-web 能力，抛 PyRuntimeError。 */
function runPython(python: string, bridge: Bridge): Promise<void>

/** 一份「什么都不画」的桥——代码真被解释执行，只是不产出画面。 */
function createDryRunBridge(): Bridge

function warmupRuntime(): Promise<void>

class PyRuntimeError extends Error
```

## 语料辅助（可选）

如果你要像本仓一样管理一批 Manim 语料（分组、id、截图路径、文件头断言），这些导出与
Node 侧 `collectCorpus()` 共用同一份实现，浏览器与 Node 一个口径：

```ts
function parseCorpus(value: unknown): Corpus          // 不可信输入的边界校验
function buildCorpus(source: CorpusSource): Corpus
const GROUPS: readonly string[]                       // 17 个组名
function exampleId(group: string, file: string): string
function parseExampleHeader(source: string): ExampleHeader   // 文件头的 @expect / @note
function shotPath(group: string, file: string): string
```

## 其余低层导出

给要直接驱动运行时 / 自接管画布的使用者（上游的截图与 API 探针脚本就是这么用构建产物的）：
`runPython`、`setPyodideLoader`、`warmupRuntime`、`createManimWebBridge`、
`createRecordingBridge`、`createDryRunBridge`、`planMethod / planAnimate / planCreate`、
`resolveSceneKind / SCENE_FAMILY`、`canonicalPackageName`、`loadManim`、
`createScene / createSceneSlot`、`injectKatexStyles`、`DEFAULT_PYODIDE_INDEX_URL`、
`PY_API_MAP`。各自的确切语义以 `.d.ts` 与源码注释为准。
