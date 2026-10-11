/**
 * 文档版式的**中栏正文**：把一条语料当成一页文档来读。
 *
 * 为什么值得单独一版：清单回答「哪条不对」，画布回答「跑出来什么样」，但「这条到底在验什么」
 * ——预期表现、出处（@note）、源码、上次截图——散在三个地方看很累。这一栏把它们按读的顺序排好：
 * 先说结论（预期），再给证据（截图），最后是原文（源码），要改代码时直接往下抄。
 *
 * 正文里**不放渲染按钮**：那一块归右栏（预览），一页里同一个动作只该有一个入口。
 */
import type { ReactNode } from 'react'
import { shotUrl } from '@/lib/corpus.ts'
import { T } from '@/lib/i18n.ts'
import type { ManimExample } from 'manim-live'
import { stateOf } from '@/lib/verdict.ts'
import type { Playground } from '@/lib/use-playground.ts'
import { Badge } from '@/ui/badge.tsx'
import { Tip } from '@/ui/tip.tsx'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-2 border-b border-border/60 py-1.5 last:border-0">
      <span className="w-16 shrink-0 pt-0.5 text-[11px] text-muted-foreground">{label}</span>
      <span className="min-w-0 flex-1 break-all text-xs">{children}</span>
    </div>
  )
}

export function DocBody({ pg, item }: { pg: Playground; item: ManimExample | undefined }) {
  if (item === undefined) {
    return <div className="px-4 py-8 text-xs text-muted-foreground">{T.previewEmpty}</div>
  }
  const state = stateOf(item, pg.results[item.id])
  const result = pg.results[item.id]
  const lastRun = pg.shots.byId[item.id]
  const mark = pg.marks[item.id]
  const rel = item.shot
  const broken = rel !== undefined && pg.brokenShots[rel] === true

  return (
    <article className="scroll-thin min-h-0 flex-1 overflow-y-auto rounded-lg border border-border bg-card px-4 py-3">
      <header className="mb-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <h2 className="text-sm font-semibold">{item.title}</h2>
        <span className="font-mono text-[11px] text-muted-foreground">{item.id}</span>
        {state === 'ok' && <Badge tone="ok">{T.lastRunOk}</Badge>}
        {state === 'fail' && <Badge tone="fail">{T.lastRunFail}</Badge>}
        {item.expect === 'reject' && <Badge>{T.rejectBadge}</Badge>}
        {item.network === true && <Badge tone="warn">{T.netBadge}</Badge>}
        {item.browser === true && <Badge tone="info">{T.browserBadge}</Badge>}
        {item.template !== undefined && <Badge tone="info">模板</Badge>}
      </header>

      <div className="mb-3">
        <Row label={T.docGroup}>{item.group}</Row>
        <Row label={T.docPath}>
          <code className="font-mono text-[11px] text-muted-foreground">{item.file}</code>
        </Row>
        <Row label={T.expectLabel}>
          {item.expectation ?? <em className="text-muted-foreground">{T.expectMissing}</em>}
        </Row>
        {item.note !== undefined && <Row label="出处">{item.note}</Row>}
        {item.errorIncludes !== undefined && (
          <Row label="必须报">
            <code className="font-mono text-[11px]">{item.errorIncludes}</code>
          </Row>
        )}
        <Row label={T.docMarks}>
          {mark === undefined
            ? <span className="text-muted-foreground">未标</span>
            : mark === 'pass' ? <span className="text-success">{T.markPass}</span> : <span className="text-danger">{T.markFail}</span>}
          {result !== undefined && (
            <span className="ml-2 text-muted-foreground">
              （本次：{state === 'ok' ? T.lastRunOk : T.lastRunFail}）
            </span>
          )}
        </Row>
        {lastRun !== undefined && (
          <Row label={T.lastRunLabel}>
            <Tip label={T.lastRunHint} align="start" wide>
              <span className="inline-flex cursor-help items-center gap-1.5">
                <Badge tone={lastRun.ok ? 'ok' : 'fail'}>{lastRun.ok ? T.lastRunOk : T.lastRunFail}</Badge>
                <span className="font-mono text-[11px] text-muted-foreground">
                  {T.inkLabel(`${(lastRun.ink * 100).toFixed(1)}%`)}
                </span>
                {lastRun.fast && <Badge>{T.fastOn}</Badge>}
              </span>
            </Tip>
          </Row>
        )}
      </div>

      {rel !== undefined && !broken && (
        <figure className="mb-3 flex flex-col gap-1">
          <figcaption className="text-[11px] text-muted-foreground">
            <Tip label={T.shotHint} align="start" wide>
              <span className="cursor-help">{T.shotLabel}</span>
            </Tip>
          </figcaption>
          <a href={shotUrl(rel)} target="_blank" rel="noreferrer">
            <img
              className="w-full rounded-md border border-border"
              src={shotUrl(rel)}
              alt={rel}
              loading="lazy"
              onError={() => pg.setBrokenShots((prev) => ({ ...prev, [rel]: true }))}
            />
          </a>
        </figure>
      )}

      <h3 className="mb-1 text-[11px] font-medium text-muted-foreground">{T.docSource}</h3>
      <pre className="scroll-thin overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-[11px] leading-[1.55]">
        {item.python}
      </pre>
    </article>
  )
}
