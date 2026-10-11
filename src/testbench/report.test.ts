/**
 * 报告格式的钉死测试。这份文本是**要贴到别处去的**——格式一漂，看的人先怀疑「工具坏了」，
 * 而不是「哪条语料坏了」。
 *
 * 断言只钉**结构**（分节顺序与各节条数、路径写全、失败附源码、空轮不出分节），
 * 不钉措辞：改一个字不该让测试变红。
 */
import { describe, expect, it } from 'vitest'
import { buildReport, type ReportCase } from './report.ts'

const item = (over: Partial<ReportCase> = {}): ReportCase => ({
  id: 'basic-circle',
  expect: 'ok',
  title: '画一个圆',
  file: 'corpus/examples/basic/01-circle.py',
  python: '"""画一个圆\n"""\nfrom manim import *\n',
  ...over,
})

const bad = item({
  id: 'reject-bad-name',
  expect: 'reject',
  title: '名字写错该被拒',
  file: 'corpus/examples/reject/01-bad-name.py',
  python: '"""名字写错该被拒\n@reject NameError\n"""\n',
})

const never = item({ id: 'ctor-vector', title: 'Vector 位置参数', file: 'corpus/examples/ctor/05-vector.py' })

const cases = [item(), bad, never]

/** 固定时刻：报告里那行时间是「现在」，不冻住就没法断言。 */
const AT = new Date('2026-10-11T09:00:00+08:00')

/** 各分节标题（`## ` 开头）里括号中的条数，按出现顺序。 */
const sectionCounts = (text: string): string[] =>
  text
    .split('\n')
    .filter((line) => line.startsWith('## '))
    .map((line) => line.match(/（(\d+)）/)?.[1] ?? '')

/** 某个分节标题到下一个分节标题之间的正文。 */
const sectionOf = (text: string, index: number): string => {
  const heads = text.split('\n').map((line, at) => (line.startsWith('## ') ? at : -1)).filter((at) => at >= 0)
  const lines = text.split('\n')
  const from = heads[index]!
  const to = heads[index + 1] ?? lines.length
  return lines.slice(from, to).join('\n')
}

describe('buildReport', () => {
  it('一条都没跑：不出分节，只有一句话交代', () => {
    const text = buildReport({ cases, results: {}, now: AT })
    expect(sectionCounts(text)).toEqual([])
    expect(text.split('\n').filter((line) => line !== '')).toHaveLength(3) // 标题 / 时间 / 那句交代
    expect(text).toContain(AT.toLocaleString('zh-CN'))
  })

  it('分节顺序是「未通过 → 通过 → 未跑」，最该看的排最前', () => {
    const text = buildReport({
      cases,
      now: AT,
      results: {
        'basic-circle': { ok: false, text: 'TypeError: boom' },
        'reject-bad-name': { ok: false, text: 'NameError: name X is not defined' },
      },
    })
    expect(sectionCounts(text)).toEqual(['1', '1', '1'])
    expect(sectionOf(text, 0)).toContain('basic-circle')
    expect(sectionOf(text, 1)).toContain('reject-bad-name') // 被拒掉 = 通过
    expect(sectionOf(text, 2)).toContain('ctor-vector')
  })

  it('每条都带文件路径，失败的还带报错原文', () => {
    const text = buildReport({ cases, now: AT, results: { 'basic-circle': { ok: false, text: 'TypeError: boom' } } })
    expect(text).toContain('corpus/examples/basic/01-circle.py')
    expect(text).toContain('TypeError: boom')
    // 没跑的那条也要出现（在「未跑」节里），否则报告看着像只有两条语料
    expect(text).toContain('ctor-vector')
    expect(text).toContain('corpus/examples/ctor/05-vector.py')
  })

  it('失败的附上完整源码，且用 python 围栏', () => {
    const text = buildReport({ cases, now: AT, results: { 'basic-circle': { ok: false, text: 'boom' } } })
    expect(text).toContain('```python')
    expect(text).toContain('# corpus/examples/basic/01-circle.py')
    expect(text).toContain('from manim import *')
  })

  it('没有未通过时那一节整个不出现（不留一个空标题）', () => {
    const text = buildReport({ cases, now: AT, results: { 'reject-bad-name': { ok: false, text: 'NameError' } } })
    expect(sectionCounts(text)).toEqual(['1', '2'])
    expect(sectionOf(text, 0)).toContain('reject-bad-name')
    expect(text).not.toContain('```python')
  })

  it('总计排在分节之前（先看全局，再看逐条）', () => {
    const text = buildReport({ cases, now: AT, results: { 'basic-circle': { ok: false, text: 'boom' } } })
    const before = text.slice(0, text.indexOf('\n## '))
    expect(before.split('\n').filter((line) => line !== '')).toHaveLength(3) // 标题 / 时间 / 总计
    expect(before).toContain('3') // 总条数
  })
})
