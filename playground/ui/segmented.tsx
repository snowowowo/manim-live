// 分段控件（视图 / 版式 / 筛选切换）。
//
// **交互照抄**宿主 `ui-primitives/SegmentedControl`：←→↑↓ 走位（可绕回）、Home/End 跳首尾、
// `tabIndex` 只把当前项留在 Tab 序里（一组控件占一个 Tab 位，符合 WAI-ARIA 的 radiogroup 惯例）。
// 版式上换掉了那个滑动指示块——用「选中项自己亮起来」表达，代码少一半、也没了
// 「重建时指示块飞一下」的毛病；键盘行为一字未动，那才是真正在用的东西。
import type { KeyboardEvent } from 'react'
import { cn } from './cn.ts'

export interface SegmentedOption<Value extends string> {
  value: Value
  label: string
  /** 悬停说明（可选）。 */
  hint?: string
  disabled?: boolean
}

type WalkKey = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown' | 'Home' | 'End'

const isWalkKey = (key: string): key is WalkKey =>
  key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown'
  || key === 'Home' || key === 'End'

/** 漫游键落到的下一个可选项：方向键走最近的一个（可绕回），Home/End 跳首尾。 */
function walk<Value extends string>(
  options: readonly SegmentedOption<Value>[],
  from: number,
  key: WalkKey,
): SegmentedOption<Value> | undefined {
  const count = options.length
  if (key === 'Home') return options.find((option) => option.disabled !== true)
  if (key === 'End') return [...options].reverse().find((option) => option.disabled !== true)
  const step = key === 'ArrowRight' || key === 'ArrowDown' ? 1 : -1
  for (let offset = 1; offset < count; offset += 1) {
    const candidate = options[(((from + step * offset) % count) + count) % count]
    if (candidate !== undefined && candidate.disabled !== true) return candidate
  }
  return undefined
}

export interface SegmentedProps<Value extends string> {
  value: Value
  options: readonly SegmentedOption<Value>[]
  onChange: (next: Value) => void
  /** 读屏名（这一组在切什么）。 */
  label: string
  disabled?: boolean
  className?: string
}

export function Segmented<Value extends string>({
  value, options, onChange, label, disabled = false, className,
}: SegmentedProps<Value>) {
  const selected = options.findIndex((option) => option.value === value)

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>): void => {
    if (!isWalkKey(event.key)) return
    event.preventDefault()
    const target = walk(options, selected, event.key)
    if (target !== undefined && target.value !== value) onChange(target.value)
  }

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('inline-flex items-center gap-0.5 rounded-md bg-muted p-0.5', className)}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            title={option.hint}
            disabled={disabled || option.disabled === true}
            onClick={() => { if (!active) onChange(option.value) }}
            onKeyDown={onKeyDown}
            className={cn(
              'h-6 rounded-sm px-2 text-[11px] leading-4 whitespace-nowrap transition-colors',
              'disabled:pointer-events-none disabled:opacity-45',
              active
                ? 'bg-card font-medium text-card-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
