// Pyodide 加载器：注入 <script> 再 loadPyodide({ indexURL })。
//
// **地址不再写死**：核心包不知道使用者把 Pyodide 挂在哪个路径（宿主路由 / 自建 CDN / 官方 CDN 都可能），
// 所以 `indexURL` 由配置来（见 createManimRenderer 的 `pyodideIndexURL`）。
//
// 事实（读 `pyodide.asm.js` 得来，别当成猜测）：Pyodide 的「核心」与「按需包」读的是**同一个
// indexURL**——按需包那一步是
//
//     let n = h ? config.packageCacheDir : config.indexURL      // h = 是否 Node
//     … fetch(new URL(file_name, n), { integrity: 'sha256-' + base16ToBase64(pkg.sha256) })
//     catch(c){ if(!h || …) throw c; … this.cdnURL + o … }      // CDN 回落只在 Node 分支里
//
// 于是两件事同时成立：① `packageCacheDir` 是 **Node 专属**参数，浏览器传了也没用；
// ② 浏览器侧**只从 indexURL 读、不回落 CDN**，所以这个地址必须真能取到东西。
// 取不到时抛的是 `TypeError: Failed to fetch`（带 SRI 的 fetch 撞上 404 空 body，
// 见下面的 diagnosePackageNames），这句话本身完全读不出真因——所以底下挂了一个诊断器。
//
// 懒加载——第一次真要跑 Python 才拉（核心约 13 MB）。`setPyodideLoader` 是运行时那边的注入点，
// 这里只是「用 <script> 加载」这一种实现；测试里换成 Node 侧加载器即可（见 scripts/test-pyodide.mjs）。
import { canonicalPackageName } from '../py/pkg-names.ts'
import { setPackageDiagnoser, setPyodideLoader, type PyodideRuntime } from '../py/runtime.ts'

/**
 * 不给地址时的默认值：Pyodide 官方 CDN（能开箱跑）。
 * 想离线 / 自托管就传自己的 URL——那时「下载 + 校验 + 缓存」是使用者自己的事。
 */
export const DEFAULT_PYODIDE_INDEX_URL = 'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'

type LoadPyodide = (options: { indexURL: string }) => Promise<PyodideRuntime>

/** 末尾必须有斜杠：Pyodide 内部按它拼 `pyodide-lock.json` 与 wheel 的名字。 */
function normalizeIndexURL(url: string): string {
  return url.endsWith('/') ? url : `${url}/`
}

