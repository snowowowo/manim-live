/**
 * 场景会话（黑板步进）：一块画布上的**持久执行上下文**。
 *
 * - 命名空间跨段保留（第 2 段直接引用第 1 段建的 `circle`）、`self` 绑定常驻场景；
 * - 段提交协议：干跑预检（带已提交名字表）→ 上画布执行 → **成功才入档**；
 *   失败自动回滚——新命名空间 + 清场 + **同一块桥上极速重演**已提交段
 *   （句柄的连续性要求桥不能换，所以极速档做成运行期可切换的 `setFast`）；
 * - 会话全程复用一块桥、一块画布（不闪、不换 canvas 元素）。
 * - **场景种类由调用方给定**（`kind`）：常驻 `self` 早于第一段代码存在，代码里没地方问种类；
 *   而「换种类」在桥那边是拆了重建（见 canvas.ts 的 sceneFor）——落笔之后补不了。
 *
 * 机制的边界（什么不在这儿）：旁白、节奏、文稿 manifest、步截图——那些归壳
 * （判据见核心包页「边界判据」）。
 */
import { PyRunCancelled, runSessionOp } from '../py/runtime.ts'
import { createManimWebBridge, type ManimNamespace } from '../py/manim-bridge.ts'
import { createDryRunBridge } from '../py/dry-run-bridge.ts'
import type { ManimBridge } from '../py/bridge.ts'

export interface SessionVerdict {
  ok: boolean
  error?: string
  /** 会话已销毁等「不是错误」的作废：调用方不应显示任何内容。 */
  cancelled?: boolean
}

export interface SessionAppend extends SessionVerdict {
  /** 成功提交后的步号（从 1 计；失败不占号）。 */
  step?: number
}

export interface Session {
  /** 干跑预检一段（带已提交段的名字表，按种类造存根）：不碰画布、毫秒级。 */
  check(code: string): Promise<SessionVerdict>
  /** 追加执行一段：先预检，过了才上画布；成功入档并给步号，失败自动回滚到干净态。 */
  append(code: string): Promise<SessionAppend>
  /** 已提交段数——步号 = 段序（从 1 计），失败不占号。 */
  readonly count: number
  /** 已提交段的文件投影（段间空行相接）。 */
  source(): string
  /** 结束会话：释放命名空间；之后的操作全部作废（cancelled）。 */
  dispose(): void
}

export interface PySessionOptions {
  manim: ManimNamespace
  /** 常驻场景（渲染器传场景槽的当前场景；测试传 headless 场景）。 */
  scene: object
  sceneFor?: (kind: string) => object
  /**
   * 常驻场景的**种类**（CE 场景基类名，默认 `'Scene'`）。
   *
   * 必须是会话参数，不能由后续代码补：常驻 `self` 早于第一段代码存在，而「换种类」在桥那边
   * 是 `dispose()` + 新建（画布只有一块）——落笔之后换就等于把已讲的内容撕掉。
   */
  kind?: string
  fast?: boolean
  /** print 输出落点（缺省丢弃）。 */
  onOutput?: (text: string) => void
  /** 排队钩子：把画布工作排进所属 Surface 的串行尾（缺省 = 立即执行，测试用）。 */
  enqueueOnSurface?: <T>(job: () => Promise<T>) => Promise<T>
}

/** 会话 id（页内唯一即可）：Python 侧 `_SESSIONS` 字典的键。 */
let nextSid = 0

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error))

export async function createPySession(options: PySessionOptions): Promise<Session> {
  const bridge = createManimWebBridge({
    manim: options.manim,
    scene: options.scene,
    sceneFor: options.sceneFor,
    fast: options.fast === true,
  })
  const sid = `session-${++nextSid}`
  const committed: string[] = []
  const surface = options.enqueueOnSurface ?? ((job) => job())
  const output = options.onOutput ?? (() => {})
  let disposed = false

  const active = () => !disposed
  const kind = options.kind ?? 'Scene'
  const runOp = (op: Parameters<typeof runSessionOp>[0], source?: string, use: ManimBridge = bridge) =>
    runSessionOp(op, sid, source, use, { active, output, kind })

  await runOp('begin')  /** 失败段可能已把残迹写上画布：新命名空间 + 清场 + 极速重演已提交段。 */
  const rollback = async (): Promise<void> => {
    bridge.setFast?.(true)
    try {
      await runOp('reset')
      for (const segment of committed) {
        await runOp('exec', segment)
      }
    } finally {
      bridge.setFast?.(false)
    }
  }

  const check = async (code: string): Promise<SessionVerdict> => {
    if (disposed) return { ok: false, cancelled: true }
    try {
      // 预检静默：它也会把段执行一遍（干跑），print 是实现噪音，不接到调用方的输出上。
      await runSessionOp('check', sid, code, createDryRunBridge(), { active })
      return { ok: true }
    } catch (error) {
      if (error instanceof PyRunCancelled) return { ok: false, cancelled: true }
      // 预检不通过是一个结论，不是故障（与 ManimRenderer.check 同一条纪律）。
      console.info('[manim-live] session check rejected:', message(error))
      return { ok: false, error: message(error) }
    }
  }

  return {
    check,

    async append(code: string): Promise<SessionAppend> {
      if (disposed) return { ok: false, cancelled: true }
      const verdict = await check(code)
      if (!verdict.ok) return verdict
      try {
        await surface(() => runOp('exec', code))
        committed.push(code)
        return { ok: true, step: committed.length }
      } catch (error) {
        if (error instanceof PyRunCancelled) return { ok: false, cancelled: true }
        console.error('[manim-live] session append failed, rolling back:', error)
        try {
          await surface(() => rollback())
        } catch (rollbackError) {
          console.error('[manim-live] session rollback failed:', rollbackError)
        }
        return { ok: false, error: message(error) }
      }
    },

    get count(): number {
      return committed.length
    },

    source(): string {
      return committed.join('\n\n')
    },

    dispose(): void {
      if (disposed) return
      disposed = true
      void runSessionOp('end', sid, undefined, bridge, {}).catch((error) => {
        console.error('[manim-live] session end failed:', error)
      })
    },
  }
}
