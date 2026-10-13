/**
 * 右侧预览面板：预期表现 → 上一轮真机结果 → 历史截图 → 活画布。
 *
 * 四块是**递进**的，缺一块就看不清问题出在哪：
 *   ① 预期表现——「应该长什么样」（人写的一句话）；
 *   ② 上一轮真机结果——「上次跑的时候过没过、画布上有没有墨」；
 *   ③ 历史截图——「实际画出来什么样」（真机截图，与语料同名归档）；
 *   ④ 活画布——「现在这版代码跑出来什么样」。
 * 前两块回答「该不该对」，后两块回答「对不对」，中间那一步以前只能靠反复重截。
 *
 * 视图（语料 / 自定义代码）在这里合流：同一块画布、同一套工具（渲染 / 极速 / 导出），
 * 只是「当前这条」的来源不同。
 */
import { Check, Download, Play, Undo2, X, Zap } from 'lucide-react'
import { shotUrl, type LastRun } from '@/lib/corpus.ts'
import { T } from '@/lib/i18n.ts'
import { isPassed, type ManimExample } from 'manim-live'
import type { Playground } from '@/lib/use-playground.ts'
import { Badge } from '@/ui/badge.tsx'
import { Button } from '@/ui/button.tsx'
import { cn } from '@/ui/cn.ts'
import { Tip } from '@/ui/tip.tsx'
import { LiveStage } from './live-stage.tsx'

/** 人工验证三键：标对 / 标不对 / 清本条。挂在正在展示的这条上——看到什么标什么。 */
function MarkButtons({ pg, example }: { pg: Playground; example: ManimExample }) {
  const mark = pg.marks[example.id]
  const item = (value: 'pass' | 'fail', label: string, Icon: typeof Check) => (
    <Tip label={label} align="end">
      <Button
        size="iconSm"
        active={mark === value}
        aria-pressed={mark === value}
        aria-label={label}
        className={cn(
          'size-5',
          mark === value && (value === 'pass' ? 'bg-success/18 text-success' : 'bg-danger/18 text-danger'),
        )}
        onClick={() => pg.setMark(example.id, mark === value ? null : value)}
      >
        <Icon size={12} strokeWidth={2.2} />
      </Button>
    </Tip>
  )
  return (
    <span className="ml-auto inline-flex items-center gap-1">
      <Tip label={T.markHint} align="end">
        <span className="cursor-help text-[11px] text-muted-foreground">{T.markTitle}</span>
      </Tip>
      {item('pass', T.markPass, Check)}
      {item('fail', T.markFail, X)}
      {mark !== undefined && (
        <Tip label={T.markUnmark} align="end">
          <Button size="iconSm" aria-label={T.markUnmark} className="size-5" onClick={() => pg.setMark(example.id, null)}>
            <Undo2 size={12} strokeWidth={1.8} />
          </Button>
        </Tip>
      )}
    </span>
  )
}

/** 上一轮真机结果的一行回执。清单里没有这条就整行不出现（绝不因它缺失而留个空块）。 */
function LastRunLine({ run }: { run: LastRun }) {
  return (
    <Tip label={T.lastRunHint} align="start" wide>
      <span className="inline-flex cursor-help items-center gap-1.5 text-[11px] text-muted-foreground">
        {T.lastRunLabel}
        <Badge tone={run.ok ? 'ok' : 'fail'}>{run.ok ? T.lastRunOk : T.lastRunFail}</Badge>
        <span className="font-mono">{T.inkLabel(`${(run.ink * 100).toFixed(1)}%`)}</span>
        {run.fast && <Badge>{T.fastOn}</Badge>}
      </span>
    </Tip>
  )
}

/**
 * 历史截图（`_dev/shots/<组>/<同名>.png`）。
 *
 * 摆成**缩略图**而不是铺满：这一栏的主人是活画布——把 1280×720 的整图铺开，画布就被挤到
 * 首屏之外了（实测：一进页面只看到「上次截图」，得往下滚才看到画布，等于这一页的重点被一张
 * 参考图顶掉）。缩略图够表达「有图、大概是什么样」，要看细节点开就是原尺寸。
 */
