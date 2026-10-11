/**
 * 判定口径的钉死测试。
 *
 * `reject` 的反向判据是最容易被「优化掉」的一条：某人看到「应当被当场拒绝」那一组全线飘红，
 * 顺手把判据改成 `result.ok` 就一片绿了——那一改等于把整组拦截测试全部失效，而且看不出来。
 *
 * 用例形状故意**不用**核心包自己的 `ManimExample`：这套判定要同时服务两种消费者
 * （核心包的语料条目、使用者自带的内置样例），所以这里既验最小形状，也验多带字段的形状。
 */
import { describe, expect, it } from 'vitest'
import { isPassed, stateOf, tally, type VerdictCase } from './verdict.ts'

const pass = (id: string): VerdictCase => ({ id, expect: 'ok' })
const rejected = (id: string): VerdictCase => ({ id, expect: 'reject' })

describe('isPassed', () => {
  it('普通条目：跑通才算通过', () => {
    expect(isPassed(pass('a'), { ok: true })).toBe(true)
    expect(isPassed(pass('a'), { ok: false, text: '炸了' })).toBe(false)
  })

  it('没跑过一律不算通过（否则「全部渲染」会永远跳过它）', () => {
    expect(isPassed(pass('a'), undefined)).toBe(false)
    expect(isPassed(rejected('r'), undefined)).toBe(false)
  })

  it('reject 反过来：失败才算通过', () => {
    expect(isPassed(rejected('r'), { ok: false, text: 'NameError' })).toBe(true)
    expect(isPassed(rejected('r'), { ok: true })).toBe(false)
  })

  it('用例多带字段也照判（使用者自己的样例形状）', () => {
    const sample = { id: 's', expect: 'reject' as const, title: '坏代码', python: 'x()' }
    expect(isPassed(sample, { ok: false })).toBe(true)
    expect(isPassed(sample, { ok: true })).toBe(false)
  })
})

describe('stateOf', () => {
  it('三态：没跑 / 通过 / 未通过', () => {
    expect(stateOf(pass('a'), undefined)).toBe('idle')
    expect(stateOf(pass('a'), { ok: true })).toBe('ok')
    expect(stateOf(pass('a'), { ok: false })).toBe('fail')
  })

  it('reject 被拒掉是 ok（绿点），跑通了才是 fail（红点）', () => {
    expect(stateOf(rejected('r'), { ok: false })).toBe('ok')
    expect(stateOf(rejected('r'), { ok: true })).toBe('fail')
  })
})

describe('tally', () => {
  const items = [pass('basic-circle'), rejected('reject-bad-name'), pass('ctor-vector')]
  const results = {
    'basic-circle': { ok: true },
    'reject-bad-name': { ok: false, text: 'NameError' },
  }

  it('已跑 / 未通过 / 待跑三样都算对', () => {
    const out = tally(items, results)
    expect(out.tried).toBe(2)
    expect(out.failed).toBe(0) // reject 那条被拒掉，算通过
    expect(out.pending.map((item) => item.id)).toEqual(['ctor-vector'])
  })

  it('reject 跑通了要计进未通过、并回到待跑队列', () => {
    const out = tally(items, { ...results, 'reject-bad-name': { ok: true } })
    expect(out.tried).toBe(2)
    expect(out.failed).toBe(1)
    expect(out.pending.map((item) => item.id)).toEqual(['reject-bad-name', 'ctor-vector'])
  })

  it('一条都没跑时待跑 = 全部', () => {
    const out = tally(items, {})
    expect(out).toMatchObject({ tried: 0, failed: 0 })
    expect(out.pending).toHaveLength(3)
  })

  it('待跑与未跑不重叠：跑挂的那条只进待跑，不进未跑', () => {
    const out = tally(items, { 'basic-circle': { ok: false, text: 'boom' } })
    expect(out.pending.map((item) => item.id)).toEqual(['basic-circle', 'reject-bad-name', 'ctor-vector'])
    expect(out.untried.map((item) => item.id)).toEqual(['reject-bad-name', 'ctor-vector'])
  })

  it('结果里有认不出的 id（用例已删）不影响计数', () => {
    const out = tally(items, { ...results, 'gone-example': { ok: false } })
    expect(out).toMatchObject({ tried: 2, failed: 0 })
  })
})
