/**
 * 分节节头：一行说清「这一节是文档里的哪一页、覆盖了哪些成员、提示在哪」。
 *
 * 为什么要有它：用户反馈「每个导航也没有确切看到它跟文档中的那些内容对应」——
 * 这一行就是那条对应关系（`对应文档：API 参考 › <页名>` + 成员清单）。
 * 右侧 `right` 槽放**本分节自己的**工具（如语料节的版式切换）——
 * 共用控件（预热状态 / 截图清单 / 主题）留在顶栏，两者不再混在一起。
 */
import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import { T } from '@/lib/i18n.ts'
import type { GroundView } from '@/lib/types.ts'
import { Button } from '@/ui/button.tsx'
import { Tip } from '@/ui/tip.tsx'
import { SECTION_META, sectionLabel } from './api-nav.tsx'

export function SectionHeader({ id, hint, right }: { id: GroundView; hint: string; right?: ReactNode }) {
  const meta = SECTION_META[id]
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-2.5">
      <span className="text-sm font-semibold">{sectionLabel(id)}</span>
      <Tip label={hint} align="start" wide>
        <Button size="iconSm" className="size-5" aria-label={hint}>
          <Info size={12} strokeWidth={1.8} />
        </Button>
      </Tip>
      <span className="font-mono text-[11px] text-muted-foreground">{T.docRef(meta.doc)}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-[10.5px] text-muted-foreground">{meta.members}</span>
      {right}
    </div>
  )
}
