// 画布（Surface）：一块固定 1280×720 的 manim 画布 + 串行执行队列。
// 对外三个动作——run(code) 跑一段、replay() 从头真播一遍、dispose() 拆掉；
// 多次 run 按提交顺序串行（画布是单写入方）。
//
// 代码路径：Manim Python → Pyodide 里的真 CPython → manim 适配层 → 桥 → 这块真场景。
// 每次 run 用一块新桥（句柄表重新计数），句柄不跨次串味。
//
// 跨**画布**的串行由 runtime 的全局队列保证（一个页面只有一份解释器，见 py/runtime.ts 的 queue）——
// 这里那条 tail 只管同一块画布上的先后。
import { PyRunCancelled, PyRuntimeError, runPython } from '../py/runtime.ts'
import { createManimWebBridge, type ManimNamespace } from '../py/manim-bridge.ts'
import { createSceneSlot } from './canvas.ts'
import { loadManim } from './library.ts'

const WIDTH = 1280
const HEIGHT = 720

export interface RunResult {
  ok: boolean
  error?: string
  /** 这段运行作废了（画布在轮到它之前就被拆）：不是错误，调用方一个字都不该显示。 */
  cancelled?: boolean
}

export interface RunHandlers {
  /** 按 import 取包时的进展：开始时给包名，取完给空数组（见 runtime 的 RunOptions.onLoading）。 */
  onLoading?: (names: string[]) => void
  /**
   * 执行上下文（**Phase 3 未实现**，这里只占位——签名先留出来，免得抽完的包黑板接不上）。
   *
   * 语义（定案）：同一 context 内**变量跨次保留**（第 N 次能看到第 1 次建的 `circle`，且重画被禁止）；
   * **新 context = 从零**（冷挂载 / 纠错重演前缀靠它）。今天三层都刻意隔离：Python 命名空间每次新建、
   * 每次 run 用新桥、updater 包装表清空——所以它是**行为反转**，不能混进 Phase 1 的「零行为变化」。
   */
  context?: string
}

export interface Surface {
  /** 跑一段 Manim Python（内部交给 Pyodide 执行并驱动画布）。 */
  run(code: string, handlers?: RunHandlers): Promise<RunResult>
  /**
   * 作废当前画布 → 建一块新的 → 把上一段代码从头真播一遍。resolve 时表示这一遍真的播完了。
   *
   * ⚠️ **它会换掉 canvas 元素**（新场景带新 canvas）。所以要拿它去喂录屏时得注意：
   * `browserRecorder` 是在 `replay()` **之前**就 `captureStream()` 抓住当前 canvas 的，
   * 画布一换，流还挂在那块被丢弃的旧画布上，录出来是个 0 字节的空文件（实测踩过）。
   * 正确姿势见 `RenderController.replay` 的注释：给它一个**已经新建好的空画布** +
   * 「在同一块画布上跑一遍」的 replay，而不是直接把本对象当控制器。
   */
  replay(): Promise<void>
  /** 当前画布元素；还没建出来时给 null。 */
  canvas(): HTMLCanvasElement | null
  /** 画布上已经有画面了吗（录屏要非空才值得录）。 */
  isRendered(): boolean
  /** 拆掉这块画布；之后 run 一律作废（cancelled），不会真的跑。 */
  dispose(): void
}

export interface SurfaceOptions {
  /** 极速：不等时间，直接落终态（playground 的「全部渲染」用，见 manim-bridge 的 fast）。 */
  fast?: boolean
  /**
   * 按 import 取包时的进展回调（开始取时给包名，取完给空数组）。
   *
   * 给**没走工厂**的使用者用（自己 `createSurface` 那种）；走 `createManimRenderer` 的
   * 直接把回调写在工厂选项里就行，会一路传下来。`run()` 的 `handlers.onLoading` 优先于此。
   */
  onLoading?: (names: string[]) => void
}

/** 在给定容器里造一块画布。契约：容器由调用方给、由调用方管生命周期。 */
export async function createSurface(container: HTMLDivElement, options: SurfaceOptions = {}): Promise<Surface> {
  const manim = await loadManim()

  // 场景槽：2D 起手，真跑到 3D 场景时换一块真 3D 画布。**「换」的动作只有一处实现**
  // （engine/canvas.ts 的 createSceneSlot）——工具侧的截图自查台用的是同一份。
  const slot = createSceneSlot(container, manim, WIDTH, HEIGHT)
  let tail: Promise<unknown> = Promise.resolve()
  let disposed = false
  let lastCode: string | null = null
  let lastHandlers: RunHandlers = {}
  let rendered = false

  /** 跑一段（在 tail 排队内调用）。 */
  const execute = async (code: string, handlers: RunHandlers): Promise<void> => {
    const bridge = createManimWebBridge({
      manim: manim as unknown as ManimNamespace,
      scene: slot.scene(),
      sceneFor: slot.sceneFor,
      fast: options.fast === true,
    })
    await runPython(code, bridge, {
      output: (text) => console.info('[manim-live] print:', text.trimEnd()),
      // 本次 run 自己给的回调优先，其次退化到建画布时给的那一份（工厂选项一路传下来的）。
      onLoading: handlers.onLoading ?? options.onLoading,
      // 排队期间（全页一次只跑一段）这块画布可能已经拆了：轮到这段时再问一次，
      // 作废就整段丢，不占着队首白跑一遍代码。
      active: () => !disposed,
    })
  }

  return {
    run(code: string, handlers: RunHandlers = {}): Promise<RunResult> {
      const job = tail.then(async () => {
        if (handlers.context !== undefined) {
          throw new Error(
            'manim-live：执行上下文（run 的 context 参数）排在 Phase 3，尚未实现——' +
              '现在每次 run 都是独立执行，变量不跨次保留。',
          )
        }
        // 拆掉之后一律作废（不是「失败」）：调用方看见 cancelled 就该闭嘴，
        // 不像错误那样报出来——自己拆的画布跑不成，不算渲染失败。
        if (disposed) throw new PyRunCancelled()
        await execute(code, handlers)
        lastCode = code
        lastHandlers = handlers
        rendered = true
      })
      tail = job.catch(() => {}) // 前一段失败不阻断后面排队的分段
      return job.then(
        () => ({ ok: true }),
        (error: unknown) => {
          if (error instanceof PyRunCancelled) return { ok: false, cancelled: true }
          console.error('[manim-live] run failed:', error)
          const message = error instanceof PyRuntimeError ? error.message : String(error)
          return { ok: false, error: message }
        },
      )
    },

    async replay(): Promise<void> {
      const code = lastCode
      if (code === null) throw new Error('manim-live：还没跑过任何代码，没得重播')
      const job = tail.then(async () => {
        if (disposed) throw new PyRunCancelled()
        // 作废当前场景并建一块新的（**同一场景种类**）：这条就是「从头真播」——不复用旧场景，
        // 免得上一次留下的物体、追踪器、相机姿态串到这一遍里。
        slot.reset()
        rendered = false
        await execute(code, lastHandlers)
        rendered = true
      })
      tail = job.catch(() => {})
      await job
    },

    canvas(): HTMLCanvasElement | null {
      const element = container.querySelector('canvas')
      return element instanceof HTMLCanvasElement ? element : null
    },

    isRendered(): boolean {
      return rendered
    },

    dispose(): void {
      disposed = true
      // slot.dispose() 里就是 scene.dispose()：释放 mobject、WebGL 上下文与 resize 观察者，
      // 并从容器摘掉 canvas。
      slot.dispose()
    },
  }
}
