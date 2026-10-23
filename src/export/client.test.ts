/**
 * 导出取数的形状校验：这些响应都来自 Host 半边，但**不可信**的程度不比 localStorage 低——
 * 版本对不上（包与宿主半边更新不同步）、中间层塞了错误页，任何一段都可能变样。
 * 这里钉住「形状不对时怎么办」：读不通的都往**保守那一侧**倒（就绪 = 不可用、
 * 定位 = 失败），宁可按钮灰着、宁可说打不开，也不放行一个说不清的动作。
 * 网络一律打桩。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createExportClient, parseReadiness, parseReveal } from './client.ts'

const client = createExportClient({ exportUrl: '/test/export' })

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

const respond = (body: unknown, init?: { ok?: boolean; status?: number }): ReturnType<typeof vi.fn> => {
  const spy = vi.fn(() =>
    Promise.resolve({ ok: init?.ok ?? true, status: init?.status ?? 200, json: () => Promise.resolve(body) }),
  )
  vi.stubGlobal('fetch', spy)
  return spy
}

describe('parseReadiness', () => {
  it('正常形状：ready 与缺什么', () => {
    expect(parseReadiness({ ready: false, missing: [{ id: 'ffmpeg', detail: 'PATH 里找不到 ffmpeg' }] })).toEqual({
      ready: false,
      missing: [{ id: 'ffmpeg', detail: 'PATH 里找不到 ffmpeg' }],
    })
  })

  it('ready 不是布尔就当形状不对（回 null，调用方按「不可用」处理）', () => {
    for (const payload of [null, 'x', 42, {}, { ready: 'yes' }, { missing: [] }]) {
      expect(parseReadiness(payload), JSON.stringify(payload)).toBeNull()
    }
  })

  it('missing 里的坏条目丢掉、不牵连好的', () => {
    expect(
      parseReadiness({
        ready: false,
        missing: [{ id: 'latex', detail: '没装' }, { detail: '少了 id' }, null, 42],
      }),
    ).toEqual({ ready: false, missing: [{ id: 'latex', detail: '没装' }] })
  })

  it('missing 缺省时给空表（ready=true 那一路就是不带 missing 的）', () => {
    expect(parseReadiness({ ready: true })).toEqual({ ready: true, missing: [] })
  })
})

describe('parseReveal', () => {
  it('成功与三类失败都认得', () => {
    expect(parseReveal({ ok: true })).toMatchObject({ ok: true, code: '' })
    for (const code of ['missing', 'outside', 'failed']) {
      expect(parseReveal({ ok: false, code, error: '原因' })).toEqual({ ok: false, code, error: '原因' })
    }
  })

  it('形状不对按「命令跑失败」处理，不谎称文件还在', () => {
    for (const payload of [null, 'x', 42, {}, { ok: 'yes' }]) {
      expect(parseReveal(payload), JSON.stringify(payload)).toMatchObject({ ok: false, code: 'failed' })
    }
  })

  it('失败但认不出原因：归到 failed（页面只说「打不开」，不去猜是哪种打不开）', () => {
    expect(parseReveal({ ok: false, code: 'wat', error: 'x' })).toEqual({ ok: false, code: 'failed', error: 'x' })
    expect(parseReveal({ ok: false, error: 'x' })).toEqual({ ok: false, code: 'failed', error: 'x' })
  })
})

describe('取数：三条接口的发法（地址由调用方注入）', () => {
  it('loadExportReadiness：GET …/ready，非 2xx 抛', async () => {
    const spy = respond({ ready: true })
    expect(await client.loadExportReadiness()).toEqual({ ready: true, missing: [] })
    expect(spy.mock.calls[0]![0]).toBe('/test/export/ready')
    respond(null, { ok: false, status: 500 })
    await expect(client.loadExportReadiness()).rejects.toThrow('HTTP 500')
  })

  it('requestExport：POST 到导出地址，体里带源码', async () => {
    const spy = respond({ ok: true, file: '/x/a.mp4', quality: 'h' })
    expect(await client.requestExport('self.wait(1)')).toEqual({ ok: true, file: '/x/a.mp4', quality: 'h' })
    const [url, init] = spy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/test/export')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual({ python: 'self.wait(1)' })
  })

  it('requestExport：带档位时把 quality 一起 POST 过去（本机那条的 -q 档）', async () => {
    const spy = respond({ ok: true, file: '/x/b.mp4', quality: 'm' })
    expect(await client.requestExport('x', { quality: 'm' })).toEqual({ ok: true, file: '/x/b.mp4', quality: 'm' })
    const [, init] = spy.mock.calls[0] as [string, RequestInit]
    expect(JSON.parse(String(init.body))).toEqual({ python: 'x', quality: 'm' })
  })

  it('requestExport：业务失败原样带回（含缺什么）', async () => {
    respond({ ok: false, reason: 'environment', error: '本机环境没有备齐', missing: [{ id: 'ffmpeg', detail: '没装' }] })
    expect(await client.requestExport('x')).toEqual({
      ok: false, reason: 'environment', error: '本机环境没有备齐', missing: [{ id: 'ffmpeg', detail: '没装' }],
    })
  })

  it('requestExport：认不出的形状要抛（不拿半个结果当成功）', async () => {
    respond({ ok: 'yes' })
    await expect(client.requestExport('x')).rejects.toThrow('形状不对')
  })

  it('revealExport：POST …/reveal，体里带路径与 checkOnly', async () => {
    const spy = respond({ ok: true })
    expect(await client.revealExport('/x/a.mp4', { checkOnly: true })).toMatchObject({ ok: true })
    const [url, init] = spy.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('/test/export/reveal')
    expect(JSON.parse(String(init.body))).toEqual({ path: '/x/a.mp4', checkOnly: true })
  })

  it('revealExport：HTTP 失败要抛（界面据此说「打不开」，不当成拒绝）', async () => {
    respond(null, { ok: false, status: 500 })
    await expect(client.revealExport('/x/a.mp4')).rejects.toThrow('HTTP 500')
  })
})
