// 核心自带的导出接入者：**逐帧导出**，实现直接用 manim-web 自己的导出器。
//
// 2026-10-13 升级到 manim-web 0.36 时替换掉原来那份「实时录屏」（旧文件 browser-recorder.ts 已删）：
// 上游这一版补齐了逐帧导出，正是旧实现注释里那句「manim-web 没有公开的离线逐帧 API」的反面——
// 它给的就是离线逐帧：
//   · `chooseVideoExporterStrategy()` 挑路：WebCodecs（`VideoEncoder`，确定性、可指定 avc/hevc/vp9/av1）
//     优先，退到 MediaRecorder；
//   · `createWebCodecsExporter(scene).export()` / `createVideoExporter(scene).exportTimeline()`
//     都对着**时间轴**逐帧 seek 出图，不再靠实时采样画布流。
//
// 于是本文件只做三件事：① 拿场景（`controller.collect(python)`）；② 把选项和进度接上；
// ③ 把 Blob 包成本包的 ExportResult。挑路、编码、逐帧、音频混合全在上游。
//
// 边界（照实写，免得期待落空）：
//   1. **只出画面与场景音轨**：Manim 本身没有音频，场景里挂了 AudioManager 才有音轨。
//   2. **格式看浏览器**：WebCodecs 能给 mp4/webm（按编解码器），MediaRecorder 那条多数出 webm；
//      结果里带 `mime`，扩展名由调用方从它推——不许写死 .mp4。
//   3. 浏览器太老（没有 WebCodecs 也没有 MediaRecorder）时 probe() 直接判不可用，导出按钮置灰。
import { withAvcLevelAdapted } from './avc-level.ts'
import type { Exporter, ExportRequest, ExportResult } from './types.ts'

/** 上游导出器的松形状（只声明本文件真正用到的成员，免得把 manim-web 的类型带进核心的公开面）。 */
interface UpstreamVideoExporter {
  export(): Promise<Blob>
}

interface UpstreamTimelineExporter {
  exportTimeline(duration?: number): Promise<Blob>
}

/** 上游入口的最小形状。按名字从 manim-web 取——本包只在这一处依赖它，换版本时一眼看得见。 */
interface ManimExportModule {
  chooseVideoExporterStrategy?: (supported?: boolean) => 'webcodecs' | 'mediarecorder'
  createWebCodecsExporter?: (
    scene: unknown,
    options?: Record<string, unknown>,
  ) => UpstreamVideoExporter
  createVideoExporter?: (
    scene: unknown,
    options?: Record<string, unknown>,
  ) => UpstreamTimelineExporter
}

/**
 * 默认档位：1080p · 60fps。
 *
 * 60 是「和屏幕一致」的那档：教学动画里点沿曲线走、文字上浮这类运动在 30fps 下有明显台阶
 * （成片比屏幕上更显眼，因为观众会全屏盯着看）。但 60fps 的帧数是 30 的两倍，而逐帧导出
 * 的耗时基本正比于帧数——所以这个值必须是**可以被调用方改小的**，由 `ExportRequest.video`
 * 决定（见 types.ts 的 VideoSettings）。默认值只表达「不给档位时按最好的来」。
 */
const DEFAULT_FPS = 60
/** 默认目标高度（像素）：1080p。 */
const DEFAULT_HEIGHT = 1080

/** 档位取值收到合理区间：太低不叫导出，太高只会让人等更久（且 AVC 等级要一路往上抬）。 */
function fpsOf(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_FPS
  return Math.min(60, Math.max(15, Math.round(value)))
}

function heightOf(value?: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return DEFAULT_HEIGHT
  return Math.min(2160, Math.max(360, Math.round(value)))
}

/**
 * 码率按「每秒每像素多少比特」算，而不是写死一个数：分辨率或帧率一变，固定码率就会不够。
 * 0.12 bpp 对线条/文字为主的 Manim 动画偏高一点——细线和字形最怕压，宁可文件大也别糊。
 */
