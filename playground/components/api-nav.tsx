/**
 * 左侧垂直导航：**分节与文档站的 API 参考一一对应**（顺序也照它）。
 *
 * 为什么是垂直导航而不是顶栏再塞一个 Segmented：playground 要对文档里**每一个** API 负责，
 * 分节只会越来越多；横着放迟早放不下，竖着一列还能随文档继续长。
 */
import { T } from '@/lib/i18n.ts'
import type { GroundView } from '@/lib/types.ts'
import type { Playground } from '@/lib/use-playground.ts'
import { cn } from '@/ui/cn.ts'

/** 分节清单：顺序 = 文档站 API 参考的页序（渲染器 → … → 低层导出）。 */
const SECTIONS: ReadonlyArray<{ id: GroundView; label: string }> = [
  { id: 'renderer', label: T.viewRenderer },
  { id: 'surface', label: T.viewSurface },
  { id: 'session', label: T.viewSession },
  { id: 'playback', label: T.viewPlayback },
  { id: 'hooks', label: T.viewHooks },
  { id: 'status', label: T.viewStatus },
  { id: 'export', label: T.viewExport },
  { id: 'machine', label: T.viewMachine },
  { id: 'packages', label: T.viewPackages },
  { id: 'node', label: T.viewNode },
  { id: 'corpus', label: T.viewCorpus },
  { id: 'internals', label: T.viewInternals },
]

export function ApiNav({ pg }: { pg: Playground }) {
  return (
    <nav
      className="scroll-thin flex w-[200px] shrink-0 flex-col gap-2 overflow-y-auto border-r border-border px-3 py-4"
      aria-label={T.navLabel}
    >
      <div role="tablist" aria-orientation="vertical" className="flex flex-col gap-0.5">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            role="tab"
            aria-selected={pg.view === section.id}
            disabled={pg.running}
            onClick={() => pg.setView(section.id)}
            className={cn(
              'rounded-md px-2 py-1.5 text-left text-xs transition-colors',
              'disabled:pointer-events-none disabled:opacity-45',
              pg.view === section.id
                ? 'bg-accent font-medium text-foreground'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
            )}
          >
            {section.label}
          </button>
        ))}
      </div>
      <p className="mt-auto px-2 text-[10.5px] leading-[1.5] text-muted-foreground">{T.navHint}</p>
    </nav>
  )
}
