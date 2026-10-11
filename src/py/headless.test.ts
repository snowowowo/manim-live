/**
 * 真 headless 画布回归：**动画与 updater 真的会被驱动**。
 *
 * 为什么单开一份：`manim-bridge.test.ts` / `examples.test.ts` 用的假画布把 play / wait 换成空函数，
 * 于是「动画有没有真的跑、updater 有没有被调到」根本没被验到。踩过的两个坑都躲在那个盲区里：
 *
 *  - updater 收到的第一个参数是 manim-web 的**裸 JS 对象**（只有 camelCase 方法），
 *    模型写的 `lambda m: m.move_to(...)` 直接 AttributeError；
 *  - 单参 updater 被 manim-web 按 (mobject, dt) 调用，抛 "takes 1 positional argument but 2 were given"。
 *
 * 两个错都抛在**渲染循环里**：manim-web 捕获后停掉循环，play 的 promise 永远不 resolve，
 * 页面一直转。所以这里用真的 headless Scene 把整条路走通，并把「极速模式不真等」也钉死。
 */
import { describe, expect, it } from 'vitest'
import * as manimModule from 'manim-web'
import { runPython, setPyodideLoader } from './runtime.ts'
import { createManimWebBridge, type ManimNamespace } from './manim-bridge.ts'
import { createDryRunBridge } from './dry-run-bridge.ts'
import { SCENE_FAMILY, THREE_D_CAMERA_DEFAULTS, resolveSceneKind } from './surface.ts'
import { createScene, type ManimScene, type CreateSceneOptions } from '../engine/canvas.ts'
import type { ManimRuntime } from '../engine/library.ts'
import { testPyodideLoader } from '../../scripts/test-pyodide.mjs'

const manim = manimModule as unknown as ManimNamespace
const manimRuntime = manimModule as unknown as ManimRuntime

// 装载细节（临时缓存目录 + 先铺随包 wheel，两条理由）见 scripts/test-pyodide.mjs。
setPyodideLoader(testPyodideLoader('headless'))

// headless 场景带 updater 的 wait 走 requestAnimationFrame，Node 里没有——补一个，
// 否则真等待直接 ReferenceError（实测）。
const globals = globalThis as unknown as Record<string, unknown>
globals.requestAnimationFrame ??= (callback: (time: number) => void): number =>
  Number(setTimeout(() => callback(performance.now()), 16))
globals.cancelAnimationFrame ??= (id: number): void => { clearTimeout(id) }

/** 真 headless Scene：不碰 DOM / WebGL，但动画、时间线、updater 都是真的。 */
function headless(): object {
  const Scene = (manimModule as unknown as { Scene: { createHeadless(options?: unknown): object } }).Scene
  return Scene.createHeadless({ width: 1280, height: 720 })
}

/** 跑一段代码，收 print 的输出（用于把「跑完到底什么样」带出来断言）。 */
async function run(code: string, fast: boolean): Promise<{ text: string; ms: number }> {
  const printed: string[] = []
  const started = performance.now()
  await runPython(code, createManimWebBridge({ manim, scene: headless(), fast }), {
    output: (text) => printed.push(text),
  })
  return { text: printed.join('\n'), ms: performance.now() - started }
}

/** tracker 驱动一个点：单参 lambda + CE 方法名（move_to），两个坑都在这一行里。 */
const TRACKER = `from manim import *


class Demo(Scene):
    def construct(self):
        tracker = ValueTracker(0)
        dot = Dot(point=[-2, 0, 0], color=RED)
        dot.add_updater(lambda m: m.move_to([tracker.get_value() - 2, 0, 0]))
        self.add(tracker, dot)
        self.play(tracker.animate.set_value(2), run_time=0.2)
        self.wait(0.05)
        print("CENTER", round(float(dot.get_center()[0]), 3))
`

/** 取 print 出来的 CENTER 行。 */
function center(text: string): number {
  const line = text.split('\n').find((item) => item.startsWith('CENTER'))
  expect(line, `没有拿到 CENTER 行：\n${text}`).toBeDefined()
  return Number(line!.slice('CENTER'.length).trim())
}

describe('真画布：updater 与动画确实被驱动', () => {
  it('单参 lambda + CE 方法名能真的把点挪走（move_to 落到最终位置）', async () => {
    const { text } = await run(TRACKER, false)
    // tracker 从 0 走到 2 → 点从 -2 挪到 0
    expect(center(text)).toBeCloseTo(0, 1)
  }, 60_000)

  it('dt 双参 updater：wait 期间按真实时间推进', async () => {
    const { text } = await run(
      `from manim import *


class Demo(Scene):
    def construct(self):
        dot = Dot(point=[0, 0, 0], color=RED)

        def step(m, dt):
            m.shift(RIGHT * dt * 2)

        dot.add_updater(step)
        self.add(dot)
        self.wait(0.3)
        print("CENTER", round(float(dot.get_center()[0]), 2))
`,
      false,
    )
    // 0.3 秒每秒走 2 个单位：至少走了一小段（不断言精确值——帧数不定）
    expect(center(text)).toBeGreaterThan(0.2)
  }, 60_000)
})

