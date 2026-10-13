/**
 * 时间轴回放回归：**整段代码 → 一条可定位的时间轴**。
 *
 * 用真 headless 场景（同 session.test.ts 的路子）：动画与状态是真的，不碰 DOM / WebGL。
 * 钉住的语义：
 *  - 收集不占时间：`createPlayback` 建完即回，时长来自段账（动画 + 等待）；
 *  - 帧级定位与**回看还原**：往后 seek 到终态、往回 seek 回起点，状态真的回去
 *    （靠 MasterTimeline 的全量 reset + 动画前快照）；
 *  - 「尚未引入」的物体在早期时刻被藏起来（第二段才出场的物体在 t=0 不可见）；
 *  - play / pause / step 的状态机与按帧步进；
 *  - dispose 把时间轴摘掉。
 */
import { describe, expect, it } from 'vitest'
import * as manimModule from 'manim-web'
import { setPyodideLoader, runPython } from '../py/runtime.ts'
import { createManimWebBridge, type ManimNamespace } from '../py/manim-bridge.ts'
import { collectPlayback, type Playback } from './playback.ts'
import { testPyodideLoader } from '../../scripts/test-pyodide.mjs'

const manim = manimModule as unknown as ManimNamespace
setPyodideLoader(testPyodideLoader('playback'))

// headless 场景的播放循环走 requestAnimationFrame，Node 里没有——补一个（同 session.test.ts）。
const globals = globalThis as unknown as Record<string, unknown>
globals.requestAnimationFrame ??= (callback: (time: number) => void): number =>
  Number(setTimeout(() => callback(performance.now()), 16))
globals.cancelAnimationFrame ??= (id: number): void => {
  clearTimeout(id)
}

function headless(): object {
  const Scene = (manimModule as unknown as { Scene: { createHeadless(options?: unknown): object } }).Scene
  return Scene.createHeadless({ width: 1280, height: 720 })
}

/** 复刻 Surface.createPlayback 的三步：收集桥跑代码 → finish 收口。 */
async function buildPlayback(code: string): Promise<{ playback: Playback; scene: object }> {
  const scene = headless()
  const { collector, finish } = collectPlayback(manim, scene)
  const bridge = createManimWebBridge({ manim, scene, collect: collector })
  await runPython(code, bridge)
  return { playback: finish(), scene }
}

const mobjectsOf = (scene: object): { opacity: number }[] =>
  [...(scene as { mobjects: ReadonlySet<{ opacity: number }> }).mobjects]

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms))

