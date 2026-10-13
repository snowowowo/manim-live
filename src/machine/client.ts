/**
 * 本机探测的**客户端半边**：取探测计划、逐项问结果。
 *
 * 为什么「一项一项问」：`manim --version` 要 import 整个 Manim，本机上可能十几秒。
 * 一次问完等于让整页等最慢的那一项；逐项问则是逐行亮起来，快的先看到，
 * 慢的/坏的只影响它自己那一行。
 *
 * 路由地址由调用方注入（那是它自己插件的 `/dsh-plugins/<id>/…` 命名空间）；
 * Host 半边（跑命令、判三态）在 `manim-live/node` 的 machine/probe。
 */
import type { EnvPlan, EnvResult } from './types.ts'

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

/** 探测计划；形状不对回 null（调用方据此报错）。 */
export function parsePlan(payload: unknown): EnvPlan | null {
  if (payload === null || typeof payload !== 'object') return null
  const value = payload as Record<string, unknown>
  if (!Array.isArray(value.checks)) return null
  const checks = value.checks
    .filter((raw): raw is Record<string, unknown> => raw !== null && typeof raw === 'object')
    .map((raw) => ({ id: text(raw.id), tool: text(raw.tool), command: text(raw.command) }))
    .filter((check) => check.id.length > 0)
  if (checks.length === 0) return null
  return {
    platform: text(value.platform),
    arch: text(value.arch),
    node: text(value.node),
    path: text(value.path),
    checks,
  }
}

/** 单项探测结果；形状不对回 null。 */
export function parseResult(payload: unknown): EnvResult | null {
  if (payload === null || typeof payload !== 'object') return null
  const value = payload as Record<string, unknown>
  const status = value.status
  if (status !== 'ok' && status !== 'missing' && status !== 'error') return null
  const id = text(value.id)
  if (id.length === 0) return null
  return {
    id,
    status,
    path: typeof value.path === 'string' ? value.path : null,
    version: text(value.version),
    detail: text(value.detail),
  }
}

/** 本机探测的取数客户端。 */
export interface MachineClient {
  /** 取探测计划（秒回：Host 只列要测什么，不跑命令）。 */
  loadPlan(): Promise<EnvPlan>
  /** 跑一项探测。失败抛错，由调用方把这一行标成出错（别的行不受影响）。 */
  probe(id: string): Promise<EnvResult>
}

export function createMachineClient(options: { environmentUrl: string }): MachineClient {
  const url = options.environmentUrl

  return {
    async loadPlan(): Promise<EnvPlan> {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const plan = parsePlan(await response.json())
      if (plan === null) throw new Error('探测计划形状不对')
      return plan
    },

    async probe(id: string): Promise<EnvResult> {
      const response = await fetch(`${url}/${encodeURIComponent(id)}`)
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const result = parseResult(await response.json())
      if (result === null) throw new Error('探测结果形状不对')
      return result
    },
  }
}
