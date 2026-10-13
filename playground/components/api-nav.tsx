/**
 * 左侧垂直导航：**按使用方式分两组**（2026-10-14 重组）——
 *
 *   工作台：要画布的四件事（语料 / 自由代码 / 会话 / 时间轴）
 *   诊断：  不要画布的读数台（运行环境）
 *
 * 不再与文档站 API 参考一一对应（旧版曾逐页对应，节多而碎、一半是纯读数）；
 * 分节清单与标签只在本地维护。
 */
import { T } from '@/lib/i18n.ts'
import type { GroundView } from '@/lib/types.ts'
import type { Playground } from '@/lib/use-playground.ts'
import { cn } from '@/ui/cn.ts'

/** 分节分组：`label` 是组名，`items` 是组内分节。 */
export const SECTION_GROUPS: ReadonlyArray<{
  label: string
  items: ReadonlyArray<{ id: GroundView; label: string }>
}> = [
  {
    label: T.navGroupWork,
    items: [
      { id: 'corpus', label: T.viewCorpus },
      { id: 'free', label: T.viewFree },
      { id: 'session', label: T.viewSession },
      { id: 'playback', label: T.viewPlayback },
    ],
  },
  {
    label: T.navGroupDiag,
    items: [{ id: 'env', label: T.viewEnv }],
  },
]

/** 全部分节（平铺视图，供查找与遍历）。 */
export const SECTIONS = SECTION_GROUPS.flatMap((group) => group.items)

/** 分节标题（节头与导航同一份来源）。 */
export function sectionLabel(id: GroundView): string {
  return SECTIONS.find((section) => section.id === id)?.label ?? id
}

export function ApiNav({ pg }: { pg: Playground }) {
  return (
    <nav
      className="scroll-thin flex w-[200px] shrink-0 flex-col gap-3 overflow-y-auto border-r border-border px-3 py-4"
      aria-label={T.navLabel}
    >
      {SECTION_GROUPS.map((group) => (
        <div key={group.label} role="tablist" aria-orientation="vertical" className="flex flex-col gap-1">
          <div className="px-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70">
            {group.label}
          </div>
          {group.items.map((section) => (
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
      ))}
      <p className="mt-auto px-2 text-[10.5px] leading-[1.5] text-muted-foreground">{T.navHint}</p>
    </nav>
  )
}