describe('时间轴回放：收集与定位', () => {
  it('收集不占时间：建完即回，时长 = 动画 + 等待，段账两段', async () => {
    const { playback } = await buildPlayback(
      'c = Circle()\nself.play(Create(c), run_time=2)\nself.wait(1.5)\n',
    )
    expect(playback.duration()).toBeCloseTo(3.5, 2)
    expect(playback.segments()).toHaveLength(2)
    expect(playback.segments()[1]?.isWait).toBe(true)
    // 刚建好是起点帧、还没动过
    expect(playback.time()).toBeCloseTo(0, 3)
    expect(playback.state()).toBe('ready')
    playback.dispose()
  }, 120_000)

  it('帧级定位与回看还原：seek 到终态再 seek 回起点，状态真的回去', async () => {
    const { playback, scene } = await buildPlayback('d = Dot(color=RED)\nself.play(FadeIn(d), run_time=1)\n')
    const [dot] = mobjectsOf(scene)
    expect(dot).toBeDefined()

    // 起点：淡入还没开始，不可见
    expect(dot!.opacity).toBeCloseTo(0, 2)

    playback.seek(playback.duration())
    expect(dot!.opacity).toBeCloseTo(1, 2)

    // 往回拖：全量 reset + 快照还原（这是「回看」的核心语义）
    playback.seek(0)
    expect(dot!.opacity).toBeCloseTo(0, 2)

    // 再往后一帧：已经开始、但还没满
    playback.seek(0.5)
    expect(dot!.opacity).toBeGreaterThan(0.1)
    expect(dot!.opacity).toBeLessThan(0.95)
    playback.dispose()
  }, 120_000)

  it('「尚未引入」的物体在早期时刻被藏起来：第二段才出场的物体在 t=0 不可见', async () => {
    const { playback, scene } = await buildPlayback(
      'a = Dot()\nb = Square()\nself.play(FadeIn(a), run_time=1)\nself.play(FadeIn(b), run_time=1)\n',
    )
    const [a, b] = mobjectsOf(scene)
    expect(a).toBeDefined()
    expect(b).toBeDefined()
    expect(playback.duration()).toBeCloseTo(2, 2)

    // t=0.5：a 正在淡入，b 按段账还没出场
    playback.seek(0.5)
    expect(a!.opacity).toBeGreaterThan(0)
    expect(b!.opacity).toBeCloseTo(0, 2)

    // t=1.5：轮到 b
    playback.seek(1.5)
    expect(a!.opacity).toBeCloseTo(1, 2)
    expect(b!.opacity).toBeGreaterThan(0)
    playback.dispose()
  }, 120_000)

  it('play / pause / step：真实推进、暂停停表、按帧步进', async () => {
    const { playback } = await buildPlayback('d = Dot(color=BLUE)\nself.play(FadeIn(d), run_time=1.2)\n')
    const fps = playback.fps()
    expect(fps).toBeGreaterThan(0)

    playback.play()
    expect(playback.state()).toBe('playing')
    await sleep(200)
    const mid = playback.time()
    expect(mid).toBeGreaterThan(0.05)
    expect(mid).toBeLessThan(1.2)

    playback.pause()
    expect(playback.state()).toBe('paused')
    const paused = playback.time()
    await sleep(120)
    // 暂停之后时钟不再走（允许期间那一帧的收尾误差）
    expect(Math.abs(playback.time() - paused)).toBeLessThan(0.1)

    // 帧步进：前进一帧 = 1/fps
    playback.step(1)
    expect(playback.time()).toBeCloseTo(Math.min(paused + 1 / fps, 1.2), 2)
    // 后退一帧
    playback.step(-1)
    expect(playback.time()).toBeLessThan(paused + 1 / fps)

    playback.dispose()
  }, 120_000)

  it('整段样例（Axes + Create×2 + MathTex Write）能收进时间轴——回归「VGroup.setPoints: expected 443…got 886」', async () => {
    // 真机事故：收集分支里把「play 之后的补丁」放到了 play 之前跑，补丁动了点集分区，
    // 866=2×443 的报错就在首屏那段起手样例上炸的。这里把原样代码钉住：收得上、拖得动。
    const sample = [
      'ax = Axes(x_range=[-2, 2, 1], y_range=[-2, 2, 1])',
      'circle = Circle(radius=1)',
      'circle.move_to(ax.c2p(0, 0, 0))',
      'circle.set_color("#247bbf")',
      'self.add(ax, circle)',
      'self.play(Create(ax), Create(circle))',
      // 真机样例这里是一枚 MathTex；无头场景渲染不了它（异步走 SVG，headless 没有 tagName），
      // 换成一个等价的多子物 VGroup——回归目标是 VGroup 的点集分区，与公式无关。
      'group = VGroup(Circle(radius=0.3), Square(side_length=0.5))',
      'group.move_to(ax.c2p(0, 1.5, 0))',
      'self.play(Write(group))',
    ].join('\n')
    const { playback } = await buildPlayback(sample)
    expect(playback.duration()).toBeGreaterThan(0)
    expect(playback.segments()).toHaveLength(2)
    playback.seek(playback.duration())
    playback.seek(0)
    playback.dispose()
  }, 120_000)

  it('dispose 把时间轴摘掉', async () => {
    const { playback, scene } = await buildPlayback('d = Dot()\nself.play(FadeIn(d), run_time=0.5)\n')
    playback.dispose()
    expect((scene as { timeline: unknown }).timeline).toBeNull()
  }, 120_000)
})
