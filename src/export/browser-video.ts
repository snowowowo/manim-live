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
 * 逐帧导出的帧率。上游默认也是 60：教学动画里点沿曲线走、文字上浮这类运动在 30fps 下
 * 有明显的台阶（成片比屏幕上更显眼，因为观众会全屏盯着看）。帧率的代价只是文件更大、
 * 编码更久，换掉它没有意义。
 */
const FPS = 60

/**
 * 码率按「每秒每像素多少比特」算，而不是写死一个数：分辨率或帧率一变，固定码率就会不够。
 * 0.12 bpp 对线条/文字为主的 Manim 动画偏高一点——细线和字形最怕压，宁可文件大也别糊。
 */
const BITS_PER_PIXEL_PER_FRAME = 0.12

export function bitrateFor(width: number, height: number): number {
  if (width <= 0 || height <= 0) return 8_000_000
  const raw = width * height * FPS * BITS_PER_PIXEL_PER_FRAME
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

/** 导出目标像素：1080p，与本机渲染的成片同档。 */
const EXPORT_WIDTH = 1920
const EXPORT_HEIGHT = 1080

/** 场景在导出时真正要用的那几个成员（只声明用到的，不把 manim-web 类型带进公开面）。 */
interface ResizableScene {
  getWidth?: () => number
  getHeight?: () => number
  resize?: (width: number, height: number) => unknown
  seek?: (time: number) => unknown
  getTimelineDuration?: () => number | null
}

/**
 * 导出前把场景临时放大到 1080p，返回「还原」函数。
 *
 * 为什么必须动画布：上游导出器虽然收 `width/height`，但那两个值只写进编码器配置，
 * 帧是 `new VideoFrame(canvas)` 直接从画布抓的——画布只有 1280×720 就只能出 720p，
 * 传更大的尺寸反而会让编码器与输入帧对不上。想更清晰，只能真的按更大像素渲染。
 *
 * 等比放大不改构图：上游 `resize()` 改的是渲染器像素与相机宽高比，`frameWidth/frameHeight`
 * （逻辑坐标系）不动；16:9 → 16:9 时宽高比也没变。
 *
 * 还原时尺寸变化会清空画布，所以顺手 seek 到时间轴末尾，把卡片留在导出前的终态。
 */
export function upscaleForExport(scene: ResizableScene): () => void {
  const { getWidth, getHeight, resize } = scene
  if (typeof getWidth !== 'function' || typeof getHeight !== 'function' || typeof resize !== 'function') {
    return () => {}
  }
  const width = getWidth.call(scene)
  const height = getHeight.call(scene)
  if (!(width > 0) || !(height > 0) || width * height >= EXPORT_WIDTH * EXPORT_HEIGHT) return () => {}

  const scale = Math.min(EXPORT_WIDTH / width, EXPORT_HEIGHT / height)
  try {
    resize.call(scene, Math.round(width * scale), Math.round(height * scale))
  } catch (error) {
    // 放大失败不是导出失败：退回原尺寸，成片是 720p 而不是没有。
    console.error('[manim-live] 放大导出画布失败，按原尺寸导出:', error)
    return () => {}
  }

  return () => {
    try {
      resize.call(scene, width, height)
      const duration = scene.getTimelineDuration?.() ?? null
      if (typeof scene.seek === 'function' && typeof duration === 'number' && duration > 0) scene.seek(duration)
    } catch (error) {
      console.error('[manim-live] 还原画布尺寸失败:', error)
    }
  }
}

export const browserVideo: Exporter = {
  id: 'browser-video',
  label: '浏览器逐帧导出',

  async probe() {
    const missing: Array<{ id: string; label: string }> = []
    if (!hasWebCodecs() && typeof MediaRecorder === 'undefined') {
      missing.push({ id: 'video-encoder', label: 'WebCodecs 或 MediaRecorder' })
    }
    return { ready: missing.length === 0, ...(missing.length === 0 ? {} : { missing }) }
  },

  async run({ python, controller, onProgress }: ExportRequest, signal?: AbortSignal): Promise<ExportResult> {
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

    // 先放大到 1080p 再取尺寸：码率与「导出的像素数」挂钩，按 720p 算码率去编 1080p 会糊。
    const restore = upscaleForExport(scene as ResizableScene)
    const canvas = controller.canvas()
    const width = canvas?.width ?? 0
    const height = canvas?.height ?? 0
    const bitrate = bitrateFor(width, height)
    const spec = width > 0 && height > 0 ? `${width}×${height} · ${FPS}fps` : `${FPS}fps`

    const options = {
      fps: FPS,
      bitrate,
      // MediaRecorder 退路看 quality（0–1），WebCodecs 看 bitrate；两个都传，各自取用。
      quality: 0.95,
      onProgress: (progress: number) => onProgress?.(`导出中 ${Math.round(progress * 100)}%（${spec}）`),
    }

    try {
      const strategy = module.chooseVideoExporterStrategy?.(hasWebCodecs()) ?? 'mediarecorder'
      if (strategy === 'webcodecs') {
        if (module.createWebCodecsExporter === undefined) {
          return { ok: false, reason: 'environment', error: '这版 manim-web 没有 WebCodecs 导出器' }
        }
        onProgress?.(`逐帧编码（WebCodecs · ${spec}）…`)
        const blob = await module.createWebCodecsExporter(scene, options).export()
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
      // 尺寸一定要还原：留着 1080p 会让这张卡以后每帧都多烧一倍多的像素。
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
