/**
 * 场景会话回归：**段式执行的语义**——变量跨段保留、顶层 play 自动 await、
 * 名字表预检（复用不误伤）、失败不入档并自动回滚、source 投影与销毁作废。
 *
 * 用真 headless 场景（同 headless.test.ts 的路子）：动画与状态是真的，不碰 DOM / WebGL。
 */
import { describe, expect, it } from 'vitest'
import * as manimModule from 'manim-web'
import { setPyodideLoader } from '../py/runtime.ts'
import { createPySession, type Session } from './session.ts'
import { createSceneSlot } from './canvas.ts'
import type { ManimNamespace } from '../py/manim-bridge.ts'
import { testPyodideLoader } from '../../scripts/test-pyodide.mjs'

const manim = manimModule as unknown as ManimNamespace
setPyodideLoader(testPyodideLoader('session'))

// headless 场景带 updater 的 wait 走 requestAnimationFrame，Node 里没有——补一个（同 headless.test.ts）。
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

async function newSession(collected: string[]): Promise<Session> {
  return createPySession({ manim, scene: headless(), onOutput: (text) => collected.push(text) })
}

/** 取 print 出来的数字行（如 `BEFORE -2.0`）。 */
function numberLine(out: string[], tag: string): number {
  const line = out.join('\n').split('\n').find((item) => item.startsWith(tag))
  expect(line, `没有拿到 ${tag} 行：\n${out.join('\n')}`).toBeDefined()
  return Number(line!.slice(tag.length).trim())
}

describe('场景会话：段式执行', () => {
  it('变量跨段保留；顶层 play 补 await 后状态真的变', async () => {
    const out: string[] = []
    const session = await newSession(out)
    await session.append('dot = Dot(point=[-2, 0, 0], color=RED)\nself.add(dot)')
    // 第 2 段直接引用第 1 段建的 dot——持久命名空间的本义
    await session.append('print("BEFORE", round(float(dot.get_center()[0]), 3))')
    // 顶层 play 被段式改写补 await：动画播完、settle 后才返回，位置应真的挪了
    await session.append('self.play(dot.animate.shift(RIGHT * 2))\nprint("AFTER", round(float(dot.get_center()[0]), 3))')
    expect(session.count).toBe(3)
    expect(numberLine(out, 'BEFORE')).toBeCloseTo(-2, 3)
    expect(numberLine(out, 'AFTER')).toBeCloseTo(0, 2)
    session.dispose()
  }, 120_000)

  it('check：已提交的函数可调用、数可运算（复用不误伤）；未定义名当场拒', async () => {
    const out: string[] = []
    const session = await newSession(out)
    await session.append('def helper():\n    return 5\nn = 3')
    await expect(session.check('helper() + n')).resolves.toMatchObject({ ok: true })
    const bad = await session.check('missing_thing + 1')
    expect(bad.ok).toBe(false)
    expect(bad.error).toContain('missing_thing')
    // 函数跨段复用真跑得通
    await session.append('print("H", helper() + n)')
    expect(numberLine(out, 'H')).toBe(8)
    session.dispose()
  }, 120_000)

  it('append 拼错名：check 拦下、失败不占步号，修正后重交成功', async () => {
    const session = await newSession([])
    await session.append('c = Circle(radius=1)')
    const bad = await session.append('self.play(Craete(c))')
    expect(bad.ok).toBe(false)
    expect(bad.error).toContain('Craete')
    expect(session.count).toBe(1)
    await expect(session.append('self.play(Create(c))')).resolves.toMatchObject({ ok: true, step: 2 })
    session.dispose()
  }, 120_000)

  it('过了 check、执行期才炸：自动回滚到干净态，会话可继续', async () => {
    const session = await newSession([])
    await session.append('c = Circle(radius=1)\nself.add(c)')
    // set_value 在支持面里（ValueTracker 有），但 Circle 没有——干跑按名字放行，真桥才炸
    const bad = await session.append('d2 = Dot()\nself.add(d2)\nc.set_value(3)')
    expect(bad.ok).toBe(false)
    expect(session.count).toBe(1)
    // 回滚换新命名空间：d2 不在名字表里，check 应拒
    await expect(session.check('d2')).resolves.toMatchObject({ ok: false })
    // 已提交的名字还在，会话继续可用
    await expect(session.append('print("ALIVE", round(float(c.get_center()[0]), 3))')).resolves.toMatchObject({ ok: true, step: 2 })
    session.dispose()
  }, 120_000)

  it('source 投影；dispose 后操作作废（cancelled 不是错误）', async () => {
    const session = await newSession([])
    await session.append('a = 1')
    await session.append('b = 2')
    expect(session.source()).toBe('a = 1\n\nb = 2')
    session.dispose()
    await expect(session.append('c = 3')).resolves.toMatchObject({ ok: false, cancelled: true })
    await expect(session.check('a')).resolves.toMatchObject({ ok: false, cancelled: true })
  }, 120_000)
})

