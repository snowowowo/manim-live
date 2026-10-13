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

/** 逐帧导出的帧率。30 对教学动画足够（上游默认 60，产物翻倍）。 */
const FPS = 30

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

    const options = { fps: FPS, onProgress: (progress: number) => onProgress?.(`导出中 ${Math.round(progress * 100)}%`) }

    try {
      const strategy = module.chooseVideoExporterStrategy?.(hasWebCodecs()) ?? 'mediarecorder'
      if (strategy === 'webcodecs') {
        if (module.createWebCodecsExporter === undefined) {
          return { ok: false, reason: 'environment', error: '这版 manim-web 没有 WebCodecs 导出器' }
        }
        onProgress?.('逐帧编码（WebCodecs）…')
        const blob = await module.createWebCodecsExporter(scene, options).export()
        return finishResult(blob, onProgress)
      }
      if (module.createVideoExporter === undefined) {
        return { ok: false, reason: 'environment', error: '这版 manim-web 没有逐帧导出器' }
      }
      onProgress?.('逐帧编码（MediaRecorder）…')
      const blob = await module.createVideoExporter(scene, options).exportTimeline()
      return finishResult(blob, onProgress)
    } catch (error) {
      console.error('[manim-live] 逐帧导出失败:', error)
      return { ok: false, reason: 'error', error: error instanceof Error ? error.message : String(error) }
    }
  },
}

function finishResult(blob: Blob, onProgress?: (note: string) => void): ExportResult {
  if (blob.size === 0) return { ok: false, reason: 'error', error: '导出的内容是空的' }
  const { mime, name } = extensionOf(blob)
  onProgress?.(`导出完成 ${(blob.size / 1024).toFixed(0)} KB`)
  return { ok: true, kind: 'blob', blob, name, mime }
}
