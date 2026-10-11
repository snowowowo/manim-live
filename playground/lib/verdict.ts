/**
 * 判定与统计：**纯函数**、只 import 类型——所以它能在 Node 里直接测（不需要 DOM，也不需要拉起画布）。
 *
 * 之所以单独立一个文件而不是塞进 components：这一页最容易悄悄坏掉的就是这两条口径——
 * 「reject 组怎么算通过」与「哪些还没跑」——它们决定了清单上那些红绿点、
 * 「全部渲染」跑哪些、报告里怎么分节。埋在组件里就没人测得动了。
 */
import type { ManimExample } from 'manim-live'
import type { CardResult, GroundFilter } from './types.ts'

/**
 * 是否符合预期。**`reject` 组的「失败」才是通过**——那组语料验的就是「当场拒掉、且说得清」，
 * 跑通了反而说明拦截失效了。红绿点、续跑、「通过 N 条」全都走这一个判据。
 */
export function isPassed(example: ManimExample, result: CardResult | undefined): boolean {
  if (result === undefined) return false
  return example.expect === 'reject' ? !result.ok : result.ok
}

/** 一条都没有结果的统计（还没跑过）。 */
export interface Tally {
  /** 有结果的条数（不管过没过）。 */
  tried: number
  /** 有结果且未通过的条数。 */
  failed: number
  /** 尚未通过（含从没跑过的）——这就是「全部渲染」要跑的那一批：跑挂的也要重跑。 */
  pending: ManimExample[]
  /**
   * **从没跑过**的（一条结果都没有）。与 `pending` 差在「跑挂的」那几条。
   *
   * 为什么报告里用这一条而不是 pending：用 pending 会让一条跑挂的语料**同时出现在
   * 「未通过」和「未跑」两节里**——看报告的人第一反应是「怎么重复了」，第二反应是
   * 「是不是工具算错了」。两节分别对应「该修代码」与「还没验」，含义不同，就不该重叠。
   */
  untried: ManimExample[]
}

export function tally(examples: readonly ManimExample[], results: Record<string, CardResult>): Tally {
  const tried = examples.filter((item) => results[item.id] !== undefined)
  return {
    tried: tried.length,
    failed: tried.filter((item) => !isPassed(item, results[item.id])).length,
    pending: examples.filter((item) => !isPassed(item, results[item.id])),
    untried: examples.filter((item) => results[item.id] === undefined),
  }
}

/** 单条语料在清单上的状态（未跑 / 通过 / 未通过）——红绿点、徽章都读它。 */
export function stateOf(example: ManimExample, result: CardResult | undefined): 'idle' | 'ok' | 'fail' {
  if (result === undefined) return 'idle'
  return isPassed(example, result) ? 'ok' : 'fail'
}

/**
 * 在不在筛选里。三个维度：结果状态、关键词。
 *
 * 关键词同时打标题、id、文件名与分组——239 条里找人通常记得的是「那个圆」或者
 * 「basic/01」，或者「我记得有个 3d 的」，三种记忆方式都得能落到。
 * 关键词**不做大小写与全半角之外的模糊**：这一页要的是「精确找到」，不是搜索算法。
 */
export function matchFilter(
  example: ManimExample,
  results: Record<string, CardResult>,
  filter: GroundFilter,
  query: string,
): boolean {
  const state = stateOf(example, results[example.id])
  if (filter === 'pending' && state !== 'idle') return false
  if (filter === 'failed' && state !== 'fail') return false
  if (filter === 'passed' && state !== 'ok') return false
  const needle = query.trim().toLowerCase()
  if (needle === '') return true
  const hay = `${example.title}\n${example.id}\n${example.file}\n${example.group}`.toLowerCase()
  return hay.includes(needle)
}

/** 按分组把（筛过的）语料摊成 [组, 条目[]]，顺序跟 `Corpus.groups` 走。 */
export function groupItems(
  groups: readonly { id: string; title: string; network?: boolean }[],
  examples: readonly ManimExample[],
  keep: (example: ManimExample) => boolean,
): Array<{ id: string; title: string; network?: boolean; items: ManimExample[] }> {
  return groups
    .map((group) => ({ ...group, items: examples.filter((item) => item.group === group.id && keep(item)) }))
    .filter((group) => group.items.length > 0)
}
