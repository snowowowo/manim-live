// 核心包门面（浏览器入口，含画布）：一个工厂 + 一组配置，框架无关。
//
// 它只碰两个 DOM 原语：给一个容器元素、拿到 `run` / `dispose`。零 UI、零框架、零宿主。
//
// ⚠️ 两条契约（必须让使用者知道，否则会在 SPA 里踩坑）：
//   1. **多实例**：WASM 运行时与串行执行队列是**页面级单例**（py/runtime.ts 的 queue），
//      不是每实例一份。同时挂两个组件不会启两份 20 MB 的 WASM，但它们的渲染是串行的。
//   2. **销毁**：`dispose()` 要真的释放 WASM / WebGL。SPA 路由切换不销毁就是内存泄漏。
import { createDryRunBridge } from './py/dry-run-bridge.ts'
import { runPython, warmupRuntime } from './py/runtime.ts'
import { createSurface, type Surface, type SurfaceOptions, type RunResult, type RunHandlers } from './engine/renderer.ts'
import { installPyodideLoader, DEFAULT_PYODIDE_INDEX_URL, currentPyodideIndexURL } from './engine/pyodide.ts'
import { browserRecorder } from './export/browser-recorder.ts'
import type { Exporter } from './export/types.ts'

export interface CheckResult {
  ok: boolean
  error?: string
}

export interface ManimRendererOptions {
  /**
   * Pyodide 的取数根（本体与按需包共用一个地址）。
   * 不给 = 官方 CDN；想离线 / 自托管就传自己的 URL（那时下载与缓存是使用者自己的事）。
   */
  pyodideIndexURL?: string
  /**
   * KaTeX 的取数根（`katex.min.css` 与字体所在的目录）。
   * 给了就注入一份 `<link>`（MathTex 渲成 KaTeX HTML 后要有样式才看得对）；不给就不碰 DOM。
   */
  katexBaseURL?: string
  /** 按 import 取包时的进展回调（开始取时给包名，取完给空数组）——供 UI 显示「正在取包」。 */
  onLoading?: (names: string[]) => void
  /**
   * 额外的导出接入者（如 DSH 插件的本机 manim CLI）。
   * 核心自带 `browserRecorder`（浏览器录屏）**始终在场**，排在列表最前。
   */
  exporters?: Exporter[]
}

export interface ManimRenderer {
  /** 提前把 Pyodide（约 20 MB）拉起来——不给预热，用户第一次点渲染会以为卡死。 */
  warmup(): Promise<void>
  /** 干跑预检：语法错 / 未定义名 / 实测缺失的 manim-web 能力当场回 ok:false，调用方不必再自校验一份。 */
  check(python: string): Promise<CheckResult>
  /** 在给定容器里造一块画布；容器由调用方给、生命周期也由调用方管。 */
  createSurface(container: HTMLElement, options?: SurfaceOptions): Promise<Surface>
  /** 可用的导出接入者（核心自带的录屏 + 使用者传进来的）。 */
  exporters: readonly Exporter[]
  /** 当前生效的 Pyodide 取数根（诊断用）。 */
  pyodideIndexURL(): string
  /** 释放：拆掉本实例造过的所有画布、摘掉注入的样式与脚本标记。 */
  dispose(): void
}

/** 已注入的 KaTeX 样式表（按 URL 去重，避免多实例重复插同一份）。 */
const katexLinks = new Map<string, HTMLLinkElement>()

/**
 * 注入 KaTeX 样式（幂等；同一 URL 只插一次）。
 * 单独导出是为了让「不经过工厂」的使用者也能用同一条路径。
 */
export function injectKatexStyles(baseURL: string): void {
  if (typeof document === 'undefined') return
  const href = baseURL.endsWith('/') ? `${baseURL}katex.min.css` : `${baseURL}/katex.min.css`
  if (katexLinks.has(href)) return
  const link = document.createElement('link')
  link.rel = 'stylesheet'
  link.href = href
  document.head.append(link)
  katexLinks.set(href, link)
}

