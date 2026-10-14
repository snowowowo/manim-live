/**
 * 语料工具条 + 筛选行：三种版式**共用同一套**（清单 / 平铺 / 文档）。
 *
 * 为什么不各自实现一份：这一条工具条上的每个按钮都改状态（跑一套、清一次记录、切一次档位），
 * 三份实现意味着三种「清除记录到底清了什么」的细微差别——那是最难被发现的 bug。
 * 版式的差别只在**摆哪儿**，从来不在「有哪些操作」。
 */
import { ClipboardCopy, FileDown, Play, Search, Square, Trash2, Undo2, Zap, X } from 'lucide-react'
import { useState } from 'react'
import { tally } from 'manim-live'
import { copyText } from '@/lib/clipboard.ts'
import { T } from '@/lib/i18n.ts'
import type { GroundFilter } from '@/lib/types.ts'
import type { Playground } from '@/lib/use-playground.ts'
import { Button } from '@/ui/button.tsx'
import { Segmented } from '@/ui/segmented.tsx'
import { Tip } from '@/ui/tip.tsx'

/** 语料工具条：全部渲染 / 停止 / 复制结果 / 落盘报告 / 清除记录 / 清除人工标注（只有人能清） / 极速 + 计数。 */
export function CorpusToolbar({ pg }: { pg: Playground }) {
  const [copied, setCopied] = useState(false)
  const { tried, failed, pending } = tally(pg.examples, pg.results)
  const markIds = Object.keys(pg.marks)
  const marksPassed = markIds.filter((id) => pg.marks[id] === 'pass').length

  const copy = (): void => {
    void copyText(pg.reportText()).then((ok) => {
      if (!ok) return
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Tip label={T.renderAllHint} align="start" wide>
        <Button
          variant="primary"
          disabled={pg.running || pending.length === 0}
          onClick={() => void pg.runBatch(pending)}
        >
          <Play size={12} strokeWidth={2} aria-hidden="true" />
          {T.renderAll}
        </Button>
      </Tip>
      {pg.running && (
        <Tip label={T.stopAllHint} align="start">
          <Button size="icon" aria-label={T.stopAll} onClick={pg.stop}>
            <Square size={13} strokeWidth={1.8} />
          </Button>
        </Tip>
      )}
      <Tip label={copied ? T.copyReportDone : (tried === 0 ? T.copyReportEmpty : T.copyReportHint)} align="start" wide>
        <Button size="icon" disabled={tried === 0} aria-label={T.copyReport} onClick={copy}>
          <ClipboardCopy size={14} strokeWidth={1.7} />
        </Button>
      </Tip>
      <Tip label={T.reportSaveHint} align="start" wide>
        <Button size="icon" disabled={tried === 0} aria-label={T.reportSave} onClick={pg.saveReport}>
          <FileDown size={14} strokeWidth={1.7} />
        </Button>
      </Tip>
      <Tip label={T.clearRecordHint} align="start" wide>
        <Button size="icon" variant="danger" aria-label={T.clearRecord} onClick={pg.clearRecord}>
          <Trash2 size={14} strokeWidth={1.7} />
        </Button>
      </Tip>
      {markIds.length > 0 && (
        <Tip label={T.marksClearHint} align="start" wide>
          <Button size="icon" aria-label={T.marksClear} onClick={pg.clearAllMarks}>
            <Undo2 size={14} strokeWidth={1.7} />
          </Button>
        </Tip>
      )}
      <Tip label={T.fastHint} align="start" wide>
        <Button
          size="icon"
          active={pg.fast}
          aria-pressed={pg.fast}
          aria-label={T.fastOn}
          onClick={() => pg.setFast(!pg.fast)}
        >
          <Zap size={14} strokeWidth={1.7} />
        </Button>
      </Tip>

      <span className="ml-1 font-mono text-[11px] text-muted-foreground">
        {copied
          ? T.copyReportDone
          : pg.batch === null
            ? (tried === 0 ? T.countIdle : T.count(tried - failed, failed, pg.examples.length))
            : T.batchProgress(pg.batch.done, pg.batch.total)}
      </span>
      {markIds.length > 0 && (
        <span className="font-mono text-[11px] text-muted-foreground">
          {T.marksCount(marksPassed, markIds.length - marksPassed)}
        </span>
      )}
    </div>
  )
}

/** 筛选行：分组内搜索 + 结果状态筛选。239 条语料，没有这两个没法用。 */
export function FilterBar({ pg, className }: { pg: Playground; className?: string }) {
  return (
    <div className={className === undefined ? 'flex flex-wrap items-center gap-1.5' : `flex flex-wrap items-center gap-1.5 ${className}`}>
      <span className="relative inline-flex items-center">
        <Search size={12} strokeWidth={1.8} className="absolute left-2 text-muted-foreground" aria-hidden="true" />
        <input
          type="search"
          value={pg.query}
          placeholder={T.searchPlaceholder}
          aria-label={T.searchPlaceholder}
          onChange={(event) => pg.setQuery(event.target.value)}
          className="h-7 w-52 rounded-md border border-input bg-card pr-6 pl-7 text-xs text-foreground placeholder:text-muted-foreground"
        />
        {pg.query !== '' && (
          <button
            type="button"
            aria-label={T.searchClear}
            title={T.searchClear}
            onClick={() => pg.setQuery('')}
            className="absolute right-1.5 grid size-4 place-items-center rounded-sm text-muted-foreground hover:text-foreground"
          >
            <X size={11} strokeWidth={2} />
          </button>
        )}
      </span>
      <Segmented<GroundFilter>
        label={T.filterLabel}
        value={pg.filter}
        onChange={pg.setFilter}
        options={[
          { value: 'all', label: T.filterAll },
          { value: 'pending', label: T.filterPending, hint: '只看还没跑过的' },
          { value: 'failed', label: T.filterFailed, hint: '只看未通过的' },
          { value: 'passed', label: T.filterPassed, hint: '只看已通过的' },
        ]}
      />
    </div>
  )
}
