/**
 * 报告格式的钉死测试。理由：这份文本是**要贴到别处去的**——一旦格式漂了，
 * 看的人先怀疑「是不是工具坏了」，而不是「哪条语料坏了」。所以分节顺序、路径写全、
 * 失败附源码这三件事都钉住。
 */
import { describe, expect, it } from 'vitest'
import type { Corpus, ManimExample } from 'manim-live'
import { buildReport } from './report.ts'
import { T } from './i18n.ts'

const example = (over: Partial<ManimExample> = {}): ManimExample => ({
  id: 'basic-circle',
  group: 'basic',
  file: 'corpus/examples/basic/01-circle.py',
  title: '画一个圆',
  expect: 'ok',
  python: '"""画一个圆\n"""\nfrom manim import *\n',
  ...over,
})

const bad = example({
  id: 'reject-bad-name',
  group: 'reject',
  file: 'corpus/examples/reject/01-bad-name.py',
  title: '名字写错该被拒',
  expect: 'reject',
  python: '"""名字写错该被拒\n@reject NameError\n"""\n',
})

const never = example({ id: 'ctor-vector', group: 'ctor', file: 'corpus/examples/ctor/05-vector.py', title: 'Vector 位置参数' })

const corpus: Corpus = {
  groups: [
    { id: 'basic', title: '基础几何' },
    { id: 'ctor', title: '构造器参数' },
    { id: 'reject', title: '应当被当场拒绝' },
  ],
  examples: [example(), bad, never],
}

/** 固定时刻：报告里那行时间是「现在」，不冻住就没法断言。 */
const AT = new Date('2026-10-11T09:00:00+08:00')

describe('buildReport', () => {
  it('一条都没跑：只有标题、时间与一句「还没跑过」', () => {
    const text = buildReport({ corpus, results: {}, now: AT })
    expect(text.split('\n')).toEqual([
      T.reportTitle,
      T.reportTime(AT.toLocaleString('zh-CN')),
      '',
      T.reportEmpty,
    ])
  })

  it('分节顺序是「未通过 → 通过 → 未跑」，最该看的排最前', () => {
    const text = buildReport({
      corpus,
      now: AT,
      results: {
        'basic-circle': { ok: false, text: 'TypeError: boom' },
        'reject-bad-name': { ok: false, text: 'NameError: name X is not defined' },
      },
    })
    const heads = text.split('\n').filter((line) => line.startsWith('## '))
    expect(heads).toEqual([T.reportFailed(1), T.reportPassed(1), T.reportUntried(1)])
    expect(text).toContain(T.reportSummary(3, 2, 1, 1))
  })

  it('每条都带文件路径，失败的还带报错原文', () => {
    const text = buildReport({ corpus, now: AT, results: { 'basic-circle': { ok: false, text: 'TypeError: boom' } } })
    expect(text).toContain('corpus/examples/basic/01-circle.py')
    expect(text).toContain(T.reportError('TypeError: boom'))
    // 没跑的那条也要出现（在「未跑」节里），否则报告看着像只有两条语料
    expect(text).toContain('[ctor-vector] Vector 位置参数 — corpus/examples/ctor/05-vector.py')
  })

  it('失败的附上完整源码，且用 python 代码块', () => {
    const text = buildReport({ corpus, now: AT, results: { 'basic-circle': { ok: false, text: 'boom' } } })
    expect(text).toContain(T.reportSource)
    expect(text).toContain('# corpus/examples/basic/01-circle.py')
    expect(text).toContain('```python')
    expect(text).toContain('from manim import *')
  })

  it('reject 组被成功拒掉时进「通过」节，不进「未通过」', () => {
    const text = buildReport({ corpus, now: AT, results: { 'reject-bad-name': { ok: false, text: 'NameError' } } })
    const failedHead = text.indexOf(T.reportFailed(1))
    expect(failedHead).toBe(-1) // 一条都没未通过 → 这一节整个不出现
    expect(text).toContain(T.reportPassed(1))
    expect(text).toContain('[reject-bad-name]')
  })
})