/** 摘掉本模块注入的 KaTeX 样式（dispose 用；只摘自己插的，不动使用者自己加的）。 */
function removeKatexStyles(): void {
  for (const [href, link] of katexLinks) {
    link.remove()
    katexLinks.delete(href)
  }
}

/**
 * 造一个渲染器。契约（见文件头）：多实例共享页面级单例；dispose 要真释放。
 * 这是核心包**唯一**的对外入口——UI 由使用者自备。
 */
export function createManimRenderer(options: ManimRendererOptions = {}): ManimRenderer {
  // 预检（check）可能先于任何画布被调用，所以加载器在这里就装上，不等 createSurface。
  installPyodideLoader(options.pyodideIndexURL)
  if (options.katexBaseURL !== undefined) injectKatexStyles(options.katexBaseURL)

  const surfaces = new Set<Surface>()
  const exporters: Exporter[] = [browserRecorder, ...(options.exporters ?? [])]

  return {
    warmup(): Promise<void> {
      return warmupRuntime()
    },

    async check(python: string): Promise<CheckResult> {
      if (python.trim().length === 0) return { ok: true }
      try {
        await runPython(python, createDryRunBridge())
        return { ok: true }
      } catch (error) {
        console.error('[manim-live] check failed:', error)
        return { ok: false, error: error instanceof Error ? error.message : String(error) }
      }
    },

    async createSurface(container: HTMLElement, surfaceOptions: SurfaceOptions = {}): Promise<Surface> {
      const surface = await createSurface(container as HTMLDivElement, surfaceOptions)
      surfaces.add(surface)
      return surface
    },

    exporters,

    pyodideIndexURL(): string {
      return currentPyodideIndexURL() ?? options.pyodideIndexURL ?? DEFAULT_PYODIDE_INDEX_URL
    },

    dispose(): void {
      for (const surface of surfaces) {
        try {
          surface.dispose()
        } catch (error) {
          console.error('[manim-live] surface dispose failed:', error)
        }
      }
      surfaces.clear()
      removeKatexStyles()
    },
  }
}

export { browserRecorder } from './export/browser-recorder.ts'
export type { Exporter, ExportRequest, ExportResult, RenderController } from './export/types.ts'
export type { Surface, SurfaceOptions, RunResult, RunHandlers } from './engine/renderer.ts'
export { DEFAULT_PYODIDE_INDEX_URL } from './engine/pyodide.ts'

// ---- 语料的**形状**：类型 + 边界校验（`parseCorpus`）----
//
// 为什么在浏览器侧而不只在 `/node`：语料本体由使用者（DSH 插件 / 自建后端）经 HTTP 发过来，
// 浏览器拿到的是**不可信输入**，得有一份两端口径相同的边界校验。它不碰 node:，所以这儿也能出。
export {
  parseCorpus,
  type Corpus,
  type ExampleGroup,
  type ExampleExpect,
  type ManimExample,
} from './py/examples.ts'

// ---- 低层入口（给需要直接驱动运行时 / 自己接管画布的使用者）----
//
// 为什么也从这个入口出：运行时、桥、支持面都是**浏览器可用**的纯逻辑（一个 node: 都不碰）。
// 上游那套「截图 / API 探针」脚本就是**按构建产物**在真浏览器里跑这些的——
// 与产品用同一份构建，不是另抄一个解释器。只有语料装载（要 node:fs）留在 /node 入口。
export { runPython, setPyodideLoader, warmupRuntime, PyRuntimeError, PyRunCancelled } from './py/runtime.ts'
export { createManimWebBridge, type ManimNamespace } from './py/manim-bridge.ts'
export { createRecordingBridge, HANDLE_KEY, GROUP_KEY, ANIMATE_KIND } from './py/bridge.ts'
export { createDryRunBridge } from './py/dry-run-bridge.ts'
export { planMethod, planAnimate, planCreate, PY_API_MAP, PY_ANIMATE_METHODS } from './py/surface.ts'
export { canonicalPackageName } from './py/pkg-names.ts'
export { loadManim, type ManimRuntime } from './engine/library.ts'
export { createScene, type ManimScene } from './engine/canvas.ts'
