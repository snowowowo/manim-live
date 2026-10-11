// 按钮：一套变体表（cva），不引 Radix——按钮不需要那种程度的无障碍机器。
//
// 尺寸刻意偏小（h-8 / text-xs）：这一页是工具台，一屏要放下工具条七件 + 两百多条语料，
// 按普通网页的按钮尺度会立刻显得松垮。
import { cva, type VariantProps } from 'class-variance-authority'
import type { ButtonHTMLAttributes } from 'react'
import { cn } from './cn.ts'

const button = cva(
  'inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-transparent font-medium transition-colors disabled:pointer-events-none disabled:opacity-45',
  {
    variants: {
      variant: {
        // 主操作（渲染 / 全部渲染）：实心 primary，一屏里只该有一个
        primary: 'bg-primary text-primary-foreground hover:bg-primary/85',
        // 常规工具按钮：有边、无声，悬停才亮
        outline: 'border-border bg-card text-foreground hover:bg-accent',
        // 纯图标按钮 / 工具条里那些次要动作
        ghost: 'text-muted-foreground hover:bg-accent hover:text-foreground',
        // 危险（清除记录）
        danger: 'text-muted-foreground hover:bg-danger/12 hover:text-danger',
      },
      size: {
        sm: 'h-7 px-2.5 text-xs',
        md: 'h-8 px-3 text-xs',
        icon: 'size-8',
        iconSm: 'size-6 rounded-sm',
      },
      active: {
        true: 'bg-accent text-foreground',
        false: '',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md', active: false },
  },
)

export type ButtonProps =
  & ButtonHTMLAttributes<HTMLButtonElement>
  & VariantProps<typeof button>

export function Button({ className, variant, size, active, type = 'button', ...rest }: ButtonProps) {
  return <button type={type} className={cn(button({ variant, size, active }), className)} {...rest} />
}
