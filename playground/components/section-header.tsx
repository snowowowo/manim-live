/**
 * 分节节头：节名 + 一枚 ⓘ（悬浮提示）+ 右侧 `right` 槽（本节自己的工具，如语料节的版式切换）。
 *
 * 2026-10-14 重组时去掉了「对应文档：API 参考 › <页名> + 成员清单」那一行——playground 不再
 * 与文档站一一对应，节按使用方式分（见 api-nav.tsx）；共用控件（预热徽章 / 截图清单 / 主题）在顶栏。
 */
import type { ReactNode } from 'react'
import { Info } from 'lucide-react'
import type { GroundView } from '@/lib/types.ts'
import { Button } from '@/ui/button.tsx'
import { Tip } from '@/ui/tip.tsx'
import { sectionLabel } from './api-nav.tsx'

export function SectionHeader({ id, hint, right }: { id: GroundView; hint: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-border px-4 py-2.5">
      <span className="text-sm font-semibold">{sectionLabel(id)}</span>
      <Tip label={hint} align="start" wide>
        <Button size="iconSm" className="size-5" aria-label={hint}>
          <Info size={12} strokeWidth={1.8} />
        </Button>
      </Tip>
      <span className="min-w-0 flex-1" />
      {right}
    </div>
  )
}
