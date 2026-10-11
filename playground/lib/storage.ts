/**
 * 页面状态的落盘：逐条结果、极速开关、自定义代码、当前视图 / 版式 / 主题 / 筛选、人工标注。
 *
 * 为什么要存：一轮「全部渲染」要跑两百多条，中途崩了或者刷新了不该从头再来；
 * 而 239 条语料翻着看本身就很费劲，视图与筛选留在原处能省下每次重找。
 *
 * localStorage 是**不可信输入**（用户改得动、旧版本写的也可能对不上），所以读的时候逐字段校验，
 * 坏数据一律当没存过——宁可丢一次进度，也不能拿脏数据把页面搞崩。
 * 语料集合会变，认不出的 id 在读出来之后由 app 按当前语料表过滤（这里只管形状）。
 *
 * 键名与插件（DSH 实验场）**故意不同**：两边将来可能同源，混着用会让「清一边」看着像没生效。
 */
import type { CardResult, GroundFilter, GroundView, LayoutMode, ManualMark, ThemeMode } from './types.ts'

const GROUND_KEY = 'manim-live.playground.v1'
const MARKS_KEY = 'manim-live.playground.marks.v1'

export interface GroundState {
  results: Record<string, CardResult>
  fast: boolean
  source: string
  view: GroundView
  layout: LayoutMode
  theme: ThemeMode
  filter: GroundFilter
}

/** 一条结果必须是 `{ ok: boolean, text: string }`；其余形状丢掉。 */
function readResult(value: unknown): CardResult | null {
  if (value === null || typeof value !== 'object') return null
  const bag = value as Record<string, unknown>
  if (typeof bag.ok !== 'boolean' || typeof bag.text !== 'string') return null
  return { ok: bag.ok, text: bag.text }
}

const oneOf = <Value extends string>(
  value: unknown,
  allowed: readonly Value[],
): Value | undefined => (allowed.includes(value as Value) ? value as Value : undefined)

const VIEWS = ['examples', 'free'] as const
const LAYOUTS = ['list', 'gallery', 'docs'] as const
const THEMES = ['dark', 'light'] as const
const FILTERS = ['all', 'pending', 'failed', 'passed'] as const

/** 读回已保存的部分状态；没存过或存坏了都给空对象（调用方各自取默认值）。 */
export function loadGround(): Partial<GroundState> {
  try {
    const raw = window.localStorage.getItem(GROUND_KEY)
    if (raw === null) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return {}
    const bag = parsed as Record<string, unknown>
    const out: Partial<GroundState> = {}
    if (bag.results !== null && typeof bag.results === 'object') {
      const results: Record<string, CardResult> = {}
      for (const [id, value] of Object.entries(bag.results as Record<string, unknown>)) {
        const result = readResult(value)
        if (result !== null) results[id] = result
      }
      out.results = results
    }
    if (typeof bag.fast === 'boolean') out.fast = bag.fast
    if (typeof bag.source === 'string') out.source = bag.source
    const view = oneOf(bag.view, VIEWS)
    if (view !== undefined) out.view = view
    const layout = oneOf(bag.layout, LAYOUTS)
    if (layout !== undefined) out.layout = layout
    const theme = oneOf(bag.theme, THEMES)
    if (theme !== undefined) out.theme = theme
    const filter = oneOf(bag.filter, FILTERS)
    if (filter !== undefined) out.filter = filter
    return out
  } catch (error) {
    console.error('[manim-live] 读取 playground 记录失败:', error)
    return {}
  }
}

export function saveGround(state: GroundState): void {
  try {
    window.localStorage.setItem(GROUND_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('[manim-live] 保存 playground 记录失败:', error)
  }
}

export function clearGround(): void {
  try {
    window.localStorage.removeItem(GROUND_KEY)
  } catch (error) {
    console.error('[manim-live] 清除 playground 记录失败:', error)
  }
}

/**
 * 人工验证标注：人对着动画看完之后自己标「对 / 不对」。
 *
 * 与自动结果**分开存、分开清**——自动结果只说明「没炸」，画得对不对只有人看得出来；
 * 「清除记录」时也不能把人工的审计进度一起抹掉。形状校验同上：坏条目丢掉，不牵连别的。
 */
export function loadMarks(): Record<string, ManualMark> {
  try {
    const raw = window.localStorage.getItem(MARKS_KEY)
    if (raw === null) return {}
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return {}
    const out: Record<string, ManualMark> = {}
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      const mark = oneOf(value, ['pass', 'fail'] as const)
      if (mark !== undefined) out[id] = mark
    }
    return out
  } catch (error) {
    console.error('[manim-live] 读取人工标注失败:', error)
    return {}
  }
}

export function saveMarks(marks: Record<string, ManualMark>): void {
  try {
    window.localStorage.setItem(MARKS_KEY, JSON.stringify(marks))
  } catch (error) {
    console.error('[manim-live] 保存人工标注失败:', error)
  }
}

/** 只清人工标注——自动渲染结果不动。 */
export function clearMarks(): void {
  try {
    window.localStorage.removeItem(MARKS_KEY)
  } catch (error) {
    console.error('[manim-live] 清除人工标注失败:', error)
  }
}
