# API 参考：导出

导出有两条互不依赖的路：

- **浏览器录制**（本页前半）：接入者模式，核心只定契约、实现可以有多个，接入者列表在 [`renderer.exporters`](/api/renderer) 上，自带的录屏始终排在最前。它需要一只**活着的画布**。
- **本机 CLI 导出**（本页末尾）：真跑用户机器上的 manim 命令、出 mp4 文件。它不需要活画布（只吃源码），因此不走接入者接口，自成一对工厂：Node 侧 `createLocalExport`、浏览器侧 `createExportClient`。

## Exporter（类型）

一个导出接入者的形状。自己实现一个接入者就是实现这个接口。

```ts
interface Exporter {
  id: string                                    // 稳定标识，如 'browser-recorder'
  label: string                                 // 给用户看的名字
  probe(): Promise<{ ready: boolean; missing?: Array<{ id: string; label: string }> }>
  run(request: ExportRequest, signal?: AbortSignal): Promise<ExportResult>
}
```

**字段**

- `id`：稳定标识，用来在 `renderer.exporters` 里挑实现。
- `label`：界面文案。
- `probe()`：此刻能不能用，见下节。
- `run(request, signal)`：执行一次导出，见下下节。

## exporter.probe()

询问这个接入者此刻能不能用，不产生副作用。

```ts
probe(): Promise<{ ready: boolean; missing?: Array<{ id: string; label: string }> }>
```

**返回** `ready` 为 `true` 表示可用；为 `false` 时 `missing` 列出缺的能力，每项有 `id` 与 `label`（如 `MediaRecorder`、可用的视频编码、`canvas.captureStream`）。

**例子**

```ts
const probe = await recorder.probe()
if (!probe.ready) {
  showMissing((probe.missing ?? []).map((item) => item.label))
  return
}
```

## exporter.run(request, signal?)

执行一次导出。

```ts
run(request: ExportRequest, signal?: AbortSignal): Promise<ExportResult>

interface ExportRequest {
  python: string                 // 源码：本机 CLI 类实现用它
  controller: RenderController   // 渲染控制权：浏览器录屏用它
  onProgress?: (note: string) => void
}

interface RenderController {
  canvas(): HTMLCanvasElement | null
  isRendered(): boolean
  replay(): Promise<void>        // 必须保证 canvas 元素不变
}

type ExportResult =
  | { ok: true; kind: 'blob'; blob: Blob; name: string; mime: string }   // 浏览器录屏
  | { ok: true; kind: 'file'; path: string }                            // 本机 CLI
  | { ok: false; reason: 'environment' | 'error'; error?: string }
```

**参数**

- `request.python`：源码。录屏类实现不用它，本机 CLI 类实现只用它。
- `request.controller`：渲染控制权。录屏类实现只用它，三个方法见上面的类型定义。
- `request.onProgress`：阶段播报，见[钩子](/api/hooks)。
- `signal`：取消，见[钩子](/api/hooks)。

**返回** `ExportResult`，按实现分叉：`kind: 'blob'` 是浏览器里可直接下载的字节（带文件名与 mime）；`kind: 'file'` 是磁盘路径；失败时 `reason` 区分「环境不具备」与「执行出错」，`error` 给原因。

**例子**

```ts
// 录屏要一块新建的画布，并在它上面从头播一遍
const fresh = await renderer.createSurface(exportContainer)
const result = await recorder.run(
  {
    python,
    controller: {
      canvas: () => fresh.canvas(),
      isRendered: () => fresh.isRendered(),
      replay: async () => {
        await fresh.run(python)
      },
    },
    onProgress: (note) => setStatus(note),
  },
  abortController.signal,
)

if (result.ok && result.kind === 'blob') {
  download(result.blob, result.name)   // 扩展名从 result.mime 推，不要写死 .mp4
} else if (!result.ok) {
  showError(result.error)
}
fresh.dispose()
```

**注意**

- `RenderController.replay()` 有一个硬性要求：**执行期间 canvas 元素本身不能改变**，因为录屏在调用它之前就已对 `controller.canvas()` 返回的那一块执行了 `captureStream()`。[`surface.replay()`](/api/surface) 恰恰会更换元素，因此不能直接充当控制器——应先创建一块新画布，再让控制器的 `replay` 在这块画布上执行一遍源码。违反该要求的失败是静默的：得到 0 字节文件，过程中不抛出任何错误。

## browserRecorder（内置接入者）

核心自带的第一个接入者，`id: 'browser-recorder'`，用 `canvas.captureStream()` 加 `MediaRecorder` 实时录屏，一件外部依赖都不需要。

三条边界：

1. 只做实时录制。60 秒的动画就录 60 秒，不能快进——manim-web 的动画由 rAF 时间驱动，没有公开的离线逐帧 API。
2. 格式取决于浏览器。多数出 `webm`，Safari 可能出 `mp4`；结果里带 `mime`，扩展名由它推。
3. 没有音轨。

## createLocalExport(options)（Node 侧）

把一段 Manim Python 交给本机 CLI 渲染成 mp4 文件。走的是[本机环境探测](/api/machine)那道门：必要条件（python3 / manim / manimModule / ffmpeg）没备齐就直接回「缺什么」，不放行到渲染。