const BITS_PER_PIXEL_PER_FRAME = 0.12

export function bitrateFor(width: number, height: number, fps: number = DEFAULT_FPS): number {
  if (width <= 0 || height <= 0) return 8_000_000
  const raw = width * height * fps * BITS_PER_PIXEL_PER_FRAME
  // 上限 32Mbps：再高对教学动画没有可见收益，只让文件难分享。
  return Math.round(Math.min(Math.max(raw, 6_000_000), 32_000_000))
}

/** 上游的 `mime`：WebCodecs 那条给 mp4，MediaRecorder 那条给 webm——由实际编码结果定，不猜。 */
function extensionOf(blob: Blob): { mime: string; name: string } {
  const mime = blob.type !== '' ? blob.type : 'video/webm'
  const subtype = mime.split(';')[0]?.trim().split('/')[1] ?? ''
  return { mime, name: `manim.${subtype === '' ? 'webm' : subtype}` }
}

/** 取模块（动态 import，浏览器里才可能失败；失败按环境不可用报，不抛给调用方）。 */
async function loadExportModule(): Promise<ManimExportModule | null> {
  try {
    return (await import('manim-web')) as unknown as ManimExportModule
  } catch (error) {
    console.error('[manim-live] 载入 manim-web 导出器失败:', error)
    return null
  }
}

/** WebCodecs 是否可用（上游就是拿它当分路依据，这里保持一致）。 */
function hasWebCodecs(): boolean {
  return typeof globalThis !== 'undefined' && 'VideoEncoder' in globalThis
}

/** 档位到像素框：按 16:9 由目标高度反推宽度（720 → 1280×720，1080 → 1920×1080）。 */
function boxOf(height: number): { width: number; height: number } {
  return { width: Math.round((height * 16) / 9), height }
}

/** 场景在导出时真正要用的那几个成员（只声明用到的，不把 manim-web 类型带进公开面）。 */
interface ResizableScene {
  getWidth?: () => number
  getHeight?: () => number
  resize?: (width: number, height: number) => unknown
  seek?: (time: number) => unknown
  getTimelineDuration?: () => number | null
}

/**
 * 导出用的画布尺寸规划：把画布**设备像素**对齐到档位要的像素，并给出还原函数。
 *
 * 这里有三件事必须一起看，少一件就会算错：
 *
 * 1. **编码器认的是场景尺寸，不是画布尺寸**。上游 `createWebCodecsExporter` 的 `width/height`
 *    默认取 `scene.getWidth()`——那是 CSS 像素；帧却是 `new VideoFrame(canvas)`，那是设备像素
 *    （CSS × pixelRatio）。所以 dpr=2 的屏幕上，一个「720p」档若不折算，会先按 2560×1440
 *    渲染再让编码器缩到 1280×720：输出的确是 720p，代价却是四倍。折算之后渲染像素 = 成片像素，
 *    档位标多少就是多少（headless Chrome、dpr=2、同一段 2s 场景实测：1080p60 从 5.5s 降到 1.5s，
 *    720p30 从 2.7s 降到 0.6s，成片尺寸与帧率一字不差）。
 * 2. **尺寸不是「只放大不缩小」**。档位是承诺，画布本来多大都得对上它：小窗里的卡（640×360）
 *    要放大，全屏的卡（超过 1080p）要收回来。收的是这一小段导出窗口，导完还原，用户看不见。
 * 3. **必须等比**。缩放系数按「画布像素 / 档位像素框」取最小值，宽高比不动；16:9 的卡配 16:9
 *    的框时就是精确命中。
 *
 * 还原时尺寸变化会清空画布，所以顺手 seek 到时间轴末尾，把卡片留在导出前的终态。
 */
export interface ExportCanvas {
  /** 画布应有的设备像素（0 = 没算出来，交给调用方看实际画布）。 */
  width: number
  height: number
  restore: () => void
}