/** 取 print 出来的 OPACITY 行（源、目标两个不透明度）。 */
function opacities(text: string): [number, number] {
  const line = text.split('\n').find((item) => item.startsWith('OPACITY'))
  expect(line, `没有拿到 OPACITY 行：\n${text}`).toBeDefined()
  const [source, target] = line!.slice('OPACITY'.length).trim().split(/\s+/).map(Number)
  return [source, target]
}

/** 取 print 出来的单个数字行（如 WIDTH 4）。 */
function numberLine(text: string, tag: string): number {
  const line = text.split('\n').find((item) => item.startsWith(tag))
  expect(line, `没有拿到 ${tag} 行：\n${text}`).toBeDefined()
  return Number(line!.slice(tag.length).trim())
}

/**
 * manim-web 的「点数对齐」型动画（`Transform` / `ReplacementTransform` / `FadeTransform` /
 * `FadeTransformPieces` / `ClockwiseTransform` / `CounterclockwiseTransform`）在 `begin()` 里
 * **直接调 `alignVmobjectPair`（或经 PointMorphStrategy）、没有任何兜底**：两端点数对不齐就抛
 * `alignVmobjectPair: alignPoints fallback produced mismatched point counts`（真机事故文案是 905 vs 589）。
 * 它抛在**渲染循环里** → play 的 promise 永不 resolve、页面一直转；而假画布（play / wait 换空函数）
 * 把动画整个跳过，根本看不见这个坑。所以只能钉在真场景里。
 *
 * 适配层的应付：真跑前拿**复制品试跑一次 begin()**——对得齐就用真动画（保住 morph），对不齐才退到交叉淡入淡出。
 * 所以断言分两头：「抛过的那几对不再抛」（源淡到 0、目标淡到 1）＋「对得齐的一对仍真 morph」（宽度真的变过去）。
 */
describe('真画布：点数对不齐的 morph 动画不再打死渲染循环', () => {
  const script = (source: string, target: string, animation: string, probe: string): string => `from manim import *


class Demo(Scene):
    def construct(self):
        a = ${source}
        b = ${target}
        self.add(a)
        self.play(${animation}, run_time=0.3)
        ${probe}
`
  const opacify = (source: string, target: string, animation: string): string =>
    script(source, target, animation, 'print("OPACITY", round(float(a.opacity), 2), round(float(b.opacity), 2))')

  it('FadeTransform：点数不一致的 VGroup 对（子物个数也不同）', async () => {
    const { text } = await run(opacify('VGroup(Triangle(), Circle(), Square())', 'VGroup(Circle())', 'FadeTransform(a, b)'), false)
    const [source, target] = opacities(text)
    expect(source).toBeCloseTo(0, 1)
    expect(target).toBeCloseTo(1, 1)
  }, 60_000)

  it('FadeTransform：Arrow → Star', async () => {
    const { text } = await run(opacify('Arrow()', 'Star()', 'FadeTransform(a, b)'), false)
    const [source, target] = opacities(text)
    expect(source).toBeCloseTo(0, 1)
    expect(target).toBeCloseTo(1, 1)
  }, 60_000)

  it('Transform / ReplacementTransform：Arrow → Star 也不抛', async () => {
    for (const animation of ['Transform(a, b)', 'ReplacementTransform(a, b)']) {
      const { text } = await run(opacify('Arrow()', 'Star()', animation), false)
      const [source, target] = opacities(text)
      expect(source, animation).toBeCloseTo(0, 1)
      expect(target, animation).toBeCloseTo(1, 1)
    }
  }, 60_000)

  it('Clockwise / Counterclockwise：VGroup 对不齐也不抛', async () => {
    for (const animation of ['ClockwiseTransform(a, b)', 'CounterclockwiseTransform(a, b)']) {
      const { text } = await run(opacify('VGroup(Triangle(), Square())', 'VGroup(Circle())', animation), false)
      const [source, target] = opacities(text)
      expect(source, animation).toBeCloseTo(0, 1)
      expect(target, animation).toBeCloseTo(1, 1)
    }
  }, 60_000)

  it('对得齐的一对仍走真 morph（不误退兜底）', async () => {
    // Circle 半径 1（宽 2）→ Square(side_length=4)：这一对能对齐，所以 a 的宽度要真的变到 4；
    // 若被误退成交叉淡入淡出，a 不动、宽度仍是 2。
    const { text } = await run(
      script('Circle()', 'Square(side_length=4)', 'Transform(a, b)', 'print("WIDTH", round(float(a.width), 2))'),
      false,
    )
    expect(numberLine(text, 'WIDTH')).toBeCloseTo(4, 1)
  }, 60_000)
})

