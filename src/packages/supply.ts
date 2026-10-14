/**
 * Pyodide 供给线的 **Host** 半边：随包 lock 的目录化（清单 + 摘要）、按需包的
 * 下载校验落盘、缓存目录的盘点与清理、Node 干跑运行时的装载接线。
 *
 * 从 dsh-manim-card 插件整体下沉而来：插件里只剩「路由注册 + dsh 缓存目录落位」
 * 那一层薄壳，本层与「谁在用」无关——目录（随包 Pyodide 在哪、缓存放哪）由调用方注入。
 * 浏览器侧的配套（清单解析 / 依赖闭包 / 取数客户端）在 ./client.ts。
 *
 * 随包只带 numpy / sympy，其余包按需从官方发行通道取回；文件名与 sha256 一律以随包的
 * pyodide-lock.json 为准，不另写一份清单——两份清单早晚会对不上。
 */
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { copyFile, link, mkdir, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { canonicalPackageName } from '../py/pkg-names.ts'
import type { PyodideLoader } from '../py/runtime.ts'
import type { PackageState } from './client.ts'

/** lock 目录里一条可下载包的记录：这一条就是「把这个包取回来」所需的全部信息。 */
export interface SupplyCatalogEntry {
  name: string
  version: string
  fileName: string
  kind: string
  depends: string[]
  imports: string[]
  /** 官方发行通道给的 sha256；下载后按它校验。空串 = 拒绝下载（宁可不取也不能盲取）。 */
  sha256: string
}

/** 预缓存一个名字的结果（Host 侧的完整形状；客户端只见其中一部分）。 */
export interface CacheResult {
  name: string
  state: 'bundled' | 'cached' | 'absent' | 'unknown'
  downloaded: boolean
  bytes: number
  error?: string
}

/** 一份随包 lock 建出来的供给线。 */
export interface PyodideSupply {
  /** 可下载的目录（按名字排序）：清单接口的直接数据源。 */
  readonly catalog: readonly SupplyCatalogEntry[]
  /** 文件名 → lock 摘要；没有的文件不在目录里（路由层据此 404）。 */
  digestOf(fileName: string): string | undefined
  /** 设置页要看的清单：每个可下载的包，现在在本地是什么状态、占多少字节。 */
  inventory(cacheDir: string): {
    cacheDir: string
    pyodideVersion: string
    entries: Array<SupplyCatalogEntry & { state: PackageState; bytes: number | null }>
  }
  /** 把随包的 wheel 在缓存目录里就位（见 seedBundledPackages 的注释：Node 侧只认缓存目录）。 */
  seedBundled(cacheDir: string): Promise<void>
  /** 从官方发行通道取一个 wheel/zip，按 lock 的 sha256 校验，原子写进缓存目录。 */
  download(fileName: string, cacheDir: string): Promise<Buffer>
  /**
   * 把给定的包取到本地缓存。**顺序取、失败即停**——一个失败多半是网络或磁盘的系统性问题，
   * 继续往下只会把同一个错重复 N 遍，还把界面吊在那儿。已经在本地的直接跳过、不重下。
   */
  cachePackages(cacheDir: string, names: string[]): Promise<CacheResult[]>
  /** 缓存目录里现有的包文件（只看 `.whl` / `.zip`、只认普通文件）。 */
  cachedFiles(cacheDir: string): string[]
  /** 按包名挑出缓存目录里的文件：不在缓存里的、名字对不上的都静默跳过。 */
  filesForNames(cacheDir: string, names: string[]): string[]
  /**
   * 造一个 Pyodide 装载器（本体从 pyodideDir 加载、包只认缓存目录），交给调用方去
   * `setPyodideLoader(...)` 接线——接不接、接给谁由调用方决定，本层只管「怎么装」。
   */
  createNodeLoader(cacheDir: string): PyodideLoader
}

export interface PyodideSupplyOptions {
  /** 随包 Pyodide 目录（含 pyodide-lock.json、pyodide.mjs 与随包 wheel）。 */
  pyodideDir: string
  /** 回源下载的基地址；默认按 lock 版本取 jsdelivr 官方发行通道。 */
  cdnBase?: string
}

interface LockEntry {
  file_name?: unknown
  version?: unknown
  package_type?: unknown
  depends?: unknown
  imports?: unknown
  sha256?: unknown
}

export function createPyodideSupply(options: PyodideSupplyOptions): PyodideSupply {
  const pyodideDir = options.pyodideDir
  const lock = JSON.parse(readFileSync(join(pyodideDir, 'pyodide-lock.json'), 'utf8')) as {
    info?: { version?: unknown }
    packages?: Record<string, LockEntry>
  }
  const pyodideVersion = typeof lock.info?.version === 'string' ? lock.info.version : ''
  const cdnBase = options.cdnBase ?? `https://cdn.jsdelivr.net/pyodide/v${pyodideVersion}/full/`

  /**
   * 可以从官方通道取回的条目：有 `.whl` / `.zip` 产物的那些。
   *
   * 为什么不是「全部 lock 条目」：`*-tests` 的产物是 `.tar`（不装进运行时），
   * 被后缀天然滤掉；而 `cpython_module`（`hashlib` 之类）确实是独立的 whl，
   * 用户代码 `import hashlib` 时 Pyodide 会去取它——所以保留，别自作主张当「内置」。
   *
   * **名字用 lock 的键**（不是条目里的 `name` 字段）：两者有 21 条不一致（键 `pillow` /
   * 字段 `Pillow`），而 `depends` 里两种写法都出现。键是 Pyodide 自己的标识，
   * 也让「用户输入的名字」有个唯一落点。
   *
   * **`sha256` 必须带上**：这条记录就是「把这个包取回来」所需的全部信息。曾经漏了它，
   * 下载校验拿到的期望值恒为 `undefined`，于是**每一次预缓存都必然失败**、报错还只说
   * 「期望 undefined」（测试也没拦下：当时只有「摘要对不上要报错」的用例，没有「对得上要成功」的）。
   */
  const downloadable = Object.entries(lock.packages ?? {})
    .filter(([, entry]) => typeof entry.file_name === 'string' && /\.(whl|zip)$/u.test(entry.file_name))

  /**
   * 归一化名 → lock 键。依赖引用与用户输入都先过这里，再落到目录里的 `name` 上。
   * 归一化规则见 ../py/pkg-names.ts 的 canonicalPackageName（两端同一份），原因也写在那一处。
   */
  const keyByCanonical = new Map(downloadable.map(([key]) => [canonicalPackageName(key), key]))

  const catalog: SupplyCatalogEntry[] = downloadable
    .map(([key, entry]) => ({
      name: key,
      version: typeof entry.version === 'string' ? entry.version : '',
      fileName: entry.file_name as string,
      kind: typeof entry.package_type === 'string' ? entry.package_type : 'package',
      // 依赖先归一化再落成**键**，解析不到的直接丢掉：发出去的都是能取的，
      // 客户端那边才算得准闭包（原来按字段名发，matplotlib 的 `pillow` 会对不上而漏掉）。
      depends: (Array.isArray(entry.depends) ? entry.depends : [])
        .map((ref) => keyByCanonical.get(canonicalPackageName(String(ref))))
        .filter((ref): ref is string => typeof ref === 'string'),
      imports: Array.isArray(entry.imports) ? entry.imports.filter((item): item is string => typeof item === 'string') : [],
      sha256: typeof entry.sha256 === 'string' ? entry.sha256 : '',
    }))
    .sort((left, right) => left.name.localeCompare(right.name))
  const catalogByName = new Map(catalog.map((entry) => [canonicalPackageName(entry.name), entry]))
  const digests = new Map(catalog.map((entry) => [entry.fileName, entry.sha256]))

  /**
   * 把随包的 wheel 在缓存目录里就位。
   *
   * 为什么需要这一步：`packageCacheDir` 一旦给出，Pyodide 在 Node 侧就**只从那里读**
   * （源码里 `let n = isNode ? config.packageCacheDir : config.indexURL`），不再回看 indexURL。
   * 不先就位的话，连随包的 numpy 都会被当成缺包去 CDN 下（实测：`Didn't find package numpy locally`）。
   * 优先硬链接省一份空间，跨卷时才退回复制。失败不致命——最坏退化成从 CDN 取。
   */
  async function seedBundled(cacheDir: string): Promise<void> {
    let names: string[]
    try {
      names = readdirSync(pyodideDir).filter((name) => name.endsWith('.whl'))
    } catch (error) {
      console.error('[manim-live] 读取随包 wheel 失败：', error)
      return
    }
    if (names.length === 0) return
    try {
      await mkdir(cacheDir, { recursive: true })
    } catch (error) {
      console.error(`[manim-live] 建缓存目录失败（${cacheDir}）：`, error)
      return
    }
    for (const name of names) {
      const target = join(cacheDir, name)
      if (existsSync(target)) continue
      try {
        await link(join(pyodideDir, name), target)
      } catch {
        try {
          await copyFile(join(pyodideDir, name), target)
        } catch (error) {
          console.error(`[manim-live] 随包件就位失败（${name}）：`, error)
        }
      }
    }
  }

  async function download(fileName: string, cacheDir: string): Promise<Buffer> {
    const sha256 = digests.get(fileName) ?? ''
    // 没有期望摘要就**不下**：`undefined` 会让 `actual !== sha256` 恒成立，白白下一遍再报一句
    // 看不懂的「期望 undefined」——宁可在发请求之前就停下，把话说清楚。
    if (sha256.length === 0) throw new Error(`没有 ${fileName} 的 sha256，拒绝下载`)
    const response = await fetch(cdnBase + fileName)
    if (!response.ok) throw new Error(`下载 ${fileName} 失败：HTTP ${response.status}`)
    const bytes = Buffer.from(await response.arrayBuffer())
    const actual = createHash('sha256').update(bytes).digest('hex')
    if (actual !== sha256) throw new Error(`下载 ${fileName} 校验不过：期望 ${sha256}，实际 ${actual}`)
    await mkdir(cacheDir, { recursive: true })
    const target = join(cacheDir, fileName)
    // 先写临时名再改名：中途失败不会留下半截文件冒充「已缓存」。
    await writeFile(`${target}.part`, bytes)
    await rename(`${target}.part`, target)
    console.info(`[manim-live] 已缓存 ${fileName}（${(bytes.length / 1048576).toFixed(1)} MB）`)
    return bytes
  }

  /** 缓存目录里现有的包文件（只看 `.whl` / `.zip`、只认普通文件）。目录没建过 = 没缓存过，回空表。 */
  function cachedFiles(cacheDir: string): string[] {
    let names: string[]
    try {
      names = readdirSync(cacheDir)
    } catch {
      return []
    }
    const files: string[] = []
    for (const name of names) {
      if (!/\.(whl|zip)$/u.test(name)) continue
      try {
        if (statSync(join(cacheDir, name)).isFile()) files.push(name)
      } catch {
        // 期间被别人删了，当没有
      }
    }
    return files
  }

  function filesForNames(cacheDir: string, names: string[]): string[] {
    const present = new Set(cachedFiles(cacheDir))
    const targets = new Set<string>()
    for (const name of names) {
      const entry = catalogByName.get(canonicalPackageName(name))
      if (entry !== undefined && present.has(entry.fileName)) targets.add(entry.fileName)
    }
    return [...targets]
  }

  /** 缓存目录现状：文件名 → 字节数。目录不存在时回空表（= 还没缓存过，不是错）。 */
  function readCacheFiles(cacheDir: string): Map<string, number> {
    const sizes = new Map<string, number>()
    let names: string[]
    try {
      names = readdirSync(cacheDir)
    } catch {
      return sizes
    }
    for (const name of names) {
      try {
        const stat = statSync(join(cacheDir, name))
        if (stat.isFile()) sizes.set(name, stat.size)
      } catch (error) {
        console.error(`[manim-live] 读缓存文件失败（${name}）：`, error)
      }
    }
    return sizes
  }

  /** 随包目录里的文件名集合（只用来判断「这个包是不是跟着插件来的」）。 */
  function readBundledNames(): Set<string> {
    try {
      return new Set(readdirSync(pyodideDir))
    } catch (error) {
      console.error('[manim-live] 读随包目录失败：', error)
      return new Set()
    }
  }

  /**
   * 一个包在本地的状态：`bundled` 随包来 / `cached` 本机取回来的 / `absent` 要用就得联网。
   *
   * 判定顺序不能反：随包的 wheel 会被 seedBundled 硬链接进缓存目录，
   * 先看缓存就会把随包件算成「用户缓存」，于是「已缓存几个」这个数一开始就是虚的。
   */
  function stateOf(fileName: string, bundled: Set<string>, cached: Map<string, number>): PackageState {
    if (bundled.has(fileName)) return 'bundled'
    if (cached.has(fileName)) return 'cached'
    return 'absent'
  }

  async function cachePackages(cacheDir: string, names: string[]): Promise<CacheResult[]> {
    const results: CacheResult[] = []
    const bundled = readBundledNames()
    const cached = readCacheFiles(cacheDir)
    for (const name of names) {
      // 名字按归一化对（`Pillow` / `scikit_learn` 这类写法都落到同一个包上），
      // 回执里用目录里的名字，好和清单对上。
      const entry = catalogByName.get(canonicalPackageName(name))
      if (entry === undefined) {
        results.push({ name, state: 'unknown', downloaded: false, bytes: 0, error: '这个包不在随包 lock 里' })
        break
      }
      const state = stateOf(entry.fileName, bundled, cached)
      if (state !== 'absent') {
        results.push({ name: entry.name, state, downloaded: false, bytes: cached.get(entry.fileName) ?? 0 })
        continue
      }
      try {
        const bytes = await download(entry.fileName, cacheDir)
        results.push({ name, state: 'cached', downloaded: true, bytes: bytes.length })
      } catch (error) {
        console.error(`[manim-live] 预缓存 ${name} 失败：`, error)
        results.push({ name, state: 'absent', downloaded: false, bytes: 0, error: error instanceof Error ? error.message : String(error) })
        break
      }
    }
    return results
  }

  return {
    catalog,
    digestOf: (fileName) => digests.get(fileName),
    inventory(cacheDir) {
      const cached = readCacheFiles(cacheDir)
      const bundled = readBundledNames()
      return {
        cacheDir,
        pyodideVersion,
        entries: catalog.map((entry) => ({
          ...entry,
          state: stateOf(entry.fileName, bundled, cached),
          bytes: cached.get(entry.fileName) ?? null,
        })),
      }
    },
    seedBundled,
    download,
    cachePackages,
    cachedFiles,
    filesForNames,
    /**
     * Host 预检也用真 Python：Node 侧直接从随包目录加载 Pyodide。
     * 用 pathToFileURL + 动态 import，让 pyodide.mjs 留在文件系统上、不进任何产物。
     *
     * ⚠️ packageCacheDir 必须显式给：默认值就是 indexURL，不给时下载的 wheel 会写进随包的
     * assets/pyodide/（真机事故：跑一次按需加载就多出 6 个 whl、约 21 MB）。
     */
    createNodeLoader(cacheDir) {
      return async () => {
        await seedBundled(cacheDir)
        const { loadPyodide } = await import(pathToFileURL(join(pyodideDir, 'pyodide.mjs')).href)
        return loadPyodide({ indexURL: pyodideDir, packageCacheDir: cacheDir })
      }
    },
  }
}
