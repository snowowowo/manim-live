// 导出能力的**接口**（顶层设计 §6.4）：核心只定形状，实现是两个接入者——
//   · 核心自带的 `browserRecorder`（浏览器录屏，见 ./browser-recorder.ts）
//   · 使用者提供的 `localManim`（本机 manim CLI 渲 mp4，DSH 插件那份）
//
// 为什么不是「传源码 → 出文件路径」：浏览器录屏**拿不到源码**，它需要那只**活着的画布**，
// 而且必须在动画开始前就拿到。所以接口必须把「渲染控制权」一起递出去——这就是 RenderController 存在的唯一理由。

/** 核心递给接入者的能力：活的画布 + 从头真播一次的控制权。 */
export interface RenderController {
  /** 当前画布元素；还没建出来时给 null。 */
  canvas(): HTMLCanvasElement | null
  /** 画布上已经有画面了吗（录屏要非空才值得录）。 */
  isRendered(): boolean
  /**
   * 从头真播一遍。resolve 时表示这一遍真的播完了（录屏据此停表）。
   *
   * ⚠️ **实现必须保证 canvas 元素本身不变**。理由：录屏在调它**之前**就
   * `captureStream()` 抓住了 `canvas()` 返回的那一块，之后换画布等于把录制流留在了一块
   * 被丢弃的旧画布上——录出来是 0 字节的空文件，而过程中不报任何错（实测踩过）。
   *
   * 于是 `Surface.replay()` **不能**直接拿来当这个控制器（它会重建场景、连带换掉 canvas）。
   * 正确姿势两步：
   *   ① 先建一块**新的**画布（已经新建好了，所以接下来那遍就是「从头」）；
   *   ② controller.replay = 在这块画布上再跑一遍同一段代码（`surface.run(python)`）。
   * 参考实现见包内 playground 的 `exportCurrent`。
   */
  replay(): Promise<void>
}

export interface ExportRequest {
  /** 源码。本机 CLI 实现只用这个。 */
  python: string
  /** 渲染控制。浏览器录屏实现只用这个。 */
  controller: RenderController
  /** 进展播报（「正在录 3.2s」「正在调 manim CLI」…），供 UI 显示。 */
  onProgress?: (note: string) => void
}

/**
 * 返回值**按实现分叉**：让「磁盘路径」这个纯本机概念进不了核心。
 * 卡片侧只认 `kind`：`blob` → 直接 `<a download>`；`file` → 显示路径（在访达中定位是 DSH 实现自己的事，不进接口）。
 */
export type ExportResult =
  | { ok: true; kind: 'blob'; blob: Blob; name: string; mime: string }
  | { ok: true; kind: 'file'; path: string }
  | { ok: false; reason: 'environment' | 'error'; error?: string }

/** 一个导出接入者长什么样。 */
export interface Exporter {
  id: string
  label: string
  /** 这个实现**此刻**能不能用：录屏要看 MediaRecorder，本机 CLI 要探 ffmpeg / manim。 */
  probe(): Promise<{ ready: boolean; missing?: Array<{ id: string; label: string }> }>
  run(request: ExportRequest, signal?: AbortSignal): Promise<ExportResult>
}