/** 成片像素取偶数：H.264 的编码尺寸按宏块对齐，奇数只会让编码器自己补齐。 */
function even(value: number): number {
  return Math.max(2, Math.round(value / 2) * 2)
}

const NOOP_RESTORE = (): void => {}

export function fitCanvasForExport(
  scene: ResizableScene,
  targetHeight: number = DEFAULT_HEIGHT,
  pixelRatio: number = 1,
): ExportCanvas {
  const { getWidth, getHeight, resize } = scene
  if (typeof getWidth !== 'function' || typeof getHeight !== 'function' || typeof resize !== 'function') {
    return { width: 0, height: 0, restore: NOOP_RESTORE }
  }
  const cssWidth = getWidth.call(scene)
  const cssHeight = getHeight.call(scene)
  if (!(cssWidth > 0) || !(cssHeight > 0)) return { width: 0, height: 0, restore: NOOP_RESTORE }

  // 比率只用来把「设备像素」换算回 `resize()` 收的 CSS 像素；不可信的值一律当 1。
  const ratio = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1
  const box = boxOf(heightOf(targetHeight))
  const scale = Math.min(box.width / (cssWidth * ratio), box.height / (cssHeight * ratio))
  const width = even(cssWidth * ratio * scale)
  const height = even(cssHeight * ratio * scale)

  // 已经正好是这个像素：不 resize（省一次重排，也不会无故清画布）。
  if (width === even(cssWidth * ratio) && height === even(cssHeight * ratio)) {
    return { width, height, restore: NOOP_RESTORE }
  }

  try {
    resize.call(scene, width / ratio, height / ratio)
  } catch (error) {
    // 改尺寸失败不是导出失败：按原尺寸出片，糊一点总比没有好。
    console.error('[manim-live] 调整导出画布失败，按原尺寸导出:', error)
    return { width: 0, height: 0, restore: NOOP_RESTORE }
  }

  return {
    width,
    height,
    restore: () => {
      try {
        resize.call(scene, cssWidth, cssHeight)
        const duration = scene.getTimelineDuration?.() ?? null
        if (typeof scene.seek === 'function' && typeof duration === 'number' && duration > 0) scene.seek(duration)
      } catch (error) {
        console.error('[manim-live] 还原画布尺寸失败:', error)
      }
    },
  }
}

/**
 * 画布当前的「设备像素 / CSS 像素」比率。**实测**而不是读 `devicePixelRatio`：
 * 上游在 resize 时才重算 pixelRatio（并把上限夹到 2），真值只有画布自己知道。
 */
function canvasRatio(canvas: { width: number } | null, scene: unknown): number {
  const cssWidth = (scene as ResizableScene).getWidth?.()
  if (canvas === null || typeof cssWidth !== 'number' || !(cssWidth > 0)) return 1
  const ratio = canvas.width / cssWidth
  return Number.isFinite(ratio) && ratio > 0 ? ratio : 1
}

