// 开发期的 Pyodide 按需包镜像：随包目录 → 本地缓存 → 回源（校验后落盘）。
//
// 只被 `playground/vite.config.ts` 用（服务器侧），不进页面包、也不进 npm 产物。
//
// 为什么需要它——这一节是踩出来的，别删。浏览器侧 Pyodide 取 wheel 走的是：
//
//     function Cn(t,e){ let r=new URL(t,location); return {response: fetch(r, e?{integrity:e}:{})} }
//     … a = rt(file_name, n)            // n = config.indexURL
//     … s = "sha256-" + gr(pkg.sha256)  // i(gr,"base16ToBase64")
//
// 即**带 SRI 完整性校验的 fetch**，而 **CDN 回落只写在 Node 分支里**：
//
//     try { return await Ae(a,s) }
//     catch(c){ if(!h || e.channel!==this.defaultChannel) throw c;   // h = 是否 Node
//                … this.cdnURL + o … }                                // 浏览器永远走不到这里
//
// 所以浏览器的 `indexURL` 就是**唯一**取包地址，它必须真能取到东西。而我们的自托管目录
// 只随包了 numpy / sympy / mpmath 三个 wheel（随包只带高频件是 §2.4 的定案），
// 其余在 `pyodide-lock.json` 里登记着、文件却不在，于是：
//
//     GET /pyodide/pandas-….whl → 404 空 body → SRI 拿到空字节 → 判定完整性不匹配
//     → TypeError: Failed to fetch        ← 和「网络不通」长得一模一样（见 _tmp/probe-sri.mjs）
//
// 这个模块把那条断链接上。与插件仓 `src/host/pyodide.js` 那条宿主路由**同一套口径**
// （随包 → 缓存 → 回源），只是它落在开发机的 `corpus/pyodide-cache/`，
// 而宿主那条落在 `~/.dsh/cache/manim-live/pyodide`。
//
// 两点刻意的克制：
//   · **只有 lock 登记过的名字才回源**。名字对不上就 404——目录不完整这件事要继续明确地失败，
//     不能拿上游的东西把配置错误盖住；
//   · 回源失败 / 校验不过一律**抛**，不静默降级成 null。那是上游或配置的问题，得让人看见。
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

/** 回源只用到这三样，不必是完整 Response。 */
export interface PackageResponse {
  ok: boolean
  status: number
  arrayBuffer(): Promise<ArrayBuffer>
}

export type PackageFetch = (url: string) => Promise<PackageResponse>

export interface PyodideMirrorOptions {
  /** 随包目录（`assets/pyodide`，可能是软链）。 */
  localDir: string
  /** 回源落盘处。**必须在核心包自己的目录下**，别写进插件仓。 */
  cacheDir: string
  /** 上游发行通道（末尾带斜杠）。 */
  upstream: string
  /** `文件名 → sha256`，从随包 lock 读出来那份。 */
  digests: Map<string, string>
  fetchImpl?: PackageFetch
  log?: (text: string) => void
}

export interface Artifact {
  buffer: Buffer
  source: 'local' | 'cache' | 'upstream'
  /**
   * 这份字节**躺在磁盘上的哪个文件**。`upstream` 落盘之后也算有。
   *
   * 为什么要把它交出来：调用方要拿它算 ETag（`size` + `mtimeMs`）。没有它就只能从 buffer
   * 现算哈希——那意味着每次请求都对着 10 MB 的 `pyodide.asm.wasm` 算一遍。
   */
  path: string
}

