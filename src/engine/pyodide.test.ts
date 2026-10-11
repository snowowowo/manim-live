/**
 * Pyodide 加载器：注入 <script> 再 loadPyodide({ indexURL })。
 *
 * 为什么值得测：这条是「第一次真跑 Python」的必经之路，且**幂等性**很要紧——
 * 重复调用若重置了已缓存的运行时实例，每段代码都会重新拉一遍 13MB 核心。
 * 三种失败（脚本拉不下来 / 脚本在但没暴露 loadPyodide / 重复调用）都在这里钉住。
 * 另外钉住**地址参数化**：indexURL 由调用方给（不再写死宿主路径），末尾斜杠要补。
 *
 * 不需要真 DOM：document 是替身，loadPyodide 也是替身（真加载是几分钟级的集成测试）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('../py/runtime.ts', () => ({ setPyodideLoader: vi.fn(), setPackageDiagnoser: vi.fn() }))

interface FakeScript {
  src: string
  onload: (() => void) | null
  onerror: (() => void) | null
}

/** 装一个受控的 document.head：append 时按 `outcome` 决定触发 onload 还是 onerror。 */
function stubDom(outcome: 'load' | 'error' | 'silent') {
  const appended: FakeScript[] = []
  vi.stubGlobal('document', {
    createElement: () => ({ src: '', onload: null, onerror: null }) as FakeScript,
    head: {
      append: (script: FakeScript) => {
        appended.push(script)
        if (outcome === 'silent') return
        queueMicrotask(() => (outcome === 'load' ? script.onload?.() : script.onerror?.()))
      },
    },
  })
  return appended
}

/** 每个用例都要一份**全新的模块状态**（currentIndexURL / scriptPromise 是模块级变量）。 */
async function fresh() {
  vi.resetModules()
  // 顺序 import：并发时两边可能各实例化一份 runtime，拿到的就不是同一个 mock 了
  const runtime = await import('../py/runtime.ts')
  const loader = await import('./pyodide')
  return {
    install: loader.installPyodideLoader,
    registered: vi.mocked(runtime.setPyodideLoader),
    diagnosed: vi.mocked(runtime.setPackageDiagnoser),
  }
}

/** 注册进去的那个加载器（最后一次 setPyodideLoader 的入参）。 */
function lastLoader(registered: ReturnType<typeof vi.fn>): () => Promise<unknown> {
  const call = registered.mock.calls.at(-1)
  if (call === undefined) throw new Error('没有注册加载器')
  return call[0] as () => Promise<unknown>
}

