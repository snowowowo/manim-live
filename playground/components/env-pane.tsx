/**
 * 「运行环境」节：一页**不要画布**的读数台（2026-10-14 重组时合并了旧「环境状态 / 本机探测 /
 * 包管理 / Node 入口」四节，并收下旧「渲染器」节的预热控制）。
 *
 * 组织方式是七张卡，每张都必须**自证**——真数据（environmentStatus 的读数、probeCheck 的探测结果、
 * inventory 的清单）或真按钮的结论（预热、逐项探测、Node 干跑），没有一张是纯说明文字。
 * 前四张读页面内状态（浏览器能力 / Pyodide 运行时 / KaTeX / 按需取包），后三张经 dev-api
 * 真跑核心包的 Node 入口（components/node-panes.tsx）。
 */
import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { environmentStatus, onEnvironmentStatus, type EnvironmentStatus } from 'manim-live'
import { T } from '@/lib/i18n.ts'
import type { Playground } from '@/lib/use-playground.ts'
import { Badge } from '@/ui/badge.tsx'
import { Button } from '@/ui/button.tsx'
import { MachinePane, NodePane, PackagesPane } from './node-panes.tsx'

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-md border border-border bg-card px-3 py-2.5">
      <div className="mb-1.5 text-[11.5px] font-medium">{title}</div>
      {children}
    </section>
  )
}

function Rows({ lines }: { lines: string[] }) {
  return (
    <pre className="whitespace-pre-wrap font-mono text-[10.5px] leading-[1.6] text-muted-foreground">
      {lines.join('\n')}
    </pre>
  )
}

/** 页面内状态那四组：environmentStatus() 快照 + onEnvironmentStatus 订阅（订阅一次，变化自动刷）。 */
function StatusCards({ pg }: { pg: Playground }) {
  const [status, setStatus] = useState<EnvironmentStatus>(() => environmentStatus())
  useEffect(() => onEnvironmentStatus(setStatus), [])

  const runtimeLines = [
    `phase: ${status.runtime.phase}`,
    `indexURL: ${status.runtime.indexURL ?? '—'}`,
    ...(status.runtime.error !== undefined ? [`error: ${status.runtime.error}`] : []),
  ]

  return (
    <>
      <Card title={T.envWarmTitle}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone={pg.warm === 'ready' ? 'ok' : pg.warm === 'failed' ? 'fail' : 'neutral'}>
            {pg.warm === 'ready' ? T.warmupDone : pg.warm === 'failed' ? T.warmupFailed : T.warmup}
          </Badge>
          <Button size="sm" disabled={pg.warm === 'loading'} onClick={pg.warmupNow}>
            <RefreshCw size={12} strokeWidth={1.8} aria-hidden="true" />
            {T.envWarmupNow}
          </Button>
          <span className="ml-auto text-[10.5px] text-muted-foreground">{T.envStatusSubscribed}</span>
        </div>
        <div className="mt-2">
          <Rows lines={runtimeLines} />
        </div>
      </Card>

      <Card title={T.statusBrowser}>
        <Rows lines={Object.entries(status.capabilities).map(([key, value]) => `${key}: ${String(value)}`)} />
      </Card>

      <Card title={T.statusKatex}>
        <Rows
          lines={[
            `phase: ${status.katex.phase}`,
            `baseURL: ${status.katex.baseURL ?? '—'}`,
            ...(status.katex.error !== undefined ? [`error: ${status.katex.error}`] : []),
          ]}
        />
      </Card>

      <Card title={T.statusFetch}>
        <Rows
          lines={[
            `fetching: ${status.packages.fetching.length > 0 ? status.packages.fetching.join('、') : '—'}`,
            ...(status.packages.lastError !== undefined ? [`lastError: ${status.packages.lastError}`] : []),
          ]}
        />
        {status.hints.length > 0 && (
          <ul className="mt-1.5 list-disc pl-4 text-[10.5px] leading-[1.6] text-muted-foreground">
            {status.hints.map((hint) => <li key={hint}>{hint}</li>)}
          </ul>
        )}
      </Card>
    </>
  )
}

export function EnvPane({ pg }: { pg: Playground }) {
  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-3">
      <StatusCards pg={pg} />
      <Card title={T.machineTitle}>
        <MachinePane />
      </Card>
      <Card title={T.packagesTitle}>
        <PackagesPane />
      </Card>
      <Card title={T.nodeTitle}>
        <NodePane />
      </Card>
    </div>
  )
}
