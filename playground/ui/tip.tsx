// 悬浮提示：把「说明性长文案」从页面上平铺改成悬停 / 键盘聚焦才出现，页面只留控件本身。
//
// 为什么不用 Radix 的 Tooltip：这一页的提示**没有一条需要跟随鼠标定位**——它们都挂在
// 固定不动的工具条按钮上，纯 CSS 的「控件下方弹出」就够，省一个依赖、也省掉 Provider 那层壳。
// 代价是：**会被滚动容器裁掉的场景不能用它**（比如清单里那些行），那种地方用原生 title。
//
// 对齐：`start` 贴控件左缘、`end` 贴右缘——工具条最左 / 最右的按钮用它，免得气泡出画。
import type { ReactNode } from 'react'
import { cn } from './cn.ts'

export interface TipProps {
  label: string
  children: ReactNode
  align?: 'start' | 'center' | 'end'
  /** 成段的长说明放宽到 460px（默认 320px 是给一句话的）。 */
  wide?: boolean
  className?: string
}

const ALIGN = {
  start: 'left-0',
  center: 'left-1/2 -translate-x-1/2',
  end: 'right-0',
} as const

export function Tip({ label, children, align = 'center', wide = false, className }: TipProps) {
  return (
    <span className={cn('group/tip relative inline-flex', className)}>
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute top-full z-50 mt-1.5 hidden rounded-md border border-border',
          'bg-card px-2.5 py-1.5 text-left text-[11px] leading-[1.5] font-normal text-card-foreground',
          'shadow-lg group-hover/tip:block group-focus-within/tip:block',
          wide ? 'w-115' : 'w-80',
          ALIGN[align],
        )}
      >
        {label}
      </span>
    </span>
  )
}
