/**
 * 本机 CLI 导出的**客户端半边**：就绪结论（按钮亮不亮）、真导出（点了按钮之后）、
 * 在文件浏览器里定位导出的文件。
 *
 * 为什么就绪结论单独一条 GET：界面里可能同时挂着几张卡 / 几个面板，每个都要知道
 * 「能不能导出」，但答案同一时刻只有一个——Host 侧带 TTL 缓存（见 ./local.ts），
 * 这里只管按需取。
 *
 * 形状校验在这里，因为这条响应**不可信**：版本对不上（包与宿主半边更新不同步）、
 * 中间层塞了错误页，任何一段都可能变样。读不通的都往**保守那一侧**倒（就绪 = 不可用、
 * 定位 = 失败），宁可按钮灰着、宁可说打不开，也不放行一个说不清的动作。
 *
 * 路由地址由调用方注入（那是它自己插件的 `/dsh-plugins/<id>/…` 命名空间）；
 * Host 半边（真跑 manim CLI）在 `manim-live/node` 的 createLocalExport。
 */
import type { ExportMissing, ExportReadiness, LocalExportResult, RevealCode, RevealResult } from './types.ts'

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function parseMissing(value: unknown): ExportMissing[] {
  if (!Array.isArray(value)) return []
  return value
    .filter((raw): raw is Record<string, unknown> => raw !== null && typeof raw === 'object')
    .map((raw) => ({ id: text(raw.id), detail: text(raw.detail) }))
    .filter((item) => item.id.length > 0)
}

/** 就绪结论；形状不对回 null（调用方据此把按钮按「未知」处理——置灰 + 出错提示）。 */
export function parseReadiness(payload: unknown): ExportReadiness | null {
  if (payload === null || typeof payload !== 'object') return null
  const value = payload as Record<string, unknown>
  if (typeof value.ready !== 'boolean') return null
  return { ready: value.ready, missing: parseMissing(value.missing) }
}

/** 定位结果；形状不对按「命令跑失败」处理（宁可说失败，也不谎称文件还在）。 */
export function parseReveal(payload: unknown): RevealResult {
  if (payload === null || typeof payload !== 'object') return { ok: false, code: 'failed', error: '' }
  const value = payload as Record<string, unknown>
  const ok = value.ok === true
  const raw = value.code
  const code: RevealCode = raw === 'missing' || raw === 'outside' || raw === 'failed' ? raw : ''
  return {
    ok,
    // 失败却没带认得的原因时归到 failed：页面文案才有确定落点，不必去猜空原因该说哪句
    code: !ok && code === '' ? 'failed' : code,
    error: text(value.error),
  }
}

/** 本机导出的取数客户端。 */
export interface ExportClient {
  /** 拿就绪结论（Host 侧有缓存，很快；首次会真跑一遍探测，可能几秒）。 */
  loadExportReadiness(): Promise<ExportReadiness>
  /** 真导出：把源码交给本机 manim 渲染成 mp4，回文件路径。HTTP 层失败抛错，业务失败走 `ok:false`。 */
  requestExport(python: string): Promise<LocalExportResult>
  /**
   * 在系统的文件浏览器里定位导出的文件（macOS 是 Finder 里选中它）。
   * Host 只认导出目录里的文件，越界会回 `ok:false` 与原因——那不是错误，是拒绝。
   * `checkOnly` 只问「还在不在」，不打开：恢复上次导出记录时用它核对，免得拿一条早已失效的路径当真。
   */
  revealExport(path: string, options?: { checkOnly?: boolean }): Promise<RevealResult>
}

export function createExportClient(options: { exportUrl: string }): ExportClient {
  const url = options.exportUrl

  return {
    async loadExportReadiness(): Promise<ExportReadiness> {
      const response = await fetch(`${url}/ready`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const readiness = parseReadiness(await response.json())
      if (readiness === null) throw new Error('就绪结论形状不对')
      return readiness
    },

    async requestExport(python: string): Promise<LocalExportResult> {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ python }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const value = (await response.json()) as Record<string, unknown>
      if (value.ok === true && typeof value.file === 'string') {
        return { ok: true, file: value.file, quality: text(value.quality) || 'h' }
      }
      if (value.ok === false) {
        const reason = value.reason
        const valid = reason === 'input' || reason === 'environment' || reason === 'render'
        return {
          ok: false,
          reason: valid ? reason : 'render',
          error: text(value.error),
          missing: parseMissing(value.missing),
        }
      }
      throw new Error('导出结果形状不对')
    },

    async revealExport(path: string, callOptions: { checkOnly?: boolean } = {}): Promise<RevealResult> {
      const response = await fetch(`${url}/reveal`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ path, checkOnly: callOptions.checkOnly === true }),
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      return parseReveal(await response.json())
    },
  }
}
