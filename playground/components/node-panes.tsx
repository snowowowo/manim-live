/**
 * Node 侧三节（本机探测 / 包管理 / Node 入口）：经 vite 开发中间件（`/__pg/…`）真跑核心包的
 * Node 入口——见 playground/dev-api.ts 的文件头（为什么可以、与 DSH 插件那条路由什么关系）。
 *
 * 三节都是「取数 → 显示」的小组件：状态是各节自己的，不占 use-playground（那一位管的是画布）。
 */
import { useState } from 'react'
import { T } from '@/lib/i18n.ts'
import { Badge } from '@/ui/badge.tsx'
import { Button } from '@/ui/button.tsx'
import { CodeEditor } from './code-editor.tsx'

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error))

async function postJson(url: string, body: unknown): Promise<unknown> {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

async function getJson(url: string): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`HTTP ${response.status}`)
  return response.json()
}

/** 分节外壳：只有一条状态行 + 内容（标题、提示、「对应文档」都在节头，见 section-header.tsx）。 */
function SectionShell({ note, children }: { note: string | null; children: React.ReactNode }) {
  return (
    <section className="mx-auto flex w-full max-w-[860px] flex-col gap-3">
      {note !== null && (
        <p className="rounded-md border border-border bg-card px-3 py-2 font-mono text-[11px] text-muted-foreground">{note}</p>
      )}
      {children}
    </section>
  )
}

interface EnvCheck { id: string; tool: string; command: string }
interface EnvResult { id: string; status: 'ok' | 'missing' | 'error'; path: string | null; version: string; detail: string }

export function MachinePane() {
  const [plan, setPlan] = useState<Array<EnvCheck & { result?: EnvResult }> | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const loadPlan = async (): Promise<void> => {
    setBusy(true)
    try {
      const payload = (await getJson('/__pg/machine/plan')) as { platform: string; arch: string; node: string; checks: EnvCheck[] }
      setPlan(payload.checks)
      setNote(`probePlan()：${payload.platform}/${payload.arch} · ${payload.node} · ${payload.checks.length} 项`)
    } catch (error) {
      setNote(`${T.commonFailed(message(error))}`)
    } finally {
      setBusy(false)
    }
  }

  const probeAll = async (): Promise<void> => {
    if (plan === null) return
    setBusy(true)
    // 逐项问（probePlan 的注释：manim --version 要 import 整个 Manim，一次问完会把首屏吊死）。
    for (const check of plan) {
      try {
        const result = (await getJson(`/__pg/machine/probe?id=${encodeURIComponent(check.id)}`)) as EnvResult
        setPlan((prev) => prev?.map((item) => (item.id === check.id ? { ...item, result } : item)) ?? prev)
      } catch (error) {
        setPlan((prev) => prev?.map((item) => (item.id === check.id
          ? { ...item, result: { id: check.id, status: 'error' as const, path: null, version: '', detail: message(error) } }
          : item)) ?? prev)
      }
    }
    setBusy(false)
  }

  return (
    <SectionShell note={note}>
      <div className="flex items-center gap-2">
        <Button size="sm" disabled={busy} onClick={() => void loadPlan()}>{T.machinePlanBtn}</Button>
        <Button size="sm" variant="primary" disabled={busy || plan === null} onClick={() => void probeAll()}>
          {busy ? T.machineRunning : T.machineProbeAll}
        </Button>
      </div>
      {plan !== null && (
        <div className="flex flex-col gap-1.5">
          {plan.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2">
              <span className="w-20 font-mono text-[11px] font-medium">{item.id}</span>
              {item.result === undefined
                ? <span className="text-[11px] text-muted-foreground">{item.command}</span>
                : (
                  <>
                    <Badge tone={item.result.status === 'ok' ? 'ok' : item.result.status === 'missing' ? 'fail' : 'neutral'}>
                      {item.result.status}
                    </Badge>
                    <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-muted-foreground">
                      {item.result.status === 'ok' ? `${item.result.path ?? ''} · ${item.result.version}` : item.result.detail}
                    </span>
                  </>
                )}
            </div>
          ))}
        </div>
      )}
    </SectionShell>
  )
}

