/**
 * 清单版式的左栏：语料工具条 + 筛选 + **竖向分组清单**（对齐 DSH 实验场那一版）。
 *
 * 分组头三件事一眼可见：`N/M`（这组过了几条）、失败数（红）、「需联网」徽章——
 * 两百多条语料不可能逐条看，靠的就是先扫组头再展开。
 * 组头右侧那个 ▶ 只跑**本组未通过的**，这是最常用的一个动作（改完一组就想立刻再看一遍这组）。
 *
 * 条目行上的 `title` 用原生提示而不是自己的气泡：这一栏是滚动容器，
 * 绝对定位的气泡会被裁掉一半。原生 title 没有这个问题（丑一点，但看得到）。
 */
import { ChevronDown, ChevronRight, Play } from 'lucide-react'
import { T } from '@/lib/i18n.ts'
import { isPassed, stateOf, type ManimExample } from 'manim-live'
import type { Playground } from '@/lib/use-playground.ts'
import { groupItems, matchFilter } from '@/lib/filter.ts'
import { Badge } from '@/ui/badge.tsx'
import { Button } from '@/ui/button.tsx'
import { cn } from '@/ui/cn.ts'
import { Tip } from '@/ui/tip.tsx'
import { CorpusToolbar, FilterBar } from './corpus-controls.tsx'

/** 结果点：未跑是空心，通过 / 未通过填对应色——一眼看出哪条不对。 */
function Dot({ state }: { state: 'idle' | 'ok' | 'fail' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'size-[7px] shrink-0 rounded-full border',
        state === 'idle' && 'border-border bg-transparent',
        state === 'ok' && 'border-success bg-success',
        state === 'fail' && 'border-danger bg-danger',
      )}
    />
  )
}

export interface SidebarProps {
  pg: Playground
  /**
   * 紧凑档：藏掉条目行里的 `id` 与徽章，只留状态点 + 标题。
   *
   * 文档版式的导航栏只有 240~300px，带上 id 之后标题会被截成「矩形与圆角矩形…」这种
   * 认不出来的样子——而 id 与徽章在那套版式里本来就另有去处（中栏正文里全都有）。
   * 窄栏里**信息要减**，不是硬塞。图标与状态点留着：它们不占宽度。
   */
  compact?: boolean
}

export function Sidebar({ pg, compact = false }: SidebarProps) {
  const groups = groupItems(pg.groups, pg.examples, (example) =>
    matchFilter(example, pg.results, pg.filter, pg.query))

  return (
    <aside className="flex min-h-0 flex-col gap-2 border-r border-border pr-3">
      <CorpusToolbar pg={pg} />
      <FilterBar pg={pg} />

      <div className="scroll-thin -mr-1 min-h-0 flex-1 overflow-y-auto pr-1">
        {groups.length === 0 && <p className="px-1 py-6 text-xs text-muted-foreground">{T.searchEmpty}</p>}
        {groups.map((group) => {
          const passed = group.items.filter((item) => isPassed(item, pg.results[item.id])).length
          const failed = group.items.filter(
            (item) => pg.results[item.id] !== undefined && !isPassed(item, pg.results[item.id]),
          ).length
          const pending = group.items.filter((item) => !isPassed(item, pg.results[item.id]))
          const open = pg.collapsed[group.id] !== true
          return (
            <div key={group.id}>
              <div className="group/head flex items-center gap-1 py-1">
                <button
                  type="button"
                  aria-expanded={open}
                  title={open ? T.collapseGroup : T.expandGroup}
                  onClick={() => pg.setCollapsed((prev) => ({ ...prev, [group.id]: open }))}
                  className="flex min-w-0 flex-1 items-center gap-1.5 rounded-sm px-1 py-0.5 text-left hover:bg-accent"
                >
                  {open
                    ? <ChevronDown size={12} strokeWidth={2} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                    : <ChevronRight size={12} strokeWidth={2} className="shrink-0 text-muted-foreground" aria-hidden="true" />}
                  <span className="truncate text-[11.5px] font-medium">{group.title}</span>
                  <span className="shrink-0 font-mono text-[10.5px] text-muted-foreground">
                    {passed}/{group.items.length}
                  </span>
                  {failed > 0 && <Badge tone="fail">{failed}</Badge>}
                  {group.network === true && <Badge tone="warn">{T.netBadge}</Badge>}
                </button>
                <Tip label={T.runGroupHint} align="end" wide>
                  <Button
                    size="iconSm"
                    // **常显**，不搞「hover 才出现」：DSH 实验场那一版就是常显的
                    // （`.mr-ground-run` 没有 opacity 规则），而 hover 才显在触屏上等于不存在——
                    // 一个动作键的**可发现性**是行为，不是装饰。压暗靠颜色，不靠藏。
                    className="size-5 text-muted-foreground hover:text-foreground"
                    disabled={pg.running || pending.length === 0}
                    aria-label={T.runGroup}
                    onClick={() => void pg.runBatch(pending)}
                  >
                    <Play size={11} strokeWidth={2} />
                  </Button>
                </Tip>
              </div>

              {open && (
                <div className="flex flex-col">
                  {group.items.map((item: ManimExample) => {
                    const mark = pg.marks[item.id]
                    return (
                      <button
                        key={item.id}
                        type="button"
                        data-state={stateOf(item, pg.results[item.id])}
                        aria-pressed={pg.selected === item.id}
                        title={[item.id, item.expectation, item.note].filter((part) => part !== undefined).join('\n')}
                        onClick={() => pg.openExample(item.id)}
                        className={cn(
                          'flex h-7 w-full items-center gap-2 rounded-sm px-1.5 text-left text-xs',
                          'hover:bg-accent',
                          pg.selected === item.id ? 'bg-accent' : 'aria-pressed:bg-accent',
                        )}
                      >
                        <Dot state={stateOf(item, pg.results[item.id])} />
                        <span className="min-w-0 flex-1 truncate">{item.title}</span>
                        {!compact && item.expect === 'reject' && <Badge tone="neutral">{T.rejectBadge}</Badge>}
                        {!compact && item.browser === true && <Badge tone="info">{T.browserBadge}</Badge>}
                        {mark !== undefined && (
                          <span
                            aria-hidden="true"
                            className={cn('shrink-0 text-[11px]', mark === 'pass' ? 'text-success' : 'text-danger')}
                          >
                            {mark === 'pass' ? '✓' : '✗'}
                          </span>
                        )}
                        {!compact && (
                          <span className="shrink-0 font-mono text-[10px] text-muted-foreground">{item.id}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </aside>
  )
}