describe('极速模式：不真等，但把 updater 推到终态', () => {
  it('run_time=3 与 wait(3) 都不花真实时间，点仍落到最终位置', async () => {
    const { text, ms } = await run(
      `from manim import *


class Demo(Scene):
    def construct(self):
        tracker = ValueTracker(0)
        dot = Dot(point=[-2, 0, 0], color=RED)
        dot.add_updater(lambda m: m.move_to([tracker.get_value() - 2, 0, 0]))
        self.add(tracker, dot)
        self.play(tracker.animate.set_value(2), run_time=3)
        self.wait(3)
        print("CENTER", round(float(dot.get_center()[0]), 3))
`,
      true,
    )
    expect(center(text)).toBeCloseTo(0, 2)
    // 按真实时间要 6 秒；极速下一帧就完事，给足余量仍然远小于 6 秒
    expect(ms).toBeLessThan(3_000)
  }, 60_000)

  it('updater 推的是「整段时长」，不是只走一步', async () => {
    const { text } = await run(
      `from manim import *


class Demo(Scene):
    def construct(self):
        dot = Dot(point=[0, 0, 0], color=RED)

        def step(m, dt):
            m.shift(RIGHT * dt)

        dot.add_updater(step)
        self.add(dot)
        self.wait(2.0)
        print("CENTER", round(float(dot.get_center()[0]), 2))
`,
      true,
    )
    // 2 秒每秒走 1 个单位 → 约 2；只走一步的话会是 1/60 左右
    expect(center(text)).toBeCloseTo(2, 1)
  }, 60_000)
})

/**
 * manim-web 的 `UpdateFromFunc` / `UpdateFromAlphaFunc` 回调签名是 `func(mobject, alpha)`
 * （两个类的 `interpolate` 里就是 `this._func(this.mobject, alpha)`），那个 mobject 是它自己的
 * **裸 JS 对象**——与 `add_updater` 同一个坑的另一个入口：模型按 CE 习惯写的
 * `lambda m, alpha: m.set_opacity(...)` 当场 AttributeError，且抛在**渲染循环里**，
 * 循环被停掉、play 的 promise 永不 resolve，卡片一直「渲染中」（真机现象：一直转 + 日志里
 * `headless render loop error ... AttributeError: set_opacity`）。所以只能钉在真画布上。
 */
describe('真画布：更新函数的回调看到的是 Python 包装，不是裸 JS 对象', () => {
  it('UpdateFromAlphaFunc：回调里 m.set_opacity(...) 打得开', async () => {
    const { text } = await run(
      `from manim import *


class Demo(Scene):
    def construct(self):
        sq = Square(color=BLUE)
        self.add(sq)
        self.play(UpdateFromAlphaFunc(sq, lambda m, alpha: m.set_opacity(alpha)), run_time=0.3)
        print("OPACITY", round(float(sq.opacity), 2))
`,
      false,
    )
    // alpha 从 0 走到 1：跑完必须回到不透明；AttributeError 的话这里拿不到 OPACITY 行
    expect(numberLine(text, 'OPACITY')).toBeCloseTo(1, 1)
  }, 60_000)

  it('UpdateFromFunc：CE 习惯的单参回调也收得下（manim-web 固定按双参调）', async () => {
    const { text } = await run(
      `from manim import *


class Demo(Scene):
    def construct(self):
        dot = Dot(point=[0, 0, 0], color=RED)
        self.add(dot)
        self.play(UpdateFromFunc(dot, lambda m: m.move_to([1, 0, 0])), run_time=0.2)
        print("CENTER", round(float(dot.get_center()[0]), 2))
`,
      false,
    )
    expect(center(text)).toBeCloseTo(1, 1)
  }, 60_000)

  it('组合写法：点数对不齐的 morph 后面接 UpdateFromAlphaFunc 也跑得完', async () => {
    // 用户事故就是这两样叠在一起（FadeTransform(eq, result) + UpdateFromAlphaFunc）。这里**故意**
    // 不用 MathTex：MathTex 在 Node 里没有 DOM，构造时发起的异步排版必然 reject
    // （svgElement has no tagName），会让整轮 vitest 以「有未处理拒绝」退出 1——那是 Node 环境
    // 的固有噪声，跟被测行为无关。文本那一对由语料回归（假画布）与真机自测覆盖。
    const { text } = await run(
      `from manim import *


class Demo(Scene):
    def construct(self):
        source = Arrow()
        target = Star()
        self.add(source)
        self.play(FadeTransform(source, target), run_time=0.3)
        self.play(UpdateFromAlphaFunc(target, lambda m, alpha: m.set_opacity(0.2 + 0.8 * alpha)), run_time=0.3)
        print("OPACITY", round(float(source.opacity), 2), round(float(target.opacity), 2))
`,
      false,
    )
    const [sourceOpacity, targetOpacity] = opacities(text)
    // 源淡掉、目标亮出来——两处坑（点数对不齐、回调参数）都按兜底/包装走通
    expect(sourceOpacity).toBeCloseTo(0, 1)
    expect(targetOpacity).toBeCloseTo(1, 1)
  }, 60_000)
})