export const browserVideo: Exporter = {
  id: 'browser-video',
  label: 'Web 逐帧导出',

  async probe() {
    const missing: Array<{ id: string; label: string }> = []
    if (!hasWebCodecs() && typeof MediaRecorder === 'undefined') {
      missing.push({ id: 'video-encoder', label: 'WebCodecs 或 MediaRecorder' })
    }
    return { ready: missing.length === 0, ...(missing.length === 0 ? {} : { missing }) }
  },

  async run(
    { python, controller, onProgress, video }: ExportRequest,
    signal?: AbortSignal,
  ): Promise<ExportResult> {
    if (signal?.aborted) return { ok: false, reason: 'error', error: '已取消' }

    onProgress?.('正在把动画排进时间轴…')
    let scene: unknown = null
    try {
      scene = await controller.collect(python)
    } catch (error) {
      return {
        ok: false,
        reason: 'error',
        error: error instanceof Error ? error.message : String(error),
      }
    }
    if (scene === null) return { ok: false, reason: 'error', error: '已取消' }
    if (signal?.aborted) return { ok: false, reason: 'error', error: '已取消' }

    const module = await loadExportModule()
    if (module === null) return { ok: false, reason: 'environment', error: 'manim-web 的导出器载入失败' }

    // 先把画布像素对齐到档位，再取尺寸：码率与「导出的像素数」挂钩，按 720p 算码率去编 1080p 会糊；
    // 反过来按 1080p 算码率去编 720p 则纯属浪费——档位决定像素，像素决定码率。
    const fps = fpsOf(video?.fps)
    const targetHeight = heightOf(video?.height)
    // 比率要按**调整前**的画布测：resize 之后比率可能被上游重算，那时算出来的就不是「这份场景
    // 原先的像素密度」了。
    const ratio = canvasRatio(controller.canvas(), scene)
    const plan = fitCanvasForExport(scene as ResizableScene, targetHeight, ratio)
    const restore = plan.restore
    const canvas = controller.canvas()
    const width = canvas?.width ?? plan.width
    const height = canvas?.height ?? plan.height
    const bitrate = bitrateFor(width, height, fps)
    const spec = width > 0 && height > 0 ? `${width}×${height} · ${fps}fps` : `${fps}fps`

    const options = {
      fps,
      bitrate,
      // 显式交给编码器：不传的话上游按 `scene.getWidth()`（CSS 像素）配编码器，遇到 dpr=2
      // 的画布就变成「大帧喂小配置」，白烧像素。传了才是「渲染像素 = 成片像素」。
      ...(width > 0 && height > 0 ? { width, height } : {}),
      // MediaRecorder 退路看 quality（0–1），WebCodecs 看 bitrate；两个都传，各自取用。
      quality: 0.95,
      onProgress: (progress: number) => onProgress?.(`导出中 ${Math.round(progress * 100)}%（${spec}）`),
    }

    try {
      const strategy = module.chooseVideoExporterStrategy?.(hasWebCodecs()) ?? 'mediarecorder'
      if (strategy === 'webcodecs') {
        const { createWebCodecsExporter } = module
        if (createWebCodecsExporter === undefined) {
          return { ok: false, reason: 'environment', error: '这版 manim-web 没有 WebCodecs 导出器' }
        }
        onProgress?.(`逐帧编码（WebCodecs · ${spec}）…`)
        // 上游把 AVC 等级写死在 Level 3.1（只够 720p30），1080p / 60fps 会在 configure() 当场被
        // 浏览器拒。这层包装只把 codec 串里的等级抬到配得上当前像素与帧率，编码仍走上游（见 avc-level.ts）。
        const blob = await withAvcLevelAdapted(() => createWebCodecsExporter(scene, options).export())
        return finishResult(blob, onProgress)
      }
      if (module.createVideoExporter === undefined) {
        return { ok: false, reason: 'environment', error: '这版 manim-web 没有逐帧导出器' }
      }
      onProgress?.(`逐帧编码（MediaRecorder · ${spec}）…`)
      const blob = await module.createVideoExporter(scene, options).exportTimeline()
      return finishResult(blob, onProgress)
    } catch (error) {
      console.error('[manim-live] 逐帧导出失败:', error)
      return { ok: false, reason: 'error', error: error instanceof Error ? error.message : String(error) }
    } finally {
      // 尺寸一定要还原：留着放大后的画布会让这张卡以后每帧都多烧一倍多的像素。
      restore()
    }
  },
}

function finishResult(blob: Blob, onProgress?: (note: string) => void): ExportResult {
  if (blob.size === 0) return { ok: false, reason: 'error', error: '导出的内容是空的' }
  const { mime, name } = extensionOf(blob)
  onProgress?.(`导出完成 ${(blob.size / 1024).toFixed(0)} KB`)
  return { ok: true, kind: 'blob', blob, name, mime }
}
