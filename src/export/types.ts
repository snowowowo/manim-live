// 导出能力的**接口**（顶层设计 §6.4）：核心只定形状，实现是两个接入者——
//   · 核心自带的 `browserVideo`（浏览器逐帧导出，见 ./browser-video.ts；直接用上游导出器）
//   · 使用者提供的 `localManim`（本机 manim CLI 渲 mp4，DSH 插件那份）
//
// 为什么不是「传源码 → 出文件路径」：上游的逐帧导出要的是**带着时间轴的场景**（它自己 seek 到每一帧
// 再出图），而场景只在渲染器手里。所以接口必须把「渲染控制权」一起递出去——这就是 RenderController
// 存在的唯一理由。

/** 核心递给接入者的能力：把源码按收集模式跑一遍（动画排进时间轴），交回那块场景。 */
export interface RenderController {
  /** 当前画布元素；还没建出来时给 null。 */
  canvas(): HTMLCanvasElement | null
  /** 画布上已经有画面了吗。 */
  isRendered(): boolean
  /**
   * 收集模式跑一遍源码：play / wait 不实时播、全部排进时间轴，resolve 时返回**带时间轴的场景**
   * （上游 `ExportableScene` 那个形状）——导出器拿它逐帧 seek 出图，比实时录屏可复现。
   *
   * 收集期间若代码声明了 3D 场景，画布会被换成 3D 那一块：返回的是**换过之后**的场景，
   * 也就是当前真正在显示的那一块（导出器从它的 `getCanvas()` 取画面）。
   *
   * 返回 null = 画布已销毁（不算失败，与 run 的 cancelled 同族）。
   */
  collect(python: string): Promise<unknown | null>
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

// ---- 本机 CLI 导出：就绪门 / 结果 / 定位（Host 半边生产、客户端半边解析，两边同一份形状）----
//
// 与上面的 `Exporter` 接口的关系：那条接口是「拿活画布录一段」的抽象；本机 CLI 导出
// **不需要活画布**（它只吃源码），所以不走 Exporter，而是自成一对：Node 端 `createLocalExport`
// （./local.ts，真跑本机 manim）+ 浏览器端 `createExportClient`（./client.ts，走宿主路由）。

/** 缺的一项必要条件。`id` 是探测项标识（界面按它换成可读名），`detail` 是原始说明。 */
export interface ExportMissing {
  id: string
  detail: string
}

/** 就绪结论：`ready` 为 false 时 `missing` 说明缺什么（按钮置灰 + 悬停提示直接用）。 */
export interface ExportReadiness {
  ready: boolean
  missing: ExportMissing[]
}

/**
 * 本机 CLI 导出的结果（= `/export` 那条接口的响应体形状）。
 * `reason` 三档：`input` 源码为空 / `environment` 必要条件没备齐 / `render` manim 跑了但失败。
 */
export type LocalExportResult =
  | { ok: true; file: string; quality: string }
  | { ok: false; reason: 'input' | 'environment' | 'render'; error?: string; missing?: ExportMissing[] }

/** 定位失败的原因（机器可读）：文件不在了 / 越出导出目录 / 命令跑失败。 */
export type RevealCode = '' | 'missing' | 'outside' | 'failed'

export interface RevealResult {
  ok: boolean
  code: RevealCode
  error: string
}