/**
 * VGroup 遍历：真机事故——`for m in group:` 会**卡死**。
 *
 * 适配层越界取不到子物体时只把 None 原样返回（真桥的 get(i) 越界就是 undefined），
 * Python 的迭代协议靠 IndexError 收尾，收不到尾就永远取「下一个」，一路把内存吃满。
 * 这里用真画布钉死契约：迭代按子物体数收尾，越界下标当场抛 IndexError。
 */
describe('真画布：VGroup 遍历按子物体数收尾', () => {
  it('for / 推导式 / 越界下标', async () => {
    const { text } = await run(
      `from manim import *


class Demo(Scene):
    def construct(self):
        dots = VGroup(*[Dot(point=[i - 2, 0, 0]) for i in range(4)])
        moved = 0
        for m in dots:
            m.shift(UP * 0.2)
            moved += 1
        ys = [round(float(m.get_center()[1]), 3) for m in dots]
        try:
            dots[99]
            tail = "no-error"
        except IndexError:
            tail = "index-error"
        print("ITER", moved, len(ys), ys[0], tail)
`,
      true,
    )
    expect(text).toContain('ITER 4 4 0.2 index-error')
  }, 60_000)

  it('len(group) 报子物体数；非分组物体抛 TypeError', async () => {
    const { text } = await run(
      `from manim import *


class Demo(Scene):
    def construct(self):
        dots = VGroup(*[Dot() for _ in range(5)])
        try:
            bad = len(Circle())
            tail = "no-error:%d" % bad
        except TypeError:
            tail = "type-error"
        print("LEN", len(dots), tail)
`,
      true,
    )
    expect(text).toContain('LEN 5 type-error')
  }, 60_000)
})

/**
 * 「回调在前」那一族动画：CE 写 `ApplyFunction(func, mobject)`、manim-web 的工厂是
 * `applyFunction(mobject, func)`（Apply*PointwiseFunction / Homotopy 家族 / PhaseFlow 同理）。
 * 参数顺序错了**假画布一点看不出来**——动画只构造、不跑到 `begin()`，于是预检与假画布全绿，
 * 真画布一跑就 `TypeError: e.children is not iterable`（把回调当成了物体）。这里用真场景钉死，
 * 回归表在 `surface.ts` 的 ANIMATION_ARGS。
 */
describe('真画布：回调在前的动画按 manim-web 的参数顺序落地', () => {
  it('ApplyFunction / Pointwise / Homotopy 家族 / PhaseFlow 都跑得完', async () => {
    const { text } = await run(
      `from manim import *


class Demo(Scene):
    def construct(self):
        self.play(ApplyFunction(lambda m: m, Dot()), run_time=0.05)
        self.play(ApplyPointwiseFunction(lambda p: p, Dot()), run_time=0.05)
        self.play(ApplyPointwiseFunctionToCenter(lambda p: p, Dot()), run_time=0.05)
        self.play(ApplyComplexFunction(lambda z: z, Dot()), run_time=0.05)
        self.play(Homotopy(lambda x, y, z, t: [x, y, z], Dot()), run_time=0.05)
        self.play(ComplexHomotopy(lambda z, t: z, Dot()), run_time=0.05)
        self.play(SmoothedVectorizedHomotopy(lambda x, y, z, t: [x, y, z], Dot()), run_time=0.05)
        self.play(PhaseFlow(lambda p: p, Dot()), run_time=0.05)
        print("ARGS ok")
`,
      true,
    )
    expect(text).toContain('ARGS ok')
  }, 60_000)
})

/**
 * 「上了色没有」要能从真物体上读回来：PROP_READS 的 fill_color / stroke_color / fill_opacity。
 * 更重要的是钉死那桩语料事故——manim-web 的 set color 存取器**同时写** strokeColor 与
 * fillColor，而 setStyle({strokeColor}) 内部正是 `this.color = …`：色板先 set_fill 再
 * set_stroke(width=0, color=BLACK)，76 个方块全部被冲成黑色（假画布上样样「正常」）。
 * 修法是描边颜色走 strokeColor 属性写（MethodCall.prop），这里用真物体验证两条通道互不干扰。
 */