/** 注册进去的那个诊断器（最后一次 setPackageDiagnoser 的入参）。 */
function lastDiagnoser(diagnosed: ReturnType<typeof vi.fn>): (names: string[]) => Promise<string | null> {
  const call = diagnosed.mock.calls.at(-1)
  if (call === undefined) throw new Error('没有登记诊断器')
  return call[0] as (names: string[]) => Promise<string | null>
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('installPyodideLoader', () => {
  it('幂等：同一地址重复调用只登记一次（不能重置已缓存的运行时实例）', async () => {
    const { install, registered } = await fresh()
    install('/pyodide/')
    install('/pyodide/')
    install('/pyodide/')
    expect(registered).toHaveBeenCalledTimes(1)
  })

  it('注入 <script> 后 loadPyodide 拿到的 indexURL 就是配置里的地址（末尾带斜杠）', async () => {
    const appended = stubDom('load')
    const loaded: Array<{ indexURL: string }> = []
    vi.stubGlobal('loadPyodide', (options: { indexURL: string }) => {
      loaded.push(options)
      return Promise.resolve({ marker: 'runtime' })
    })
    const { install, registered } = await fresh()
    install('/dsh-plugins/manim-live/pyodide') // 故意不给尾斜杠：应当被补上
    await expect(lastLoader(registered)()).resolves.toEqual({ marker: 'runtime' })
    expect(appended).toHaveLength(1)
    expect(appended[0]!.src).toBe('/dsh-plugins/manim-live/pyodide/pyodide.js')
    expect(loaded).toEqual([{ indexURL: '/dsh-plugins/manim-live/pyodide/' }])
    expect(loaded[0]!.indexURL.endsWith('/')).toBe(true)
  })

  it('不给地址就用官方 CDN 默认值', async () => {
    const appended = stubDom('load')
    vi.stubGlobal('loadPyodide', () => Promise.resolve({ marker: 'runtime' }))
    const { install, registered } = await fresh()
    install()
    await lastLoader(registered)()
    expect(appended[0]!.src).toContain('cdn.jsdelivr.net/pyodide/')
  })

  it('地址变了才重新登记（多实例挂不同资源时才需要）', async () => {
    const { install, registered } = await fresh()
    install('/a/')
    install('/a/')
    expect(registered).toHaveBeenCalledTimes(1)
    install('/b/')
    expect(registered).toHaveBeenCalledTimes(2)
  })

  it('脚本只拉一次：连调两次加载器不会插第二个 <script>', async () => {
    const appended = stubDom('load')
    vi.stubGlobal('loadPyodide', () => Promise.resolve({ marker: 'runtime' }))
    const { install, registered } = await fresh()
    install('/pyodide/')
    const load = lastLoader(registered)
    await load()
    await load()
    expect(appended).toHaveLength(1)
  })

  it('脚本拉不下来 → 报错里带 src（不然只看到一句没头没尾的失败）', async () => {
    stubDom('error')
    const { install, registered } = await fresh()
    install('/pyodide/')
    await expect(lastLoader(registered)()).rejects.toThrow('/pyodide/pyodide.js')
  })

  it('脚本在但没暴露 loadPyodide → 明确报出这一点', async () => {
    stubDom('load')
    const { install, registered } = await fresh()
    install('/pyodide/')
    await expect(lastLoader(registered)()).rejects.toThrow('loadPyodide')
  })
})

/**
 * 诊断器：它存在的唯一理由是**「Failed to fetch」这句话本身没有信息**。
 *
 * 浏览器侧取 wheel 带 SRI 校验，「文件不在（404 空 body）」与「网络不通」抛的是同一句话
 * （真机四路对照见 `_tmp/probe-sri.mjs`），所以必须补问一次才分得清。
 * 这几条断言不检查措辞，只钉住**分档**：缺文件 / 连不上 / 字节对不上，三种话不能混。
 */
describe('取包失败诊断：把 Failed to fetch 分成人话', () => {
  /** 只按 URL 给答案的 fetch 替身：lock 一种答法，wheel 探测另一种。 */
  function stubFetch(lock: unknown | 'throw' | 'notFound', probe: (url: string) => number | 'throw') {
    const seen: string[] = []
    vi.stubGlobal('fetch', async (url: string) => {
      seen.push(url)
      if (url.endsWith('pyodide-lock.json')) {
        if (lock === 'throw') throw new TypeError('Failed to fetch')
        if (lock === 'notFound') return { ok: false, status: 404 }
        return { ok: true, status: 200, json: async () => lock }
      }
      const status = probe(url)
      if (status === 'throw') throw new TypeError('Failed to fetch')
      return { ok: true, status }
    })
    return seen
  }

  const LOCK = {
    packages: {
      pandas: { name: 'pandas', file_name: 'pandas-2.2.3-x.whl' },
      // 键是 `pillow` 而 name 字段是 `Pillow`——lock 里 21 条这样，两边都要能对上
      Pillow: { name: 'Pillow', file_name: 'pillow-10.2.0-x.whl' },
      numpy: { name: 'numpy', file_name: 'numpy-2.0.2-x.whl' },
    },
  }

  it('地址下没有这些文件 → 这么说；包名按归一化对上（键与 name 字段都认）', async () => {
    const seen = stubFetch(LOCK, () => 404)
    const { install, diagnosed } = await fresh()
    install('/pyodide')
    const message = await lastDiagnoser(diagnosed)(['pandas', 'pillow'])
    expect(seen).toEqual(['/pyodide/pyodide-lock.json', '/pyodide/pandas-2.2.3-x.whl', '/pyodide/pillow-10.2.0-x.whl'])
    expect(message).toContain('真因多半不是网络')
    expect(message).toContain('pandas-2.2.3-x.whl')
    expect(message).toContain('pillow-10.2.0-x.whl')
  })

  it('连不上地址 → 点出「浏览器不会回落 CDN」这条，别让人去查网络', async () => {
    stubFetch('throw', () => 404)
    const { install, diagnosed } = await fresh()
    install('/pyodide/')
    const message = await lastDiagnoser(diagnosed)(['pandas'])
    expect(message).toContain('连不上')
    expect(message).toContain('不会回落官方 CDN')
  })

  it('lock 读不到 → 说的是「这个地址不像一份发行版」，不是「网络」', async () => {
    stubFetch('notFound', () => 404)
    const { install, diagnosed } = await fresh()
    install('/pyodide/')
    const message = await lastDiagnoser(diagnosed)(['pandas'])
    expect(message).toContain('pyodide-lock.json 读不到')
    expect(message).toContain('404')
  })

  it('代取的那一头自己报了错（5xx）→ 转述它的原话，不能说成「目录里缺文件」', async () => {
    vi.stubGlobal('fetch', async (url: string) => {
      if (url.endsWith('pyodide-lock.json')) return { ok: true, status: 200, json: async () => LOCK }
      return {
        ok: false,
        status: 502,
        text: async () =>
          '回源取不到 https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pandas-2.2.3-x.whl（试了 3 次，最后一次：fetch failed）',
      }
    })
    const { install, diagnosed } = await fresh()
    install('/pyodide/')
    const message = await lastDiagnoser(diagnosed)(['pandas'])
    expect(message).toContain('HTTP 502')
    expect(message).toContain('试了 3 次')
    expect(message).not.toContain('真因多半不是网络')
  })

  it('文件在、HTTP 也正常 → 只剩「字节与 sha256 对不上」这一种解释', async () => {
    stubFetch(LOCK, () => 200)
    const { install, diagnosed } = await fresh()
    install('/pyodide/')
    const message = await lastDiagnoser(diagnosed)(['pandas'])
    expect(message).toContain('sha256 对不上')
    expect(message).toContain('SRI')
  })

  it('包名一个都对不上 lock → 返 null（说不出更多就别瞎猜）', async () => {
    stubFetch(LOCK, () => 404)
    const { install, diagnosed } = await fresh()
    install('/pyodide/')
    await expect(lastDiagnoser(diagnosed)(['tensorflow'])).resolves.toBeNull()
  })

  it('探测个数有上限：缺再多也只探前几个（成因必然一致）', async () => {
    const many = {
      packages: Object.fromEntries(
        ['p0', 'p1', 'p2', 'p3', 'p4', 'p5'].map((key) => [key, { name: key, file_name: `${key}-x.whl` }]),
      ),
    }
    const seen = stubFetch(many, () => 404)
    const { install, diagnosed } = await fresh()
    install('/pyodide/')
    const message = await lastDiagnoser(diagnosed)(['p0', 'p1', 'p2', 'p3', 'p4', 'p5'])
    expect(seen).toHaveLength(1 + 4)
    expect(message).toContain('等 6 个')
  })

  it('用 GET 探、不用 HEAD——宿主那条资源路由只放行 GET，HEAD 会把「文件在」误报成「没有」', async () => {
    const methods: Array<string | undefined> = []
    vi.stubGlobal('fetch', async (url: string, init?: { method?: string }) => {
      if (url.endsWith('pyodide-lock.json')) return { ok: true, status: 200, json: async () => LOCK }
      methods.push(init?.method)
      return { ok: true, status: 404 }
    })
    const { install, diagnosed } = await fresh()
    install('/pyodide/')
    await lastDiagnoser(diagnosed)(['pandas'])
    expect(methods).toEqual([undefined])
  })
})
