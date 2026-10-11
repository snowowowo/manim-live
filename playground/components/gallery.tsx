/**
 * 平铺版式的左栏：语料摊成**网格**，一组一段，格子里是「上次截图 + 标题 + id + 状态点」。
 *
 * 与清单版的差别不只是好看：清单适合「顺着读」，平铺适合「扫一眼看哪张不对」——
 * 有图的格子直接把画面摆出来，布局类的问题（贴边、压字、越界）扫一眼就能看出来，
 * 而清单要一条条点开才知道。所以这一版的缩略图不是装饰，是主要信息。
 *
 * 图走 `loading="lazy"`：一屏可能有两百多张 1280×720 的 PNG，全量加载会把网络打满。
 */
import { T } from '@/lib/i18n.ts'
import { shotUrl } from '@/lib/corpus.ts'
import type { ManimExample } from 'manim-live'
import type { Playground } from '@/lib/use-playground.ts'
import { groupItems, isPassed, matchFilter, stateOf } from '@/lib/verdict.ts'
import { Badge } from '@/ui/badge.tsx'
import { cn } from '@/ui/cn.ts'
import { CorpusToolbar, FilterBar } from './corpus-controls.tsx'

const BORDER = {
  idle: 'border-border',
  ok: 'border-success/45',
  fail: 'border-danger/60',
} as const

function Tile({ pg, item }: { pg: Playground; item: ManimExample }) {
  const state = stateOf(item, pg.results[item.id])
  const mark = pg.marks[item.id]
  const rel = item.shot
  const broken = rel !== undefined && pg.brokenShots[rel] === true
  return (
    <button
      type="button"
      data-state={state}
      aria-pressed={pg.selected === item.id}
      title={[item.id, item.title, item.expectation].filter((part) => part !== undefined).join('\n')}
      onClick={() => pg.openExample(item.id)}
      className={cn(
        'group/tile flex flex-col overflow-hidden rounded-lg border bg-card text-left transition-colors',
        'hover:border-ring/60',
        pg.selected === item.id ? 'border-ring' : BORDER[state],
      )}
    >
      <span className="relative block aspect-video w-full bg-stage">
        {rel !== undefined && !broken ? (
          <img
            className="size-full object-cover"
            src={shotUrl(rel)}
            alt={rel}
            loading="lazy"
            onError={() => pg.setBrokenShots((prev) => ({ ...prev, [rel]: true }))}
          />
        ) : (
          <span className="grid size-full place-items-center px-2 text-center text-[10px] text-white/35">
            {T.shotMissing}
          </span>
        )}
        <span
          aria-hidden="true"
          className={cn(
            'absolute top-1.5 left-1.5 size-2 rounded-full border border-black/30',
            state === 'idle' && 'bg-white/25',
            state === 'ok' && 'bg-success',
            state === 'fail' && 'bg-danger',
          )}
        />
        {mark !== undefined && (
          <span
            aria-hidden="true"
            className={cn(
              'absolute top-1 right-1 rounded-sm bg-black/55 px-1 text-[10px] leading-4',
              mark === 'pass' ? 'text-success' : 'text-danger',
            )}
          >
            {mark === 'pass' ? '✓' : '✗'}
          </span>
        )}
      </span>
      <span className="flex flex-col gap-0.5 px-2 py-1.5">
        <span className="line-clamp-2 text-[11.5px] leading-[1.4]">{item.title}</span>
        <span className="flex items-center gap-1">
          <span className="truncate font-mono text-[10px] text-muted-foreground">{item.id}</span>
          {item.expect === 'reject' && <Badge>{T.rejectBadge}</Badge>}
          {item.network === true && <Badge tone="warn">{T.netBadge}</Badge>}
        </span>
      </span>
    </button>
  )
}

export function Gallery({ pg }: { pg: Playground }) {
  const groups = groupItems(pg.groups, pg.examples, (example) =>
    matchFilter(example, pg.results, pg.filter, pg.query))

  return (
    <div className="flex min-h-0 flex-col gap-2 pr-3">
      <CorpusToolbar pg={pg} />
      <FilterBar pg={pg} />
      <div className="scroll-thin -mr-1 min-h-0 flex-1 overflow-y-auto pr-1">
        {groups.length === 0 && <p className="py-6 text-xs text-muted-foreground">{T.searchEmpty}</p>}
        {groups.map((group) => {
          const passed = group.items.filter((item) => isPassed(item, pg.results[item.id])).length
          return (
            <section key={group.id} className="mb-3">
              <h3 className="mb-1.5 flex items-center gap-2 text-[11.5px] font-medium">
                {group.title}
                <span className="font-mono text-[10.5px] text-muted-foreground">
                  {passed}/{group.items.length}
                </span>
                {group.network === true && <Badge tone="warn">{T.netBadge}</Badge>}
              </h3>
              <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2">
                {group.items.map((item) => <Tile key={item.id} pg={pg} item={item} />)}
              </div>
            </section>
          )
        })}
      </div>
    </div>
  )
}