```ts
function createLocalExport(options?: LocalExportOptions): LocalExport

interface LocalExportOptions {
  outputDir?: string        // 成片去向；默认 ~/Downloads（不存在会建）
  probe?: ProbeFn           // 就绪门用的探测函数；默认真机探测
  resolve?: (tool: string) => string | null   // 在 PATH 里找可执行文件；默认真机寻址
  readinessTtlMs?: number   // 就绪结论缓存时长；默认 30 秒
}

interface LocalExport {
  exportReadiness(options?: { maxAgeMs?: number }): Promise<ExportReadiness>
  invalidateReadiness(): void
  exportVideo(options?: { python?: string; quality?: string; timeoutMs?: number; workRoot?: string }): Promise<LocalExportResult>
  revealExportedFile(target: string, options?: { run?: CommandRunner; checkOnly?: boolean }): Promise<RevealResult>
  outputDir(): string
}
```

**参数**（`createLocalExport` 的选项）

| 字段 | 类型 | 默认 | 作用 | 不传的后果 |
| --- | --- | --- | --- | --- |
| `outputDir` | `string` | `~/Downloads` | 成片落盘目录（也就绪校验的边界） | 写进用户「下载」文件夹 |
| `probe` | `(id) => Promise<EnvResult \| null>` | 真机探测 | 就绪门问「装了没有」的入口 | 真跑命令探测（首次可能几秒） |
| `resolve` | `(tool) => string \| null` | 真机寻址 | 找 manim 命令 | 在补好的 PATH 里找 |
| `readinessTtlMs` | `number` | `30000` | 就绪结论缓存 | 每次问都重新探测 |

**`exportVideo` 的选项**：`python`（源码，完整文件或裸 construct 体都收）、`quality`（`l`/`m`/`h`/`p`/`k`，默认 `h`）、`timeoutMs`（默认 10 分钟）、`workRoot`（暂存根，默认系统临时目录）。

**返回**

```ts
type LocalExportResult =
  | { ok: true; file: string; quality: string }
  | { ok: false; reason: 'input' | 'environment' | 'render'; error?: string; missing?: ExportMissing[] }

interface ExportReadiness { ready: boolean; missing: ExportMissing[] }   // missing: { id, detail }[]
interface RevealResult { ok: boolean; code: '' | 'missing' | 'outside' | 'failed'; error: string }
```

`ready:false` 的 `missing` 直接可用于提示（按钮置灰 + 悬停说明缺什么）。LaTeX / dvisvgm **不在必要条件里**：只有公式写法才用得到，普通动画没有它们照样出片；想提示「导公式还需装 LaTeX」可以从 `exportReadiness` 的完整结论里读。

**例子**

```ts
import { createLocalExport } from 'manim-live/node'

const local = createLocalExport()   // 默认：~/Downloads、真机探测

const result = await local.exportVideo({ python, quality: 'h' })
if (result.ok) {
  console.log('导出到', result.file)
} else if (result.reason === 'environment') {
  console.log('本机缺：', result.missing?.map((item) => item.detail).join('、'))
} else {
  console.log('渲染失败：', result.error)
}
```

**注意**

- `exportVideo` 的临时工作目录用完就删；成片是**拷贝**出来的，碎片（manim 的 `partial_movie_files`）绝不拿来充数。
- `revealExportedFile` 只认 `outputDir` 边界内的文件（会代替用户去操作系统，路径又是从界面来的，越界一律拒绝）；`checkOnly: true` 只回答「还在不在」，一条系统命令都不跑。
- 就绪结论带 TTL 缓存：界面里多张卡各问一遍，不会各跑一遍 `manim --version`。

## createExportClient(options)（浏览器侧）

上一条的取数客户端：浏览器里不跑命令，通过宿主路由问。

```ts
function createExportClient(options: { exportUrl: string }): ExportClient

interface ExportClient {
  loadExportReadiness(): Promise<ExportReadiness>              // GET  exportUrl/ready
  requestExport(python: string): Promise<LocalExportResult>    // POST exportUrl
  revealExport(path: string, options?: { checkOnly?: boolean }): Promise<RevealResult>   // POST exportUrl/reveal
}
```

**参数** `exportUrl`：导出路由地址（调用方自己插件的命名空间）。三条接口的形状就是上面 `LocalExportResult` / `ExportReadiness` / `RevealResult`——Host 与浏览器共用同一份类型。

**返回** `ExportClient`。`requestExport` 的 HTTP 层失败抛错、业务失败走 `ok:false`；`loadExportReadiness` 与 `revealExport` 读不通时都往保守一侧倒（就绪 = 不可用、定位 = 失败），宁可按钮灰着、宁可说打不开，也不放行一个说不清的动作。

**例子**

```ts
import { createExportClient } from 'manim-live'

const client = createExportClient({ exportUrl: '/dsh-plugins/example/export' })

const readiness = await client.loadExportReadiness()
if (readiness.ready) {
  const result = await client.requestExport(python)
  if (result.ok) await client.revealExport(result.file)
}
```

**注意**

- `parseReadiness` / `parseReveal` 两个解析函数也导出：响应是不可信输入（版本对不上、中间层塞了错误页），逐字段校验、坏条目丢弃。
