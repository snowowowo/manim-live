// Pyodide 加载器：注入 <script> 再 loadPyodide({ indexURL })。
//
// **地址不再写死**：核心包不知道使用者把 Pyodide 挂在哪个路径（宿主路由 / 自建 CDN / 官方 CDN 都可能），
// 所以 `indexURL` 由配置来（见 createManimRenderer 的 `pyodideIndexURL`）。
// 事实：Pyodide 的「核心」与「按需包」读的是**同一个 indexURL**——它按 indexURL 下的
// `pyodide-lock.json` 再取 wheel。所以只需要这一个地址就同时覆盖本体与按需取包。
// 本实现实测的硬事实：浏览器侧 Pyodide **只从 indexURL 读、不回落 CDN**，所以这个地址必须真能取到东西。
//
// 懒加载——第一次真要跑 Python 才拉（核心约 13 MB）。`setPyodideLoader` 是运行时那边的注入点，
// 这里只是「用 <script> 加载」这一种实现；测试里换成 Node 侧加载器即可（见 scripts/test-pyodide.mjs）。
import { setPyodideLoader, type PyodideRuntime } from '../py/runtime.ts'

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
}

/** 当前登记的 indexURL（诊断 / playground 的「环境诊断」面板用）。 */
export function currentPyodideIndexURL(): string | null {
  return currentIndexURL
}