describe('真画布：set_fill 与 set_stroke 各走各的通道', () => {
  it('set_fill 之后再 set_stroke，填充色不被冲掉', async () => {
    const { text } = await run(
      `from manim import *


class Demo(Scene):
    def construct(self):
        s = Square(side_length=1).set_fill(RED, opacity=1.0).set_stroke(width=0, color=BLACK)
        print("FILL", s.fill_color, round(float(s.fill_opacity), 2), s.stroke_color)
`,
      true,
    )
    expect(text).toContain('FILL #FC6255 1.0 #000000')
  }, 60_000)

  it('fill_color / stroke_color / fill_opacity 都能读回来', async () => {
    const { text } = await run(
      `from manim import *


class Demo(Scene):
    def construct(self):
        s = Square(side_length=1, fill_color=BLUE, fill_opacity=0.6)
        print("READ", s.fill_color, round(float(s.fill_opacity), 2))
`,
      true,
    )
    expect(text).toContain('READ #58C4DD 0.6')
  }, 60_000)
})

/**
 * Phase 2：`class X(ThreeDScene)` 拿到的是**真 3D 场景**。
 *
 * 钉死的是「3D 形状全黑」的根因（Node 实测的对照）：2D 的 `Scene` 为了让图层正确叠放会把材质的
 * `depthTest` 关掉，而且场景里**一盏灯都没有**（`lights=0, depthTest=[false]`）——
 * Cube / Sphere 用的是吃光的材质，没光就是纯黑。换成 manim-web 的真 `ThreeDScene` 之后，
 * 同一段代码是 `lights=3, depthTest=[true]`。
 *
 * 「画出来长什么样」由语料截图核（`scripts/shot-corpus.mjs` + 真浏览器）；
 * 这里钉的是**机制**：场景种类真换过去了、相机真是 3D 的、材质真开了深度写回、场景里真有光。
 */