function ShotFigure({ pg, example }: { pg: Playground; example: ManimExample }) {
  const rel = example.shot
  if (rel === undefined || pg.brokenShots[rel] === true) return null
  return (
    <figure className="flex items-center gap-2.5 rounded-md border border-border bg-card p-1.5">
      <a href={shotUrl(rel)} target="_blank" rel="noreferrer" className="shrink-0">
        <img
          className="h-20 w-auto rounded-sm border border-border"
          src={shotUrl(rel)}
          alt={rel}
          loading="lazy"
          onError={() => pg.setBrokenShots((prev) => ({ ...prev, [rel]: true }))}
        />
      </a>
      <figcaption className="min-w-0 text-[11px] leading-[1.5] text-muted-foreground">
        <Tip label={T.shotHint} align="start" wide>
          <span className="cursor-help">{T.shotLabel}</span>
        </Tip>
        <br />
        点开看原尺寸（1280×720）
      </figcaption>
    </figure>
  )
}

export interface PreviewProps {
  pg: Playground
  current: ManimExample | undefined
  /** 历史截图摆不摆在这儿（文档版式把它摆到中栏的正文里，那里更该看图）。 */
  showShot?: boolean
}

export function Preview({ pg, current, showShot = true }: PreviewProps) {
  const lastRun = current === undefined ? undefined : pg.shots.byId[current.id]
  const label = pg.shown === null
    ? undefined
    : pg.shown.job.kind === 'free' ? T.freeLabel : current?.title

  // 自由代码视图里「渲染」还要求有代码可跑（DSH 那一侧的按钮也是 `disabled={running || emptySource}`）：
  // 空代码点下去什么都不发生，不如灰着。
  const freeEmpty = pg.view === 'free' && pg.source.trim().length === 0
  const nothingSelected = pg.view === 'corpus' && pg.selected === null
  // 逐帧导出走收集模式（不实时播），极速不再是障碍；语料节要求先渲过（导当前那条），
  // 自由代码节没渲过也能导（collect 自己会跑一遍编辑器里的代码）。
  const exportDisabled = pg.view === 'corpus' && (pg.shown === null || pg.source.trim().length === 0)
  const exportHint = pg.view === 'corpus' && pg.shown === null ? T.exportNoSurface : T.exportHint

  return (
    <section className="flex min-w-0 flex-col gap-3">
      {current !== undefined && (
        <div className="flex flex-wrap items-start gap-x-3 gap-y-1 rounded-md border border-border bg-card px-3 py-2">
          <Tip label={T.expectHint} align="start" wide>
            <span className="cursor-help text-[11px] font-medium text-muted-foreground">{T.expectLabel}</span>
          </Tip>
          <span className="min-w-0 flex-1 text-xs leading-[1.55]">
            {current.expectation ?? <em className="text-muted-foreground">{T.expectMissing}</em>}
          </span>
          <MarkButtons pg={pg} example={current} />
          {lastRun !== undefined && (
            <div className="w-full">
              <LastRunLine run={lastRun} />
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        {/* 烟测认这个 id，见 live-stage.tsx 的文件头 */}
        <Button
          id="render"
          variant="primary"
          disabled={pg.running || pg.warm !== 'ready' || freeEmpty || nothingSelected}
          onClick={() => {
            if (pg.view === 'free') pg.renderFree()
            else if (pg.selected !== null) pg.openExample(pg.selected)
          }}
        >
          <Play size={12} strokeWidth={2} aria-hidden="true" />
          {pg.shown === null ? T.render : T.rerun}
        </Button>
        <Tip label={T.fastHint} align="start" wide>
          <Button
            size="icon"
            aria-pressed={pg.fast}
            active={pg.fast}
            aria-label={T.fastOn}
            onClick={() => pg.setFast(!pg.fast)}
          >
            <Zap size={14} strokeWidth={1.7} />
          </Button>
        </Tip>
        <Tip label={exportHint} align="start" wide>
          <Button
            size="icon"
            aria-label={T.exportVideo}
            disabled={exportDisabled}
            onClick={() => void pg.exportCurrent()}
          >
            <Download size={14} strokeWidth={1.7} />
          </Button>
        </Tip>
        {label !== undefined && (
          <span className="ml-auto truncate font-mono text-[11px] text-muted-foreground">{label}</span>
        )}
      </div>

      <LiveStage
        stageRef={pg.stageRef}
        status={pg.status}
        live={pg.shown !== null}
        label={T.previewEmpty}
        overlay={pg.overlay}
      />

      {/* 参考图摆在活画布**之后**：先看现在跑成什么样，再拿上次那张对着比（顺序反了主次也反了） */}
      {current !== undefined && showShot && <ShotFigure pg={pg} example={current} />}
    </section>
  )
}