let currentIndexURL: string | null = null
let scriptPromise: Promise<void> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = src
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Pyodide 脚本加载失败：${src}`))
    document.head.append(script)
  })
}

/**
 * 登记 Pyodide 加载器（幂等——**同一个 indexURL** 重复调用不能重置已缓存的脚本与运行时实例）。
 * indexURL 变了才重新登记（并允许重新拉脚本）：多实例挂在不同资源上时才需要，正常不会发生。
 */
export function installPyodideLoader(indexURL: string = DEFAULT_PYODIDE_INDEX_URL): void {
  const base = normalizeIndexURL(indexURL)
  if (currentIndexURL === base) return
  currentIndexURL = base
  scriptPromise = null
  setPyodideLoader(async () => {
    scriptPromise ??= loadScript(`${base}pyodide.js`)
    await scriptPromise
    const load = (globalThis as { loadPyodide?: LoadPyodide }).loadPyodide
    if (typeof load !== 'function') throw new Error('Pyodide 脚本已加载但未暴露 loadPyodide')
    return load({ indexURL: base })
  })
  // 诊断器跟着地址走：它要问的就是「这个地址下到底有什么」。
  setPackageDiagnoser((names) => diagnosePackageNames(base, names))
}

/** 当前登记的 indexURL（诊断 / playground 的「环境诊断」面板用）。 */
export function currentPyodideIndexURL(): string | null {
  return currentIndexURL
}

/** lock 里我们只读得出「包名 → 文件名」这一件事。 */
interface LockFile {
  packages?: Record<string, { name?: unknown; file_name?: unknown }>
}

/** 探测个数上限：同一个地址下缺的东西成因必然一致，报名字报全、探前几个就够。 */
const PROBE_LIMIT = 4

interface Probe {
  status?: number
  /** 5xx 时服务端自己留下的原话。 */
  note?: string
}

/**
 * 探一下这个地址有没有东西——**这正是 Pyodide 自己做不到的那件事**（它的失败不带状态码）。
 *
 * 用 GET 不用 HEAD：宿主那条资源路由**只放行 GET**（`assets.js` 里 `request.method !== 'GET'`
 * 直接挡掉），HEAD 会被当成「没有这个方法」，于是把「文件明明在」误报成「地址下没有」。
 * 也不读 body：**拿到状态码就 abort**——问一句「在不在」不该把 12 MB 拉下来。
 *
 * 唯一的例外是 5xx：那时读一小段 body。宿主 / 开发期镜像在取包失败时会**把原因写在 body 里**
 * （「回源取不到 …（试了 3 次…）」），转述它比我们自己猜准得多；而把 5xx 归进「地址下没有」
 * 恰好会把「代取那一头坏了」说成「目录里缺文件」，那又是一句骗人的话。
 */
async function probe(url: string): Promise<Probe> {
  const controller = new AbortController()
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { range: 'bytes=0-0' } })
    if (response.status < 500) return { status: response.status }
    const note = (await response.text()).replace(/\s+/g, ' ').trim().slice(0, 240)
    return { status: response.status, ...(note === '' ? {} : { note }) }
  } catch {
    return {}
  } finally {
    controller.abort()
  }
}

/**
 * 取包失败后的补诊断：把「为什么」问清楚，别让用户对着 `Failed to fetch` 猜。
 *
 * 为什么猜不出来（真机四路对照，见 `_tmp/probe-sri.mjs`）：浏览器侧取 wheel 是**带 SRI 校验的
 * fetch**——`fetch(url, { integrity: 'sha256-<base64>' })`，base64 由 `base16ToBase64` 从 lock 的
 * hex 转出来。文件不在时服务端回的是 **404 空 body**，SRI 拿到空字节 → 判定完整性不匹配 →
 * 抛 `TypeError: Failed to fetch`，**和网络不通抛的是同一句话**。实测对照：
 *
 *     缺文件，不带 integrity → ok=false status=404       ← 拿得到状态码
 *     缺文件，带真 integrity → TypeError: Failed to fetch ← 就是用户看到的那句
 *     有文件，带真 integrity → ok=true status=200
 *     有文件，带假 integrity → TypeError: Failed to fetch（哈希格式写错也一样）
 *
 * 所以那句话只能当「取包这一步挂了」，真因由这里补问，分三档各给一句能照着做的：
 *   · 地址下没有这个文件   → 静态目录里有什么就只能取什么：补 wheel，或让宿主路由代取；
 *   · 连不上这个地址       → 浏览器只认 indexURL，不会回落官方 CDN，这个地址必须真能打开；
 *   · 文件在、HTTP 也正常 → 那是字节与 lock 的 sha256 对不上（换了一版镜像？）。
 * 问不出来（lock 读不到、包名对不上）返 `null`，由调用方退回默认文案。
 */
async function diagnosePackageNames(base: string, names: string[]): Promise<string | null> {
  let lock: LockFile
  try {
    const response = await fetch(`${base}pyodide-lock.json`)
    if (!response.ok) {
      return `连得上 ${base}，但那里的 pyodide-lock.json 读不到（HTTP ${response.status}）——这个地址不像一份 Pyodide 发行版。`
    }
    lock = (await response.json()) as LockFile
  } catch {
    return `连不上 ${base}：浏览器侧 Pyodide 只认 indexURL 这一个地址、不会回落官方 CDN（那条回落只写在 Node 分支里），所以它必须真能打开。`
  }

  // 包名要能对上 lock——**两边都试**：键与条目里的 `name` 字段有 21 条不一致
  // （`pillow` / `Pillow`），所以归一化之后再比（口径见 py/pkg-names.ts）。
  const fileOf = new Map<string, string>()
  for (const [key, entry] of Object.entries(lock.packages ?? {})) {
    const file = entry?.file_name
    if (typeof file !== 'string') continue
    fileOf.set(canonicalPackageName(key), file)
    if (typeof entry?.name === 'string') fileOf.set(canonicalPackageName(entry.name), file)
  }
  const files = names
    .map((name) => fileOf.get(canonicalPackageName(name)))
    .filter((file): file is string => file !== undefined)
  if (files.length === 0) return null

  const probes = await Promise.all(files.slice(0, PROBE_LIMIT).map(async (file) => ({ file, ...(await probe(base + file)) })))
  // 顺序要紧：5xx 也必须先认出来——它同时是「>= 400」，落到下面那一档就会被说成「目录里缺文件」，
  // 而真因是代取的那一头（宿主 / 开发期镜像）自己没成。
  const broken = probes.find((item) => item.note !== undefined)
  if (broken !== undefined) {
    return `取包这一环自己报了错（HTTP ${broken.status}）：${broken.note}。这不是网络不通，是代取的那一头没成——看它的日志。`
  }
  const missing = probes.filter((item) => item.status !== undefined && item.status >= 400)
  const unreachable = probes.filter((item) => item.status === undefined)
  const listed = files.length > missing.length ? `等 ${files.length} 个` : ''
  if (missing.length > 0) {
    return `真因多半不是网络：${base} 下没有 ${missing.map((item) => item.file).join('、')}${listed} 这些文件——这个地址是静态目录，里面有什么就只能取什么（把缺的 wheel 补进目录，或让宿主路由代取）。`
  }
  if (unreachable.length > 0) {
    return `连不上 ${base}（探测 ${unreachable[0]?.file ?? ''} 时没拿到任何状态码）——浏览器侧 Pyodide 只认这一个地址、不会回落官方 CDN，所以它必须真能打开。`
  }
  return `${base} 下的文件在、HTTP 也正常，但取包时字节与 pyodide-lock.json 里的 sha256 对不上（取包这一步带 SRI 完整性校验）——换一份与这份 lock 配套的 wheel。`
}