describe('真画布：ThreeDScene 拿到的是真 3D 场景（不是套在 2D 画布上）', () => {
  /** 建一块场景（无容器 → manim-web 的空渲染器，Node 里没有 WebGL）。 */
  const sceneOf = (kind: string, options: CreateSceneOptions = {}): ManimScene =>
    createScene(null, manimRuntime, 1280, 720, { kind, headless: true, ...options })

  /** 场景内部结构：单测要读的扩展成员，按用途做结构类型（与 canvas.ts 的 ManimScene 互补）。 */
  interface SceneInternals {
    camera3D: { getOrbitAngles(): { phi: number; theta: number; distance: number } }
    threeScene: { traverse(visit: (object: { isLight?: boolean }) => void): void }
    mobjects: Set<unknown>
    dispose(): void
  }
  const internals = (scene: ManimScene): SceneInternals => scene as unknown as SceneInternals

  /** 一个物体身上所有材质的 depthTest（Cube 的面是 Mesh，材质挂在下层节点上）。 */
  const depthTests = (mobject: unknown): boolean[] => {
    const found: boolean[] = []
    const target = mobject as { getThreeObject(): { traverse(visit: (node: { material?: unknown }) => void): void } }
    target.getThreeObject().traverse((node) => {
      const material = node.material
      if (material === undefined || material === null) return
      for (const one of Array.isArray(material) ? material : [material]) {
        found.push((one as { depthTest?: boolean }).depthTest === true)
      }
    })
    return found
  }

  /** 场景里的灯（ThreeDScene 默认装 3 盏）。 */
  const lightCount = (scene: ManimScene): number => {
    let count = 0
    internals(scene).threeScene.traverse((object) => {
      if (object.isLight === true) count += 1
    })
    return count
  }

  /** 在**给定**场景里跑一段代码，收 print 输出。 */
  async function runOn(code: string, scene: ManimScene, sceneFor?: (kind: string) => object): Promise<string> {
    const printed: string[] = []
    await runPython(code, createManimWebBridge({ manim, scene, sceneFor }), {
      output: (text) => printed.push(text),
    })
    return printed.join('\n')
  }

  const CUBE_3D = `from manim import *


class Demo(ThreeDScene):
    def construct(self):
        self.add(Cube(side_length=2))
        print("KIND", type(self).__mro__[1].__name__)
`

  it('3D 场景有 3D 相机、有光照，物体材质打开深度写回（黑块的根因没了）', async () => {
    const scene = sceneOf('ThreeDScene')
    expect(await runOn(CUBE_3D, scene)).toContain('KIND ThreeDScene')
    // 相机是 3D 的，且默认朝向就是 surface.ts 里登记的那一组（CE 的斜视直觉）
    const angles = internals(scene).camera3D.getOrbitAngles()
    expect(angles.phi).toBeCloseTo(THREE_D_CAMERA_DEFAULTS.phi, 3)
    expect(angles.theta).toBeCloseTo(THREE_D_CAMERA_DEFAULTS.theta, 3)
    expect(angles.distance).toBeCloseTo(THREE_D_CAMERA_DEFAULTS.distance, 1)
    // 有光 + 深度写回：2D 画布上这两样分别是 0 与 false（那就是全黑的原因）
    expect(lightCount(scene)).toBeGreaterThan(0)
    const [cube] = [...internals(scene).mobjects]
    expect(depthTests(cube).length).toBeGreaterThan(0)
    expect(depthTests(cube).every((value) => value)).toBe(true)
    scene.dispose()
  }, 60_000)

  it('同一段代码落在 2D 画布上就是「没光 + 关掉深度」（对照组，钉住 2D 行为不变）', async () => {
    const scene = sceneOf('Scene')
    await runOn(CUBE_3D, scene)
    // 2D 场景里没有 3D 相机，物体也没打开深度写回——这正是「3D 形状全黑」的现场
    expect('camera3D' in (scene as unknown as Record<string, unknown>)).toBe(false)
    expect(lightCount(scene)).toBe(0)
    const [cube] = [...internals(scene).mobjects]
    expect(depthTests(cube).length).toBeGreaterThan(0)
    expect(depthTests(cube).every((value) => value === false)).toBe(true)
    scene.dispose()
  }, 60_000)

  it('sceneFor 按种类换画布：2D 起手，跑到 3D 场景时换成真 3D 那一块', async () => {
    // 起手是一块 2D 画布（renderer 就是这么开局的——种类要跑到用户代码才知道），sceneFor 负责换
    const twoD = sceneOf('Scene')
    let current = twoD
    const swap = (kind: string): ManimScene => {
      if (resolveSceneKind(kind) !== 'ThreeDScene') return current
      current.dispose()
      current = sceneOf('ThreeDScene')
      return current
    }
    // 先跑一条 2D 的：画布不该被换（2D 零回归）
    await runOn(
      `from manim import *\n\n\nclass Demo(Scene):\n    def construct(self):\n        self.add(Circle())\n`,
      twoD,
      swap,
    )
    expect(current).toBe(twoD)
    expect(internals(twoD).mobjects.size).toBe(1)
    // 再跑一条 3D 的：画布换成真 3D 场景，物体落在**新**画布上
    await runOn(CUBE_3D, twoD, swap)
    expect(current).not.toBe(twoD)
    expect(lightCount(current)).toBeGreaterThan(0)
    expect(internals(current).mobjects.size).toBe(1)
    current.dispose()
  }, 60_000)

  it('manim-web 没有的场景名退回 Scene 并留在表里（不静默）', () => {
    expect(resolveSceneKind('GraphScene')).toBe('Scene')
    expect(SCENE_FAMILY.GraphScene.js).toBe(null)
    expect(SCENE_FAMILY.GraphScene.note).toBeTruthy()
    // 表里登记了 js 的，必须都是 manim-web 真导出的类——名字抄错会静默退化成 2D，最难查
    for (const [name, entry] of Object.entries(SCENE_FAMILY)) {
      if (entry.js === null) continue
      expect(typeof (manimModule as unknown as Record<string, unknown>)[entry.js], `${name} → ${entry.js}`).toBe(
        'function',
      )
    }
  })

  it('用户类只是**名叫** VectorScene 时不当成场景族（认亲按基类，不按名字）', async () => {
    // 名字撞车：用户写 class VectorScene(Scene)，类名恰好等于场景族里的一个。按名字认亲会把它
    // 升级成 manim-web 的真 VectorScene——那个类**自带一块坐标平面**，于是用户没要的网格与
    // 坐标轴凭空出现。2026-10-11 全量重截图时在 `_dev/examples/ctor/05-vector.py` 上抓到：
    // 语料只画了一支箭头，图里却多出 NumberPlane。
    const scene = sceneOf('Scene')
    const asked: string[] = []
    await runOn(
      `from manim import *


class VectorScene(Scene):
    def construct(self):
        self.add(Dot())
`,
      scene,
      (kind) => {
        asked.push(kind)
        return scene
      },
    )
    // 请求的场景种类是起手那块 2D 画布，不是 VectorScene（否则上面那句会记下 'VectorScene'）
    expect(asked).toEqual(['Scene'])
    // 场景里只有用户自己加的那一个点——没有被自动塞进坐标平面
    expect(internals(scene).mobjects.size).toBe(1)
    scene.dispose()
  }, 60_000)
})

/**
 * Phase 2 · Step 2：相机方法真的接上了。
 *
 * 这里钉的是**端到端**：`self.set_camera_orientation(...)` 走适配层 → `surface.ts` 的参数改写
 * → 桥 → manim-web 的 `ThreeDScene`，最后**相机姿态真的变了**（用公开的 `getOrbitAngles()` 读回来）。
 *
 * 为什么非要真场景：这些方法在 2D 画布上根本不存在（`setCameraOrientation` 一个都没有），
 * 参数形状也只在真对象上才验得出（CE 多给的 gamma / zoom / focal_distance 会把值挤到
 * 下一个位置参数上 → `Math.cos(对象)` = NaN → 相机位置变 NaN、画面全空且**不报错**）。
 */
