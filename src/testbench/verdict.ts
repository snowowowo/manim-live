/**
 * 判定与统计：一批用例跑完之后，「哪条算通过、哪条还没跑」的**唯一口径**。
 *
 * 为什么在核心包而不在某个页面里：这条口径有两个消费者——本仓演示台的那 239 条语料，
 * 与下游使用者自带的内置样例集。各写一份的结果是同一条规则两处实现，而它偏偏是
 * 最容易被「优化掉」的那条（见 verdict.test.ts 顶注）。
 *
 * 纯函数、只 import 类型：不碰 DOM 也不碰 `node:`，所以浏览器入口与 Node 入口都能出。
 * 用例形状按**最小需求**定（`id` + `expect`），核心包的 `ManimExample` 与使用者自己的
 * 样例类型都天然满足，不必为了判定去适配彼此的字段名。
 */
import type { ExampleExpect } from '../py/examples.ts'

/** 一条待判定的用例。 */
export interface VerdictCase {
  id: string
  /** 期望结论：跑通算通过（`ok`），还是当场被拒才算通过（`reject`）。 */
  expect: ExampleExpect
}

/**
 * 一次运行的结论。判定只看 `ok`；`text`（报错原文）只有报告要用，所以可选——
 * 只记红绿的消费者不必为了判定去存一段文本。
 */
export interface CaseResult {
  ok: boolean
  text?: string
}

/** 一条用例在清单上的三态：没跑 / 通过 / 未通过。 */
export type CaseState = 'idle' | 'ok' | 'fail'

/**
 * 是否符合预期。**`reject` 的「失败」才是通过**——那条验的就是「当场拒掉、且说得清」，
 * 跑通了反而说明拦截失效了。红绿点、续跑、「通过 N 条」全走这一个判据。
 */
export function isPassed(item: VerdictCase, result: CaseResult | undefined): boolean {
  if (result === undefined) return false
  return item.expect === 'reject' ? !result.ok : result.ok
}

/** 清单上的三态（红绿点与徽章读它）。 */
export function stateOf(item: VerdictCase, result: CaseResult | undefined): CaseState {
  if (result === undefined) return 'idle'
  return isPassed(item, result) ? 'ok' : 'fail'
}

export interface Tally<C extends VerdictCase = VerdictCase> {
  /** 有结果的条数（不管过没过）。 */
  tried: number
  /** 有结果且未通过的条数。 */
  failed: number
  /** 尚未通过（含从没跑过的）——「全部渲染」要跑的就是这一批：跑挂的也要重跑。 */
  pending: C[]
  /**
   * **从没跑过**的（一条结果都没有）。与 `pending` 差在「跑挂的」那几条。
   *
   * 为什么报告用这一条而不是 `pending`：用 pending 会让一条跑挂的用例**同时出现在
   * 「未通过」和「未跑」两节里**——看报告的人第一反应是「怎么重复了」，第二反应是
   * 「是不是工具算错了」。两节分别对应「该修代码」与「还没验」，含义不同，就不该重叠。
   */
  untried: C[]
}

export function tally<C extends VerdictCase>(items: readonly C[], results: Record<string, CaseResult>): Tally<C> {
  const tried = items.filter((item) => results[item.id] !== undefined)
  return {
    tried: tried.length,
    failed: tried.filter((item) => !isPassed(item, results[item.id])).length,
    pending: items.filter((item) => !isPassed(item, results[item.id])),
    untried: items.filter((item) => results[item.id] === undefined),
  }
}
