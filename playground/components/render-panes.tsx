/**
 * 四个「读数/说明型」分节的左栏：渲染器 / 环境状态 / 钩子 / 低层导出。
 * （画布 / 语料 / 会话 / 时间轴 / 导出各有自己的组件；Node 侧三节在 node-panes.tsx。）
 *
 * 共同口径：本节负责把文档里这一页的 API **就地可验证**——按钮、读数、结论都在明面上。
 */
import { useEffect, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { environmentStatus, onEnvironmentStatus, type EnvironmentStatus } from 'manim-live'
import { T } from '@/lib/i18n.ts'
import type { Playground } from '@/lib/use-playground.ts'
import { Badge } from '@/ui/badge.tsx'
import { Button } from '@/ui/button.tsx'
import { CodeEditor } from './code-editor.tsx'

/** 分节左栏的通用壳：只有内容栈（标题、提示与「对应文档」都在节头，见 section-header.tsx）。 */
function Pane({ children }: { children: React.ReactNode }) {
  return <aside className="flex min-h-0 flex-col gap-2 border-r border-border pr-3">{children}</aside>
}

export function RenderPane({ pg }: { pg: Playground }) {
  const [code, setCode] = useState('def helper():\n    return 5\nhelper() + 1')
  const [verdict, setVerdict] = useState<string | null>(null)

  const runCheck = async (): Promise<void> => {
    if (code.trim().length === 0) {
      setVerdict(T.renderCheckEmpty)
      return
    }
    setVerdict(T.commonRunning)
    const result = await pg.getRenderer().check(code)
    setVerdict(result.ok ? T.renderCheckOk : T.renderCheckFail(result.error ?? ''))
  }

  return (
    <Pane>
      <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2">
        <span className="text-[11px] text-muted-foreground">{T.renderWarm}</span>
        <Badge tone={pg.warm === 'ready' ? 'ok' : pg.warm === 'failed' ? 'fail' : 'neutral'}>
          {pg.warm === 'ready' ? T.warmupDone : pg.warm === 'failed' ? T.warmupFailed : T.warmup}
        </Badge>
        <Button size="sm" className="ml-auto" disabled={pg.warm === 'loading'} onClick={pg.warmupNow}>
          <RefreshCw size={12} strokeWidth={1.8} aria-hidden="true" />
          {T.renderWarmupNow}
        </Button>
      </div>

      <div className="rounded-md border border-border bg-card px-2.5 py-2">
        <div className="text-[11px] text-muted-foreground">{T.renderIndexUrl}</div>
        <code className="mt-0.5 block break-all font-mono text-[11px] text-foreground">
          {pg.getRenderer().pyodideIndexURL()}
        </code>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-1.5">
        <span className="text-[11px] text-muted-foreground">{T.renderCheckTitle}</span>
        <CodeEditor label={T.renderCheckTitle} value={code} onChange={setCode} />
        <div className="flex items-center gap-2">
          <Button size="sm" variant="primary" onClick={() => void runCheck()}>{T.renderCheckBtn}</Button>
          {verdict !== null && <span className="truncate text-[11px] text-muted-foreground">{verdict}</span>}
        </div>
      </div>
    </Pane>
  )
}

export function StatusPane({ pg }: { pg: Playground }) {
  const [status, setStatus] = useState<EnvironmentStatus>(() => environmentStatus())
  // onEnvironmentStatus 的活演示：订阅一次，之后每次变化自动刷新这页读数。
  useEffect(() => onEnvironmentStatus(setStatus), [])

  const rows: Array<{ title: string; lines: string[] }> = [
    {
      title: T.statusBrowser,
      lines: Object.entries(status.capabilities).map(([key, value]) => `${key}: ${String(value)}`),
    },
    {
      title: T.statusRuntime,
      lines: [
        `phase: ${status.runtime.phase}`,
        `indexURL: ${status.runtime.indexURL ?? '—'}`,
        ...(status.runtime.error !== undefined ? [`error: ${status.runtime.error}`] : []),
      ],
    },
    {
      title: T.statusKatex,
      lines: [
        `phase: ${status.katex.phase}`,
        `baseURL: ${status.katex.baseURL ?? '—'}`,
        ...(status.katex.error !== undefined ? [`error: ${status.katex.error}`] : []),
      ],
    },
    {
      title: T.statusFetch,
      lines: [
        `fetching: ${status.packages.fetching.length > 0 ? status.packages.fetching.join('、') : '—'}`,
        ...(status.packages.lastError !== undefined ? [`lastError: ${status.packages.lastError}`] : []),
      ],
    },
  ]

  return (
    <Pane>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={() => setStatus(environmentStatus())}>
          <RefreshCw size={12} strokeWidth={1.8} aria-hidden="true" />
          {T.statusRefresh}
        </Button>
        <span className="text-[11px] text-muted-foreground">onEnvironmentStatus 已订阅</span>
      </div>
      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        {rows.map((row) => (
          <div key={row.title} className="rounded-md border border-border bg-card px-2.5 py-2">
            <div className="text-[11px] font-medium">{row.title}</div>
            <pre className="mt-1 whitespace-pre-wrap font-mono text-[10.5px] leading-[1.5] text-muted-foreground">
              {row.lines.join('\n')}
            </pre>
          </div>
        ))}
        {status.hints.length > 0 && (
          <div className="rounded-md border border-border bg-card px-2.5 py-2">
            <div className="text-[11px] font-medium">hints</div>
            <ul className="mt-1 list-disc pl-4 text-[10.5px] leading-[1.5] text-muted-foreground">
              {status.hints.map((hint) => <li key={hint}>{hint}</li>)}
            </ul>
          </div>
        )}
      </div>
    </Pane>
  )
}

export function HooksPane({ pg }: { pg: Playground }) {
  return (
    <Pane>
      <div className="flex flex-col gap-2">
        <Button size="sm" variant="primary" onClick={() => pg.runSnippet(T.hooksDemoCode)}>
          {T.hooksOnLoadingDemo}
        </Button>
        <p className="text-[11px] leading-[1.6] text-muted-foreground">
          观察点：点下去之后画布上的**取包遮罩**与下方状态行就是 onLoading 的真实回调（第一次会真下载 numpy，
          之后走本机缓存一闪而过——想再看一次，就把 corpus/pyodide-cache 里的 wheel 删掉）。
        </p>
        <p className="text-[11px] leading-[1.6] text-muted-foreground">{T.hooksSignalsInExport}</p>
      </div>
    </Pane>
  )
}

export function InternalsPane({ pg }: { pg: Playground }) {
  return (
    <Pane>
      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
        <div className="rounded-md border border-border bg-card px-2.5 py-2">
          <div className="text-[11px] font-medium">{T.internalsGapsTitle}</div>
          <ul className="mt-1 flex flex-col gap-1 text-[11px] leading-[1.6] text-muted-foreground">
            {T.internalsGaps.map((row) => <li key={row}>{row}</li>)}
          </ul>
        </div>
        <div className="rounded-md border border-border bg-card px-2.5 py-2 text-[11px] leading-[1.6] text-muted-foreground">
          本轮语料判定与统计正在被「语料与测试台」使用：已跑 {Object.keys(pg.results).length} 条，
          其中失败 {Object.values(pg.results).filter((r) => !r.ok).length} 条（isPassed / stateOf / tally 的真实输出）。
        </div>
      </div>
    </Pane>
  )
}