/** 文件的 sha256（hex，与 `pyodide-lock.json` 的写法一致）。 */
export function sha256Hex(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

/** 从 lock 里取「文件名 → sha256」。这份表是回源校验的唯一依据。 */
export function readDigests(lockPath: string): Map<string, string> {
  const digests = new Map<string, string>()
  if (!existsSync(lockPath)) return digests
  const lock = JSON.parse(readFileSync(lockPath, 'utf8')) as {
    packages?: Record<string, { file_name?: unknown; sha256?: unknown }>
  }
  for (const entry of Object.values(lock.packages ?? {})) {
    if (typeof entry?.file_name !== 'string' || typeof entry?.sha256 !== 'string') continue
    digests.set(entry.file_name, entry.sha256)
  }
  return digests
}

/** 从 lock 里取发行版本号（拼上游地址用，免得版本号两头写、早晚漂移）。 */
export function readVersion(lockPath: string, fallback: string): string {
  if (!existsSync(lockPath)) return fallback
  const lock = JSON.parse(readFileSync(lockPath, 'utf8')) as { info?: { version?: unknown } }
  return typeof lock.info?.version === 'string' ? lock.info.version : fallback
}

/** 扁平文件名才允许取——路径拼接只此一处，先在这里堵死。 */
function isSaneName(name: string): boolean {
  return name.length > 0 && !name.includes('/') && !name.includes('\\') && !name.includes('..')
}

/** 先失败再重试：上游偶尔抽一次风（实测撞到过一次 `fetch failed`），不该让一条语料就此跑不起来。 */
const ATTEMPTS = 3

/**
 * 回源取一份东西，失败的（连不上 / 5xx）重试，**校验不过不重试**——后者重试一百次也一样，
 * 那是数据问题不是网络问题，早抛早说清。
 */
async function fetchWithRetry(
  fetchImpl: PackageFetch,
  url: string,
  name: string,
  log: (text: string) => void,
): Promise<PackageResponse> {
  let last = '未知原因'
  for (let attempt = 1; attempt <= ATTEMPTS; attempt += 1) {
    try {
      const response = await fetchImpl(url)
      if (response.ok || response.status < 500) return response
      last = `HTTP ${response.status}`
    } catch (error) {
      last = error instanceof Error ? error.message : String(error)
    }
    if (attempt < ATTEMPTS) {
      log(`回源取 ${name} 第 ${attempt} 次没成（${last}），重试`)
      await new Promise((resolve) => setTimeout(resolve, 200 * attempt))
    }
  }
  throw new Error(`回源取不到 ${url}（试了 ${ATTEMPTS} 次，最后一次：${last}）`)
}

/**
 * 造一个镜像。返回的 `resolve(name)` 是唯一入口（`source` 说明取自哪一层、`path` 指出它落盘的位置）：
 *   · `{ source: 'local' }`    —— 随包目录里就有（核心 + 三个 wheel）
 *   · `{ source: 'cache' }`    —— 上次回源留下的
 *   · `{ source: 'upstream' }` —— 本次回源取回、校验通过、已落盘
 *   · `null`                   —— 哪儿都没有，也不在 lock 登记表里（调用方按 404 处理）
 */
export function createPyodideMirror(options: PyodideMirrorOptions): {
  resolve(name: string): Promise<Artifact | null>
  registered(name: string): boolean
} {
  const { localDir, cacheDir, upstream, digests, fetchImpl = fetch, log = () => {} } = options

  /** 同名并发只回源一次（取一个包要几秒，页面里并发等它是最常见的形态）。 */
  const inflight = new Map<string, Promise<Buffer>>()

  const readIfFile = (path: string): Buffer | null => {
    if (!existsSync(path)) return null
    if (!statSync(path).isFile()) return null
    return readFileSync(path)
  }

  async function fromUpstream(name: string): Promise<Buffer> {
    const expected = digests.get(name)
    const url = upstream + name
    log(`回源取 ${name}`)
    const response = await fetchWithRetry(fetchImpl, url, name, log)
    if (!response.ok) throw new Error(`回源取 ${url} 失败：HTTP ${response.status}`)
    const buffer = Buffer.from(await response.arrayBuffer())
    const got = sha256Hex(buffer)
    if (got !== expected) {
      throw new Error(
        `回源取回的 ${name} 与 pyodide-lock.json 的 sha256 对不上（期望 ${expected?.slice(0, 12) ?? '?'}…，实得 ${got.slice(0, 12)}…）——上游这份与随包的 lock 不配套，已丢弃`,
      )
    }
    mkdirSync(cacheDir, { recursive: true })
    writeFileSync(join(cacheDir, name), buffer)
    log(`落盘 ${name}（${(buffer.length / 1048576).toFixed(1)} MB）→ ${cacheDir}`)
    return buffer
  }

  return {
    async resolve(name: string): Promise<Artifact | null> {
      if (!isSaneName(name)) return null
      const localPath = join(localDir, name)
      const local = readIfFile(localPath)
      if (local !== null) return { buffer: local, source: 'local', path: localPath }
      const cachePath = join(cacheDir, name)
      const cached = readIfFile(cachePath)
      if (cached !== null) return { buffer: cached, source: 'cache', path: cachePath }
      if (!digests.has(name)) return null
      let pending = inflight.get(name)
      if (pending === undefined) {
        pending = fromUpstream(name).finally(() => inflight.delete(name))
        inflight.set(name, pending)
      }
      return { buffer: await pending, source: 'upstream', path: cachePath }
    },
    registered(name: string): boolean {
      return digests.has(name)
    },
  }
}

/** 缓存目录里已有哪些文件（诊断用：给「这轮到底取回了哪些包」一个可查的落点）。 */
export function cachedNames(cacheDir: string): string[] {
  if (!existsSync(cacheDir)) return []
  return readdirSync(cacheDir)
    .filter(isSaneName)
    .filter((name) => statSync(join(cacheDir, name)).isFile())
    .sort()
}
