# API 参考：导出

导出是接入者模式：核心只定契约，实现可以有多个。接入者列表在 [`renderer.exporters`](/api/renderer) 上，自带的浏览器录屏始终排在最前。

## Exporter（类型）

一个导出接入者的形状。自己实现一个接入者（例如本机 manim CLI 渲 mp4）就是实现这个接口。

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