/**
 * 常驻场景的**种类**由会话参数给定（`kind`）——这是「黑板写死 2D」那个断点的回归。
 *
 * 以前 `_session_begin` 一律 `Scene()`：3D 专有方法（相机四件套 / fixed_in_frame 两对）跨步必被
 * 预检误拒，Cube 落在无光的 2D 画布上**全黑且不报错**。种类只能当会话参数带进来——常驻 `self`
 * 早于第一段代码存在，而「换种类」在桥那边是拆了重建。
 */
describe('场景会话：常驻场景的种类由会话参数给定', () => {
  interface SceneInternals {
    camera3D?: unknown
    threeScene: { traverse(visit: (object: { isLight?: boolean }) => void): void }
  }
  /** 场景里的灯（2D 的 Scene 是 0 盏，ThreeDScene 默认 3 盏）。 */
  const lights = (scene: object): number => {
    let count = 0
    ;(scene as SceneInternals).threeScene.traverse((object) => {
      if (object.isLight === true) count += 1
    })
    return count
  }
  const hasCamera3D = (scene: object): boolean => (scene as SceneInternals).camera3D !== undefined

  /** 真画布槽（无容器 → headless），会话直接用它当 scene / sceneFor。 */
  const slotOf = (kind?: string) =>
    createSceneSlot(null, manim, 1280, 720, { headless: true, ...(kind === undefined ? {} : { kind }) })

  it('kind=ThreeDScene：开局画布就是 3D，相机方法第一步与跨步都过', async () => {
    const slot = slotOf('ThreeDScene')
    const session = await createPySession({
      manim,
      scene: slot.scene(),
      sceneFor: slot.sceneFor,
      kind: 'ThreeDScene',
    })
    // 开局即 3D：不给 kind 时这里是 0 盏灯、没有 camera3D——而画布种类只能在开局定。
    expect(lights(slot.scene())).toBe(3)
    expect(hasCamera3D(slot.scene())).toBe(true)
    await expect(
      session.append('self.set_camera_orientation(phi=60 * DEGREES, theta=30 * DEGREES)'),
    ).resolves.toMatchObject({ ok: true, step: 1 })
    // 第 2 步还用 self：预检的 self 与 live 同种类，不该被「当前是 Scene」误拒。
    await expect(session.append('self.begin_ambient_camera_rotation(rate=0.2)')).resolves.toMatchObject({
      ok: true,
      step: 2,
    })
    session.dispose()
  }, 240_000)

  it('kind=ThreeDScene：Cube 落进有光的画布（不是那块全黑的 2D）', async () => {
    const slot = slotOf('ThreeDScene')
    const session = await createPySession({
      manim,
      scene: slot.scene(),
      sceneFor: slot.sceneFor,
      kind: 'ThreeDScene',
    })
    await expect(session.append('self.add(Cube(side_length=1))')).resolves.toMatchObject({ ok: true, step: 1 })
    expect(lights(slot.scene())).toBe(3)
    session.dispose()
  }, 240_000)

  it('失败回滚后种类不丢：相机仍可用', async () => {
    const slot = slotOf('ThreeDScene')
    const session = await createPySession({
      manim,
      scene: slot.scene(),
      sceneFor: slot.sceneFor,
      kind: 'ThreeDScene',
    })
    await session.append('self.add(Cube(side_length=1))')
    const bad = await session.append('missing_thing + 1')
    expect(bad.ok).toBe(false)
    // 回滚是「清场重演已提交段」，不是「换一种场景」——种类要留着。
    await expect(session.append('self.set_camera_orientation(phi=45 * DEGREES)')).resolves.toMatchObject({
      ok: true,
      step: 2,
    })
    session.dispose()
  }, 240_000)

  it('不给 kind：仍是 2D，相机方法照旧被拒（默认没变）', async () => {
    const slot = slotOf()
    const session = await createPySession({ manim, scene: slot.scene(), sceneFor: slot.sceneFor })
    expect(lights(slot.scene())).toBe(0)
    const bad = await session.check('self.set_camera_orientation(phi=60 * DEGREES)')
    expect(bad.ok).toBe(false)
    expect(bad.error).toContain('3D 场景')
    session.dispose()
  }, 240_000)
})
