/**
 * 判定口径的钉死测试。
 *
 * `reject` 组反向判据是这一页最反直觉、也最容易「优化掉」的一条：某天有人看到
 * 「应当被当场拒绝」那一组全线飘红，顺手把判据改成 `result.ok` 就万事大吉了——
 * 而那一改等于把 40 条拦截测试全部失效，页面上却一片绿。所以它必须有一条测试守着。
 */
import { describe, expect, it } from 'vitest'
import type { ManimExample } from 'manim-live'
import { isPassed, stateOf, tally } from './verdict.ts'

const example = (over: Partial<ManimExample> = {}): ManimExample => ({
  id: 'basic-circle',
  group: 'basic',
  file: '_dev/examples/basic/01-circle.py',
  title: '画一个圆',
  expect: 'ok',
  python: '"""画一个圆\n"""\n',
  ...over,
})

const rejected = example({
  id: 'reject-bad-name',
  group: 'reject',
  expect: 'reject',
  file: '_dev/examples/reject/01-bad-name.py',
})

describe('isPassed', () => {
  it('普通条目：跑通才算通过', () => {
    expect(isPassed(example(), { ok: true, text: '' })).toBe(true)
    expect(isPassed(example(), { ok: false, text: '炸了' })).toBe(false)
  })

  it('没跑过一律不算通过（否则「全部渲染」会跳过它）', () => {
    expect(isPassed(example(), undefined)).toBe(false)
    expect(isPassed(rejected, undefined)).toBe(false)
  })

  it('reject 组反过来：失败才算通过', () => {
    expect(isPassed(rejected, { ok: false, text: 'NameError' })).toBe(true)
    expect(isPassed(rejected, { ok: true, text: '' })).toBe(false)
  })
})

describe('stateOf', () => {
  it('三态：没跑 / 通过 / 未通过', () => {
    expect(stateOf(example(), undefined)).toBe('idle')
    expect(stateOf(example(), { ok: true, text: '' })).toBe('ok')
    expect(stateOf(example(), { ok: false, text: 'x' })).toBe('fail')
  })

  it('reject 组被拒掉是 ok（绿点），跑通了才是 fail（红点）', () => {
    expect(stateOf(rejected, { ok: false, text: 'x' })).toBe('ok')
    expect(stateOf(rejected, { ok: true, text: '' })).toBe('fail')
  })
})

describe('tally', () => {
  const items = [example(), rejected, example({ id: 'ctor-vector', group: 'ctor' })]
  const results = {
    'basic-circle': { ok: true, text: '' },
    'reject-bad-name': { ok: false, text: 'NameError' },
  }

  it('已跑 / 未通过 / 待跑三样都算对', () => {
    const out = tally(items, results)
    expect(out.tried).toBe(2)
    expect(out.failed).toBe(0) // reject 那条被拒掉，算通过
    expect(out.pending.map((item) => item.id)).toEqual(['ctor-vector'])
  })

  it('reject 组跑通了要计进未通过、并回到待跑队列', () => {
    const out = tally(items, { ...results, 'reject-bad-name': { ok: true, text: '' } })
    expect(out.tried).toBe(2)
    expect(out.failed).toBe(1)
    expect(out.pending.map((item) => item.id)).toEqual(['reject-bad-name', 'ctor-vector'])
  })

  it('一条都没跑时待跑 = 全部', () => {
    const out = tally(items, {})
    expect(out).toMatchObject({ tried: 0, failed: 0 })
    expect(out.pending).toHaveLength(3)
  })
})
