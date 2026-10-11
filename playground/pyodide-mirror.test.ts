// 镜像的规矩：谁能回源、校验不过怎么办、并发怎么办。这几条错了不会有任何人发现——
// 最坏的形态是「静默发出去一个损坏的 wheel」，到了浏览器里只会变成一句 Failed to fetch。
import { mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cachedNames,
  createPyodideMirror,
  readDigests,
  readVersion,
  sha256Hex,
  type PackageFetch,
} from './pyodide-mirror.ts'

const roots: string[] = []
function makeRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'manim-mirror-'))
  roots.push(root)
  return root
}
afterEach(() => {
  while (roots.length > 0) rmSync(roots.pop() as string, { recursive: true, force: true })
})

const HELLO = Buffer.from('a wheel, hypothetically')
const OTHER = Buffer.from('another wheel')
const HELLO_NAME = 'hello-1.0-py3-none-any.whl'
const OTHER_NAME = 'other-2.0-py3-none-any.whl'

/** 一份「上游」替身：按 URL 里的文件名给字节，并记账。 */
function fakeUpstream(files: Record<string, Buffer>): { fetchImpl: PackageFetch; seen: string[] } {
  const seen: string[] = []
  const fetchImpl = vi.fn(async (url: string) => {
    const name = url.slice(url.lastIndexOf('/') + 1)
    seen.push(name)
    const body = files[name]
    if (body === undefined) {
      return { ok: false, status: 404, arrayBuffer: async () => new ArrayBuffer(0) }
    }
    const copy = Uint8Array.from(body)
    return { ok: true, status: 200, arrayBuffer: async () => copy.buffer as ArrayBuffer }
  })
  return { fetchImpl, seen }
}

function setup() {
  const root = makeRoot()
  const localDir = join(root, 'assets', 'pyodide')
  const cacheDir = join(root, 'corpus', 'pyodide-cache')
  mkdirSync(localDir, { recursive: true })
  const digests = new Map([
    [HELLO_NAME, sha256Hex(HELLO)],
    [OTHER_NAME, sha256Hex(OTHER)],
  ])
  const upstream = fakeUpstream({ [HELLO_NAME]: HELLO, [OTHER_NAME]: OTHER })
  const mirror = createPyodideMirror({
    localDir,
    cacheDir,
    upstream: 'https://example.invalid/full/',
    digests,
    fetchImpl: upstream.fetchImpl,
  })
  return { root, localDir, cacheDir, digests, mirror, ...upstream }
}

