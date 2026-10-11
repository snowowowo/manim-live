// 一枚小徽章：分组头上的「需联网」「应被拒」，条目上的「仅浏览器」，状态行里的墨迹值。
//
// 为什么不是随便一个 span 加两个类：徽章在这一页要出现四五种语义（中性 / 提示 / 通过 / 未通过），
// 全靠调用处手写颜色迟早会漂。这里把四档定死。
import { cva, type VariantProps } from 'class-variance-authority'
import type { ReactNode } from 'react'
import { cn } from './cn.ts'

const badge = cva(
  'inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-px text-[10px] leading-4 font-medium',
  {
    variants: {
      tone: {
        neutral: 'bg-muted text-muted-foreground',
        info: 'bg-primary/12 text-foreground',
        ok: 'bg-success/15 text-success',
        fail: 'bg-danger/15 text-danger',
        warn: 'bg-warn/15 text-warn',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

export type BadgeProps = VariantProps<typeof badge> & { className?: string; children: ReactNode }

export function Badge({ tone, className, children }: BadgeProps) {
  return <span className={cn(badge({ tone }), className)}>{children}</span>
}