interface PackageEntry {
  name: string
  version: string
  state: 'bundled' | 'cached' | 'absent'
  bytes: number | null
}
interface Inventory { cacheDir: string; pyodideVersion: string; entries: PackageEntry[] }

/** 常用包（与核心包 COMMON_PACKAGES 同口径的展示子集：摆常用的，免得翻三百行清单）。 */
const COMMON = ['numpy', 'sympy', 'mpmath', 'matplotlib', 'pandas', 'scipy']

export function PackagesPane() {
  const [inventory, setInventory] = useState<Inventory | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)

  const load = async (): Promise<void> => {
    setBusy('load')
    try {
      const payload = (await getJson('/__pg/packages')) as Inventory
      setInventory(payload)
      setNote(`createPyodideSupply().inventory()：pyodide ${payload.pyodideVersion} · 缓存 ${payload.cacheDir} · ${payload.entries.length} 个包`)
    } catch (error) {
      setNote(T.commonFailed(message(error)))
    } finally {
      setBusy(null)
    }
  }

  const cache = async (name: string): Promise<void> => {
    setBusy(name)
    try {
      const payload = (await postJson('/__pg/packages/cache', { names: [name] })) as { results: Array<{ name: string; state: string; bytes: number; error?: string }> }
      const first = payload.results[0]
      setNote(first?.error !== undefined ? `${name}：${first.error}` : `${name} → ${first?.state ?? '?'}（${first?.bytes ?? 0} 字节）`)
      await load()
    } catch (error) {
      setNote(T.commonFailed(message(error)))
    } finally {
      setBusy(null)
    }
  }

  const pick = (name: string): PackageEntry | undefined => inventory?.entries.find((entry) => entry.name === name)

  return (
    <SectionShell note={note}>
      <Button size="sm" variant="primary" disabled={busy !== null} onClick={() => void load()}>{T.packagesInventoryBtn}</Button>
      {inventory !== null && (
        <div className="flex flex-col gap-1.5">
          {COMMON.map((name) => {
            const entry = pick(name)
            return (
              <div key={name} className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2">
                <span className="w-28 font-mono text-[11px] font-medium">{name}</span>
                {entry === undefined
                  ? <span className="text-[11px] text-muted-foreground">不在清单里</span>
                  : (
                    <>
                      <Badge tone={entry.state === 'bundled' ? 'ok' : entry.state === 'cached' ? 'neutral' : 'fail'}>
                        {entry.state === 'bundled' ? T.packagesStateBundled : entry.state === 'cached' ? T.packagesStateCached : T.packagesStateAbsent}
                      </Badge>
                      <span className="font-mono text-[10.5px] text-muted-foreground">
                        {entry.version}{entry.bytes !== null ? ` · ${(entry.bytes / 1048576).toFixed(1)} MB` : ''}
                      </span>
                      {entry.state === 'absent' && (
                        <Button size="sm" className="ml-auto" disabled={busy !== null} onClick={() => void cache(name)}>
                          {busy === name ? T.commonRunning : T.packagesCacheBtn}
                        </Button>
                      )}
                    </>
                  )}
              </div>
            )
          })}
        </div>
      )}
    </SectionShell>
  )
}

export function NodePane() {
  const [code, setCode] = useState(
    'from manim import *\n\nclass Demo(Scene):\n    def construct(self):\n        def helper():\n            return 5\n        total = helper() + missing_name\n        self.add(Dot())',
  )
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const runCheck = async (): Promise<void> => {
    setBusy(true)
    setNote(T.commonRunning)
    try {
      const payload = (await postJson('/__pg/node/check', { code })) as { ok: boolean; error?: string }
      setNote(payload.ok ? T.renderCheckOk : T.renderCheckFail(payload.error ?? ''))
    } catch (error) {
      setNote(T.commonFailed(message(error)))
    } finally {
      setBusy(false)
    }
  }

  return (
    <SectionShell note={note}>
      <CodeEditor label={T.nodeTitle} value={code} onChange={setCode} minHeight="10rem" />
      <div>
        <Button size="sm" variant="primary" disabled={busy} onClick={() => void runCheck()}>{T.nodeCheckBtn}</Button>
      </div>
    </SectionShell>
  )
}