describe('createPyodideMirror：随包目录 → 本地缓存 → 回源', () => {
  it('随包目录里有的直接发，不回源', async () => {
    const { localDir, mirror, fetchImpl } = setup()
    writeFileSync(join(localDir, HELLO_NAME), HELLO)
    const hit = await mirror.resolve(HELLO_NAME)
    expect(hit?.source).toBe('local')
    expect(hit?.buffer.equals(HELLO)).toBe(true)
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('缺的按 lock 的 sha256 回源，校验通过后落盘；第二次就不再回源', async () => {
    const { cacheDir, mirror, fetchImpl, seen } = setup()
    const first = await mirror.resolve(HELLO_NAME)
    expect(first?.source).toBe('upstream')
    expect(first?.buffer.equals(HELLO)).toBe(true)
    expect(seen).toEqual([HELLO_NAME])
    expect(readdirSync(cacheDir)).toEqual([HELLO_NAME])

    const second = await mirror.resolve(HELLO_NAME)
    expect(second?.source).toBe('cache')
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })

  it('path 指向这份字节**实际落盘的地方**——调用方拿它算 ETag，指错了就 stat 到别的文件', async () => {
    const { localDir, cacheDir, mirror } = setup()
    writeFileSync(join(localDir, HELLO_NAME), HELLO)
    expect((await mirror.resolve(HELLO_NAME))?.path).toBe(join(localDir, HELLO_NAME))
    // 回源那一趟落盘之后才有文件可 stat——所以这条路径必须指向缓存目录，不是随包目录
    expect((await mirror.resolve(OTHER_NAME))?.path).toBe(join(cacheDir, OTHER_NAME))
    expect((await mirror.resolve(OTHER_NAME))?.path).toBe(join(cacheDir, OTHER_NAME))
  })

  it('回源取回的字节对不上 sha256 就抛，且**不落盘**', async () => {
    const root = makeRoot()
    const cacheDir = join(root, 'cache')
    const tampered = createPyodideMirror({
      localDir: join(root, 'no-local'),
      cacheDir,
      upstream: 'https://example.invalid/full/',
      digests: new Map([[HELLO_NAME, sha256Hex(HELLO)]]),
      ...fakeUpstream({ [HELLO_NAME]: Buffer.from('tampered') }),
    })
    await expect(tampered.resolve(HELLO_NAME)).rejects.toThrow(/sha256 对不上/u)
    expect(cachedNames(cacheDir)).toEqual([])
  })

  it('登记了但上游没有 → 抛 HTTP 404；压根没登记 → null', async () => {
    const { cacheDir, mirror } = setup()
    await expect(mirror.resolve('not-registered.whl')).resolves.toBeNull()

    const onlyLock = createPyodideMirror({
      localDir: '/nonexistent-local',
      cacheDir,
      upstream: 'https://example.invalid/full/',
      digests: new Map([['ghost-1.0.whl', sha256Hex(HELLO)]]),
      ...fakeUpstream({}),
    })
    await expect(onlyLock.resolve('ghost-1.0.whl')).rejects.toThrow(/HTTP 404/u)
  })

  it('连不上上游时抛原话——「取不到」和「404」要分得开', async () => {
    const root = makeRoot()
    const broken = createPyodideMirror({
      localDir: join(root, 'no-local'),
      cacheDir: join(root, 'cache'),
      upstream: 'https://example.invalid/full/',
      digests: new Map([[HELLO_NAME, sha256Hex(HELLO)]]),
      fetchImpl: async () => {
        throw new TypeError('Failed to fetch')
      },
    })
    await expect(broken.resolve(HELLO_NAME)).rejects.toThrow(/回源取不到 .*试了 3 次.*Failed to fetch/u)
  })

  it('上游抽一次风要重试——实测真撞到过（一次 fetch failed 就让整条语料挂掉）', async () => {
    const root = makeRoot()
    let calls = 0
    const flaky = createPyodideMirror({
      localDir: join(root, 'no-local'),
      cacheDir: join(root, 'cache'),
      upstream: 'https://example.invalid/full/',
      digests: new Map([[HELLO_NAME, sha256Hex(HELLO)]]),
      fetchImpl: async () => {
        calls += 1
        if (calls === 1) throw new TypeError('fetch failed')
        return { ok: true, status: 200, arrayBuffer: async () => Uint8Array.from(HELLO).buffer as ArrayBuffer }
      },
    })
    const hit = await flaky.resolve(HELLO_NAME)
    expect(hit?.source).toBe('upstream')
    expect(calls).toBe(2)
    expect(cachedNames(join(root, 'cache'))).toEqual([HELLO_NAME])
  })

  it('5xx 重试，404 不重试——前者是网络，后者是「上游也没有」', async () => {
    const root = makeRoot()
    const count = { five: 0, four: 0 }
    const make = (status: number, key: 'five' | 'four') =>
      createPyodideMirror({
        localDir: join(root, 'no-local'),
        cacheDir: join(root, `cache-${key}`),
        upstream: 'https://example.invalid/full/',
        digests: new Map([[HELLO_NAME, sha256Hex(HELLO)]]),
        fetchImpl: async () => {
          count[key] += 1
          return { ok: false, status, arrayBuffer: async () => new ArrayBuffer(0) }
        },
      })
    await expect(make(503, 'five').resolve(HELLO_NAME)).rejects.toThrow(/HTTP 503/u)
    expect(count.five).toBe(3)
    await expect(make(404, 'four').resolve(HELLO_NAME)).rejects.toThrow(/HTTP 404/u)
    expect(count.four).toBe(1)
  })

  it('不在 lock 登记表里的名字不回源——目录不完整要明确失败，别拿上游把配置错误盖住', async () => {
    const { mirror, fetchImpl } = setup()
    await expect(mirror.resolve('pyodide.asm.wasm')).resolves.toBeNull()
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(mirror.registered('pyodide.asm.wasm')).toBe(false)
    expect(mirror.registered(HELLO_NAME)).toBe(true)
  })

  it('名字带路径一律拒——路径拼接只此一处', async () => {
    const { mirror, fetchImpl } = setup()
    for (const name of ['../secret', 'a/b.whl', '..\\x', '']) {
      await expect(mirror.resolve(name)).resolves.toBeNull()
    }
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('同名并发只回源一次', async () => {
    const { mirror, fetchImpl } = setup()
    const hits = await Promise.all([
      mirror.resolve(HELLO_NAME),
      mirror.resolve(HELLO_NAME),
      mirror.resolve(HELLO_NAME),
    ])
    expect(hits.map((hit) => hit?.source)).toEqual(['upstream', 'upstream', 'upstream'])
    expect(fetchImpl).toHaveBeenCalledTimes(1)
  })
})

describe('readDigests / readVersion / cachedNames', () => {
  it('从 lock 里取「文件名 → sha256」与版本号；lock 不在就给空表 / 兜底版本', () => {
    const root = makeRoot()
    const lockPath = join(root, 'pyodide-lock.json')
    writeFileSync(
      lockPath,
      JSON.stringify({
        info: { version: '0.27.7' },
        packages: {
          numpy: { file_name: 'numpy-x.whl', sha256: 'aa' },
          broken: { file_name: 'no-hash.whl' },
          meta: { sha256: 'bb' },
        },
      }),
    )
    expect(readDigests(lockPath)).toEqual(new Map([['numpy-x.whl', 'aa']]))
    expect(readVersion(lockPath, 'fallback')).toBe('0.27.7')
    expect(readDigests(join(root, 'nope.json')).size).toBe(0)
    expect(readVersion(join(root, 'nope.json'), 'fallback')).toBe('fallback')
  })

  it('cachedNames 只报文件，不报目录名', () => {
    const root = makeRoot()
    const cacheDir = join(root, 'cache')
    mkdirSync(join(cacheDir, 'sub'), { recursive: true })
    writeFileSync(join(cacheDir, 'b.whl'), 'b')
    writeFileSync(join(cacheDir, 'a.whl'), 'a')
    expect(cachedNames(cacheDir)).toEqual(['a.whl', 'b.whl'])
    expect(cachedNames(join(root, 'nope'))).toEqual([])
  })
})
