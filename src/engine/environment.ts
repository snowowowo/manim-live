// 环境状态：把「决定能不能出画面」的四组运行期条件收成一个快照 + 一个订阅。
//
// 为什么要有它：能力（WASM / WebGL / MediaRecorder）、Pyodide 运行时生命周期、KaTeX 样式、
// 按需取包进展，原本全是内部事——使用者要么无从得知，要么等 `run()` 抛错才看见一句迟到的原因。
// 状态与 hint 是**能力**；chip 长什么样、摆在哪、点什么动作才是**壳**（使用者自备），
// 与测试台（`testbench/`）是同一种分法。
//
// 只在浏览器入口导出：能力探测与 `<link>` 都依赖 DOM；Node 侧要的是本机探测，那是另一件事。
// 本模块不发起任何网络请求——快照只读已发生的状态。
import { currentPyodideIndexURL } from './pyodide.ts'
import { setRuntimePhaseListener, setPackageStatusListener } from '../py/runtime.ts'

export type RuntimePhase = 'idle' | 'loading' | 'ready' | 'error'
export type KatexPhase = 'unconfigured' | 'loading' | 'loaded' | 'error'

export interface EnvironmentCapabilities {
  wasm: boolean
  webgl: boolean
  /** 浏览器侧**视频导出**能不能用（WebCodecs 或 MediaRecorder 有一个即可）；缺它只影响导出，不影响渲染。 */
  videoExport: boolean
}

export interface EnvironmentStatus {
  capabilities: EnvironmentCapabilities
  runtime: { phase: RuntimePhase; error?: string; indexURL: string | null }
  katex: { baseURL: string | null; phase: KatexPhase; error?: string }
  packages: { fetching: string[]; lastError?: string }
  /** 每个未满足项一句可执行的话；全满足时是空数组。 */
  hints: string[]
}

let runtimePhase: RuntimePhase = 'idle'
let runtimeError: string | undefined
let katexBaseURL: string | null = null
let katexPhase: KatexPhase = 'unconfigured'
let katexError: string | undefined
let fetching: string[] = []
let packagesLastError: string | undefined

let capabilitiesCache: EnvironmentCapabilities | null = null

function probeWebgl(): boolean {
  if (typeof document === 'undefined') return false
  try {
    const canvas = document.createElement('canvas')
    return canvas.getContext('webgl2') !== null || canvas.getContext('webgl') !== null
  } catch {
    return false
  }
}

function probeCapabilities(): EnvironmentCapabilities {
  capabilitiesCache ??= {
    wasm: typeof WebAssembly === 'object' && WebAssembly !== null,
    webgl: probeWebgl(),
    videoExport: typeof MediaRecorder !== 'undefined' || (typeof globalThis !== 'undefined' && 'VideoEncoder' in globalThis),
  }
  return capabilitiesCache
}

function collectHints(): string[] {
  const out: string[] = []
  const caps = probeCapabilities()
  // 能力 hint 是浏览器语境的话：Node / SSR 里 document 缺席，本就不是渲染环境，念它是错的。
  if (typeof document !== 'undefined') {
    if (!caps.wasm) out.push('当前浏览器不支持 WebAssembly：Pyodide 无法启动，请换现代桌面浏览器。')
    if (!caps.webgl) out.push('当前浏览器没有可用 WebGL：manim-web 出不了画面。')
    if (!caps.videoExport) out.push('当前浏览器既没有 WebCodecs 也没有 MediaRecorder：browser-video 导出不可用（不影响渲染）。')
  }
  if (runtimePhase === 'error') {
    out.push(`Pyodide 运行时启动失败：${runtimeError ?? '原因未知'}。先确认 pyodideIndexURL 的地址真能打开、其下文件完整。`)
  }
  if (katexPhase === 'error') {
    out.push(`KaTeX 样式加载失败：${katexError ?? '原因未知'}。检查 katexBaseURL 下有没有 katex.min.css 与字体文件。`)
  }
  if (packagesLastError !== undefined) out.push(packagesLastError)
  return out
}

function snapshot(): EnvironmentStatus {
  return {
    capabilities: probeCapabilities(),
    runtime: {
      phase: runtimePhase,
      ...(runtimeError === undefined ? {} : { error: runtimeError }),
      indexURL: currentPyodideIndexURL(),
    },
    katex: {
      baseURL: katexBaseURL,
      phase: katexPhase,
      ...(katexError === undefined ? {} : { error: katexError }),
    },
    packages: {
      fetching: [...fetching],
      ...(packagesLastError === undefined ? {} : { lastError: packagesLastError }),
    },
    hints: collectHints(),
  }
}

const subscribers = new Set<(status: EnvironmentStatus) => void>()

function emit(): void {
  if (subscribers.size === 0) return
  const status = snapshot()
  for (const cb of subscribers) {
    try {
      cb(status)
    } catch (error) {
      console.error('[manim-live] environment status subscriber threw:', error)
    }
  }
}

/** 当前环境状态快照。不发起任何加载或探测请求，只读已发生的状态。 */
export function environmentStatus(): EnvironmentStatus {
  return snapshot()
}

/** 订阅环境状态变化（运行时阶段、KaTeX 加载结果、取包进展任一变动都播一次）；返回退订函数。 */
export function onEnvironmentStatus(cb: (status: EnvironmentStatus) => void): () => void {
  subscribers.add(cb)
  return () => {
    subscribers.delete(cb)
  }
}

// ---- 写入侧：各接线点只调这几个 note*，状态迁移与播报收在这一处 ----

export function noteRuntimePhase(phase: 'loading' | 'ready' | 'error', error?: string): void {
  runtimePhase = phase
  runtimeError = phase === 'loading' ? undefined : error
  emit()
}

export function noteKatexInjecting(baseURL: string): void {
  katexBaseURL = baseURL
  katexPhase = 'loading'
  katexError = undefined
  emit()
}

export function noteKatexLoaded(): void {
  katexPhase = 'loaded'
  emit()
}

export function noteKatexError(error: string): void {
  katexPhase = 'error'
  katexError = error
  emit()
}

export function noteKatexRemoved(): void {
  katexBaseURL = null
  katexPhase = 'unconfigured'
  katexError = undefined
  emit()
}

export function notePackages(nextFetching: string[], lastError?: string): void {
  fetching = [...nextFetching]
  if (lastError !== undefined) packagesLastError = lastError
  emit()
}

setRuntimePhaseListener((phase, error) => noteRuntimePhase(phase, error))
setPackageStatusListener((names, lastError) => notePackages(names, lastError))
