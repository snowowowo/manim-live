/**
 * 清单的筛选与分组：**版式**那一半（搜索框打哪些字段、按什么顺序摊分组）。
 *
 * 判定口径不在这里——「哪条算通过」在核心包 `manim-live` 的 `isPassed` / `stateOf`，
 * 与下游使用者的样例集共用同一份（见核心包 `src/testbench/verdict.ts`）。
 */
import { stateOf, type CaseResult, type ManimExample } from 'manim-live'
import type { GroundFilter } from './types.ts'

/**
 * 在不在筛选里。两个维度：结果状态、关键词。
 *
 * 关键词同时打标题、id、文件名与分组——239 条里找人通常记得的是「那个圆」或者
 * 「basic/01」，或者「我记得有个 3d 的」，三种记忆方式都得能落到。
 * 关键词**不做大小写与全半角之外的模糊**：这一页要的是「精确找到」，不是搜索算法。
 */
export function matchFilter(
  example: ManimExample,
  results: Record<string, CaseResult>,
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
