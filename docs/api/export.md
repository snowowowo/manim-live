# API 参考：导出

导出有两条互不依赖的路：

- **浏览器录制**（本页前半）：接入者模式，核心只定契约、实现可以有多个，接入者列表在 [`renderer.exporters`](/api/renderer) 上，自带的录屏始终排在最前。它需要一只**活着的画布**。
- **本机 CLI 导出**（本页末尾）：真跑用户机器上的 manim 命令、出 mp4 文件。它不需要活画布（只吃源码），因此不走接入者接口，自成一对工厂：Node 侧 `createLocalExport`、浏览器侧 `createExportClient`。

## Exporter（类型）

一个导出接入者的形状。自己实现一个接入者就是实现这个接口。

```ts
interface Exporter {
  id: string                                    // 稳定标识，如 'browser-video'
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
  controller: RenderController   // 渲染控制权：浏览器逐帧导出用它
  video?: VideoSettings          // 画质档位：浏览器逐帧导出用它，别的实现忽略
  onProgress?: (note: string) => void
}

interface VideoSettings {
  height?: number                // 目标高度（像素），宽度按比例算。默认 1080
  fps?: number                   // 帧率。默认 60
}

interface RenderController {
  canvas(): HTMLCanvasElement | null
  isRendered(): boolean
  collect(python: string): Promise<unknown | null>   // 收集模式跑一遍，交回带时间轴的场景
}

type ExportResult =
  | { ok: true; kind: 'blob'; blob: Blob; name: string; mime: string }   // 浏览器逐帧导出
  | { ok: true; kind: 'file'; path: string }                            // 本机 CLI
  | { ok: false; reason: 'environment' | 'error'; error?: string }
```

**参数**

- `request.python`：源码。浏览器类实现把它交给 `controller.collect` 跑一遍；本机 CLI 类实现直接吃它。
- `request.controller`：渲染控制权。浏览器类实现只用它，三个方法见上面的类型定义。
- `request.video`：画质档位，只对浏览器逐帧导出有意义。**这不是装饰**：逐帧导出的耗时基本正比于「帧数 × 每帧像素」，所以 `{ height: 720, fps: 30 }` 大约只有默认档的 1/5。不传 = 1080p · 60fps。本机 CLI 那条用的是 manim 自己的档位（`quality` 参数），不走这个字段。
- `request.onProgress`：阶段播报，见[钩子](/api/hooks)。
- `signal`：取消，见[钩子](/api/hooks)。

**返回** `ExportResult`，按实现分叉：`kind: 'blob'` 是浏览器里可直接下载的字节（带文件名与 mime）；`kind: 'file'` 是磁盘路径；失败时 `reason` 区分「环境不具备」与「执行出错」，`error` 给原因。

**例子**

```ts
// 收集模式会真的跑一遍代码，所以在**新建的空白画布**上做，用户原来看的那块不受影响
const fresh = await renderer.createSurface(exportContainer)
const result = await recorder.run(
  {
    python,
    controller: {
      canvas: () => fresh.canvas(),
      isRendered: () => fresh.isRendered(),
      collect: (src) => fresh.collect(src),
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

- `RenderController.collect()` 会**真的把源码跑一遍**（动画不实时播、排进时间轴）：屏幕上的画面因此会停在「收集完」的样子。所以在新建的空白画布上做这件事——留在旧画布上的用户画面不受影响。若源码声明了 3D 场景，画布会被换成 3D 那一块，交回的是换过之后的场景（也就是当前真正在显示的那块）。

## browserVideo（内置接入者）

核心自带的第一个接入者，`id: 'browser-video'`：把源码按收集模式跑一遍拿到带时间轴的场景，再交给 manim-web 自带的导出器**逐帧**出图（WebCodecs 优先，退到 MediaRecorder 实时采样）。挑路、编码、逐帧 seek、场景音轨混合都由上游做，本包只接选项与进度。

三条边界，外加一条它会替上游兜的：

1. 逐帧、可复现：默认 60fps（与屏幕上的帧率一致；30fps 下点沿曲线走、文字上浮都有肉眼可见的台阶），由 `video.fps` 决定，不受实时掉帧影响。
2. 格式取决于浏览器与编解码器：WebCodecs 那条能给 `mp4` / `webm`（按编解码器），MediaRecorder 那条多数出 `webm`；结果里带 `mime`，扩展名由它推——不要写死 `.mp4`。
3. 音轨只有场景自己挂了音频才有（Manim 本身没有音频）。

导出时它会**把画布的像素数对齐到档位**（默认 1080p，同比例，camera frame 不动），导出后还原。

这一层比看上去麻烦，两个尺寸单位必须一起算：上游的 `width/height` 只写进编码器配置、帧却是 `new VideoFrame(canvas)` 直接从画布抓的；而画布的物理像素是**场景 CSS 尺寸 × pixelRatio**（视网膜屏常见 2 倍）。所以本包做的是：按「画布实际像素 / 档位像素框」算缩放系数，把 CSS 尺寸折回去再 `resize`，然后把折算后的像素数显式交给编码器——渲染像素与成片像素是同一个数。不折算的话，dpr=2 的屏幕上一个「720p」档会先按 2560×1440 渲染再缩到 1280×720，成片对、代价翻四倍（headless Chrome、dpr=2、同一段 2 秒场景实测：1080p60 从 5.5s 降到 1.5s，720p30 从 2.7s 降到 0.6s）。

档位是承诺，所以**既会放大也会收回**：小窗里的卡（640×360）放大到档位，全屏的卡收回到档位。想要更快就选低档：720p 的像素只有 1080p 的 44%，帧率再减半，合起来约五分之一的工作量。

顺带替上游补一档 AVC 等级：上游把 codec 串写死成 `avc1.42001f`（Level 3.1，上限 1280×720），1080p 会在 `configure()` 当场被浏览器拒；本包在导出那一小段窗口内把等级字节按像素与帧率抬到够用（1080p30 → `0x28` = Level 4.0、1080p60 → `0x2a` = Level 4.2——每秒宏块数也是硬上限），退出即还原，编码本身仍是浏览器原生实现（见 `src/export/avc-level.ts`）。

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
