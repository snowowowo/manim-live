// 核心**自带**的第一个导出接入者：用 canvas.captureStream() + MediaRecorder 实时录屏。
//
// 为什么它进核心：按顶层设计 §6.4.5，这条路**比本机 CLI 更强**——本机 CLI 要求用户先装
// python3 + manim + ffmpeg + latex + dvisvgm 五件；录屏**一件都不用**。等于把「导出」从
// 「只有开发机能用」变成「所有用户都能用」，本机那条路降级成高级选项。
//
// 三条边界（§6.4.4，写死在注释里免得期待落空）：
//   1. **只做实时**：60 秒动画就录 60 秒，不能快进（manim-web 的动画是 rAF 时间驱动，没有公开的离线逐帧 API）。
//   2. **格式看浏览器**：多数出 webm，Safari 能出 mp4 → 所以结果必须带 `mime`，由调用方决定扩展名，**不许写死 .mp4**。
//   3. **无音轨**：Manim 本身也没音频，不算损失。
import type { Exporter, ExportRequest, ExportResult } from './types.ts'

/** 候选编码，按「体积/兼容」优先排序；实际用哪个由 `isTypeSupported` 定。 */
const MIME_CANDIDATES = [
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
  'video/mp4',
]

/** 录屏帧率。30 对教学动画足够，且明显小于多数显示器刷新率。 */
const FPS = 30

/** 停表后多录一小段，把最后几帧收干净（否则终态那一帧常常缺掉）。 */
const TAIL_MS = 220

function pickMime(Recorder: typeof MediaRecorder): string | undefined {
  for (const candidate of MIME_CANDIDATES) {
    try {
      if (Recorder.isTypeSupported(candidate)) return candidate
    } catch {
      // 某些实现 isTypeSupported 会抛——当成不支持这一类，继续试下一个
    }
  }
  return undefined
}

/** 扩展名由 mime 推（`video/webm;codecs=vp9` → `webm`）——不写死 mp4（§6.4.4 第 2 条）。 */
function extensionOf(mime: string): string {
  const base = mime.split(';')[0]?.trim() ?? ''
  const subtype = base.split('/')[1] ?? ''
  return subtype === '' ? 'webm' : subtype
}

export const browserRecorder: Exporter = {
  id: 'browser-recorder',
  label: '浏览器录屏（实时）',

  async probe() {
    const missing: Array<{ id: string; label: string }> = []
    if (typeof MediaRecorder === 'undefined') {
      missing.push({ id: 'mediarecorder', label: 'MediaRecorder' })
    } else if (pickMime(MediaRecorder) === undefined) {
      missing.push({ id: 'webm', label: '可用的视频编码' })
    }
    const capture =
      typeof HTMLCanvasElement !== 'undefined' &&
      typeof HTMLCanvasElement.prototype.captureStream === 'function'
    if (!capture) missing.push({ id: 'capture-stream', label: 'canvas.captureStream' })
    return { ready: missing.length === 0, ...(missing.length === 0 ? {} : { missing }) }
  },

  async run({ python, controller, onProgress }: ExportRequest, signal?: AbortSignal): Promise<ExportResult> {
    void python // 录屏不需要源码——这是接口把 RenderController 一起递出去的全部理由
    if (signal?.aborted) return { ok: false, reason: 'error', error: '已取消' }

    const canvas = controller.canvas()
    if (canvas === null) {
      return { ok: false, reason: 'environment', error: '还没建出画布——先渲染一次再导出' }
    }
    if (typeof MediaRecorder === 'undefined') {
      return { ok: false, reason: 'environment', error: '这个浏览器没有 MediaRecorder' }
    }
    const mime = pickMime(MediaRecorder)
    if (mime === undefined) {
      return { ok: false, reason: 'environment', error: '这个浏览器没有可用的视频编码' }
    }

    const stream = canvas.captureStream(FPS)
    const chunks: Blob[] = []
    const recorder = new MediaRecorder(stream, { mimeType: mime })

    const stopped = new Promise<void>((resolve, reject) => {
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data)
      }
      recorder.onstop = () => resolve()
      recorder.onerror = () => reject(new Error('录屏过程中出错'))
    })

    const onAbort = () => {
      try {
        if (recorder.state !== 'inactive') recorder.stop()
      } catch {
        // 已经停了就算了
      }
    }
    signal?.addEventListener('abort', onAbort, { once: true })

    try {
      onProgress?.('正在从头真播并录制…')
      recorder.start()
      // 从头真播一遍（作废画布 → 重新排队 → 真播）。resolve 即「播完了」。
      await controller.replay()
      // 收尾几帧
      await new Promise((done) => setTimeout(done, TAIL_MS))
      if (recorder.state !== 'inactive') recorder.stop()
      await stopped
      if (signal?.aborted) return { ok: false, reason: 'error', error: '已取消' }

      const blob = new Blob(chunks, { type: mime })
      if (blob.size === 0) return { ok: false, reason: 'error', error: '录到的内容是空的' }
      onProgress?.(`录完 ${(blob.size / 1024).toFixed(0)} KB`)
      return { ok: true, kind: 'blob', blob, name: `manim.${extensionOf(mime)}`, mime }
    } catch (error) {
      return { ok: false, reason: 'error', error: error instanceof Error ? error.message : String(error) }
    } finally {
      signal?.removeEventListener('abort', onAbort)
      // 停掉采集轨，别让画布的流一直挂着（否则 dispose 不掉）
      for (const track of stream.getTracks()) {
        try {
          track.stop()
        } catch {
          // 已经停了
        }
      }
    }
  },
}