describe('真画布：3D 相机方法真的驱动了相机', () => {
  const scene3d = (): ManimScene =>
    createScene(null, manimRuntime, 1280, 720, { kind: 'ThreeDScene', headless: true })

  /** 3D 场景里要读的成员（与上面 Step 1 那组同类：按用途做结构类型）。 */
  interface ThreeDInternals {
    camera3D: {
      getOrbitAngles(): { phi: number; theta: number; distance: number }
      /** 底层 three.js 相机：`up` 是我们唯一能读到「相机有没有被滚转」的地方。 */
      getCamera(): { up: { x: number; y: number; z: number } }
    }
    threeScene: object
    render(): void
    mobjects: Set<unknown>
    dispose(): void
  }
  const threeD = (scene: ManimScene): ThreeDInternals => scene as unknown as ThreeDInternals

  /** 读回相机的 up 向量（四舍五入到 6 位，方便直接比）。 */
  const readUp = (scene: ManimScene): [number, number, number] => {
    const up = threeD(scene).camera3D.getCamera().up
    const round = (value: number): number => Math.round(value * 1e6) / 1e6
    return [round(up.x), round(up.y), round(up.z)]
  }

  /** 手动推渲染循环：headless 场景的 rAF 只在 wait/play 期间跑，跑完就停。 */
  async function spin(scene: ManimScene, ms: number): Promise<void> {
    const timer = setInterval(() => threeD(scene).render(), 16)
    await new Promise((resolve) => setTimeout(resolve, ms))
    clearInterval(timer)
  }

  /** 跑一段代码（同一块场景，用来做「上一次运行留下的状态」的串联）。 */
  async function runOn(scene: ManimScene, code: string): Promise<string> {
    const printed: string[] = []
    await runPython(code, createManimWebBridge({ manim, scene }), {
      output: (text) => printed.push(text),
    })
    return printed.join('\n')
  }

  it('set_camera_orientation 立刻摆好；move_camera 动画移过去并等到落位', async () => {
    const scene = scene3d()
    await runOn(
      scene,
      `from manim import *


class Demo(ThreeDScene):
    def construct(self):
        self.add(Cube(side_length=2))
        # 四个参数里 manim-web 只认三个（其余会被挤成位置参数 → NaN），位置与关键字两种写法都试
        self.set_camera_orientation(30 * DEGREES, -60 * DEGREES)
        print("SET", 1)
`,
    )
    const afterSet = threeD(scene).camera3D.getOrbitAngles()
    expect(afterSet.phi).toBeCloseTo((30 * Math.PI) / 180, 4)
    expect(afterSet.theta).toBeCloseTo((-60 * Math.PI) / 180, 4)

    // move_camera 是 async：`await` 是 construct 的语法树改写补上的，不补就只有 NaN 或纹丝不动
    await runOn(
      scene,
      `from manim import *


class Demo(ThreeDScene):
    def construct(self):
        self.move_camera(phi=60 * DEGREES, theta=-120 * DEGREES, distance=12, run_time=0.1)
        self.wait(0.05)
`,
    )
    const afterMove = threeD(scene).camera3D.getOrbitAngles()
    expect(afterMove.phi).toBeCloseTo((60 * Math.PI) / 180, 3)
    expect(afterMove.theta).toBeCloseTo((-120 * Math.PI) / 180, 3)
    expect(afterMove.distance).toBeCloseTo(12, 1)
    // 相机位置必须是**有限数**——参数形状翻错（把选项对象塞进 angle）就会是 NaN，
    // 而 NaN 的表现是「画面全空、日志干净」，是最难查的一种
    expect(Number.isFinite(afterMove.phi)).toBe(true)
    scene.dispose()
  }, 60_000)

  it('begin / stop_ambient_camera_rotation 一个让相机转、一个让它停', async () => {
    const scene = scene3d()
    await runOn(
      scene,
      `from manim import *


class Demo(ThreeDScene):
    def construct(self):
        self.add(Cube(side_length=2))
        self.begin_ambient_camera_rotation(rate=1.0)
        self.wait(0.2)
`,
    )
    // 跑完之后 rAF 循环就停了：手动推几帧，看相机是不是还在自己转
    const before = threeD(scene).camera3D.getOrbitAngles().theta
    await spin(scene, 300)
    const after = threeD(scene).camera3D.getOrbitAngles().theta
    expect(Math.abs(after - before)).toBeGreaterThan(0.05)

    await runOn(
      scene,
      `from manim import *


class Demo(ThreeDScene):
    def construct(self):
        self.stop_ambient_camera_rotation()
`,
    )
    const stopped = threeD(scene).camera3D.getOrbitAngles().theta
    await spin(scene, 200)
    expect(threeD(scene).camera3D.getOrbitAngles().theta).toBeCloseTo(stopped, 6)
    scene.dispose()
  }, 60_000)

  it('add_fixed_in_frame_mobjects 把物体挪去 HUD 层（不再随相机转）', async () => {
    const scene = scene3d()
    await runOn(
      scene,
      `from manim import *


class Demo(ThreeDScene):
    def construct(self):
        badge = Square(side_length=1)
        cube = Cube(side_length=2)
        self.add_fixed_in_frame_mobjects(badge)
        self.add(cube, badge)
`,
    )
    const mobjects = [...threeD(scene).mobjects] as Array<{
      getThreeObject(): { parent: unknown }
    }>
    // 不按加入顺序认人：CE 的 add_fixed_in_frame_mobjects **自己就会 add**（见 shim），
    // 所以 badge 先入场景，`self.add(cube, badge)` 里那句是重入（不该重复加）。按「谁在哪一层」分组。
    const main = threeD(scene).threeScene
    const inMain = mobjects.filter((m) => m.getThreeObject().parent === main)
    const inHud = mobjects.filter((m) => m.getThreeObject().parent !== main)
    expect(mobjects).toHaveLength(2) // badge 没被加两遍
    // 普通物体在主 3D 场景里；钉住的被搬进了 HUD 场景（three.js 的 parent 变了）
    expect(inMain).toHaveLength(1)
    expect(inHud).toHaveLength(1)
    scene.dispose()
  }, 60_000)

  it('2D 场景上调相机方法：当场给「只在 3D 场景上可用」的说法（预检也同判）', async () => {
    const scene = createScene(null, manimRuntime, 1280, 720, { kind: 'Scene', headless: true })
    const code = `from manim import *


class Demo(Scene):
    def construct(self):
        self.set_camera_orientation(phi=1.0)
`
    await expect(runOn(scene, code)).rejects.toThrow(/只在 3D 场景上可用/)
    // 预检（干跑）走的是同一段 Python，所以同一句话也该当场拦下——不能「预检放行、真机才炸」
    await expect(runPython(code, createDryRunBridge())).rejects.toThrow(/只在 3D 场景上可用/)
    scene.dispose()
  }, 60_000)

  it('相机朝向不受「上一次摆到哪儿」影响（上游 up 锁死缺陷的哨兵）', async () => {
    // manim-web 0.3.24 的 Camera3D.orbit 用 `this._up || (…)` 把 up 锁在**第一次**调用上，
    // 于是相机的「朝上」残留着历史角度 → 每次 set_camera_orientation 都带一点滚转。
    // 滚转是**看不出来的错**：getOrbitAngles() 分毫不差、任何几何断言都抓不到，只有看图才见。
    // 这里不依赖「正确的 up 长什么样」也能钉住那个被破坏的性质：**同一组角度 ⇒ 同一个 up**；
    // 另外再把正确值本身钉死（公式见 Camer3D.orbit，gamma=0 代入即得）。
    // （修法与出处见 src/engine/manim-patch.ts；画面判据见 _dev/examples/scene/07-three-d-upright.py。）
    const orient = (first: string, second: string, scene: ManimScene): Promise<string> =>
      runOn(
        scene,
        `from manim import *


class Demo(ThreeDScene):
    def construct(self):
        self.set_camera_orientation(${first})
        self.set_camera_orientation(${second})
`,
      )

    const a = scene3d()
    await orient('phi=70 * DEGREES, theta=-135 * DEGREES', 'phi=50 * DEGREES, theta=-90 * DEGREES', a)
    const upA = readUp(a)
    a.dispose()

    const b = scene3d()
    await orient('phi=20 * DEGREES, theta=-10 * DEGREES', 'phi=50 * DEGREES, theta=-90 * DEGREES', b)
    const upB = readUp(b)
    b.dispose()

    // ① 历史无关：两组完全不同的前序角度，落到同一组角度后 up 必须一模一样
    expect(upA).toEqual(upB)
    // ② 正确值：gamma=0、phi=50°、theta=-90° ⇒ up = (0, cos50°, sin50°)
    //    被残留污染时 up 会变成「上一组角度」算出来的那个（70°/-135° ⇒ ≈ (0.242, 0.242, 0.940)），
    //    三个分量全错、画面随之滚转——这正是哨兵要抓的。
    expect(upA[0]).toBeCloseTo(0, 6)
    expect(upA[1]).toBeCloseTo(Math.cos((50 * Math.PI) / 180), 6)
    expect(upA[2]).toBeCloseTo(Math.sin((50 * Math.PI) / 180), 6)
  }, 60_000)
})
