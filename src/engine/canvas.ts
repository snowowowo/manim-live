// 画布原语：建一块 manim-web 场景——**按 CE 的场景基类名**（Scene / ThreeDScene / …）。
// 代码执行不在这里——Manim Python 交给 Pyodide 运行时（py/），由桥驱动这块场景。
import { FRAME_HEIGHT, resolveSceneKind, THREE_D_CAMERA_DEFAULTS } from '../py/surface.ts'
import type { ManimRuntime } from './library.ts'
import { patchManimWeb } from './manim-patch.ts'

/**
 * 画布场景（manim-web 的 Scene 实例）：只声明本模块真正用到的成员。
 * 库自带的类型与运行时对象不完全一致，故按用途做结构类型，构造处显式转换。
 */
export interface ManimScene {
  mobjects: Set<unknown>
  camera: { frameHeight: number; frameWidth: number }
  remove(...mobjects: unknown[]): void
  play(...animations: unknown[]): Promise<void>
  dispose(): void
}

/** 容器上挂的类名：与 style.css 里的 `.manim-live-surface` 对应（修 canvas 的基线间隙）。 */
export const SURFACE_CLASS = 'manim-live-surface'

/** 画布尺寸下限：容器被撑到 0 时 canvas 会塌成一条线（受控尺寸下 autoResize 是关的）。 */
const MIN_WIDTH = 320
const MIN_HEIGHT = 240

export interface CreateSceneOptions {
  /** CE 的场景基类名（`ThreeDScene` / `MovingCameraScene` / …）；默认 `'Scene'`。 */
  kind?: string
  /** 无容器（Node 里的真画布单测）：交给 manim-web 的空渲染器（Node 没有 WebGL）。 */
  headless?: boolean
}

/**
 * 建一块 manim-web 场景。`kind` 决定 new 哪个类——这是 Phase 2 的要害：
 * `ThreeDScene` 拿到的是一块**真 3D 场景**（3D 相机 + 默认光照 + 深度写回），
 * 而 3D 形状套在 2D 画布上会**全黑**（2D 场景里没有光、还把材质的 depthTest 关掉）。
 * 细节与实测见 `py/surface.ts` 的 SCENE_FAMILY。
 *
 * manim-web 没有的场景名（GraphScene）经 `resolveSceneKind` 退回 `Scene`，并在那里 warn 一次。
 */
export function createScene(
  container: HTMLDivElement | null,
  manim: ManimRuntime,
  width: number,
  height: number,
  options: CreateSceneOptions = {},
): ManimScene {
  const kind = resolveSceneKind(options.kind ?? 'Scene')
  // 上游补丁（见 manim-patch.ts）：修 Camera3D.orbit 的 up 锁死——不打的话，任何非首次的
  // set_camera_orientation / move_camera / 自转都会带上一组角度残留的滚转（画面歪、不报错）。
  patchManimWeb(manim)
  const Ctor = (manim as unknown as Record<string, unknown>)[kind] as
    | (new (container: HTMLElement | null, options: Record<string, unknown>) => unknown)
    | undefined
  if (typeof Ctor !== 'function') throw new Error(`manim-live：manim-web 里没有 ${kind} 场景类`)
  container?.classList.add(SURFACE_CLASS)
  const scene = new Ctor(container, {
    width: Math.max(width, MIN_WIDTH),
    height: Math.max(height, MIN_HEIGHT),
    // 无头：让 manim-web 用它的空渲染器；有容器时尺寸由本模块受控（规避容器测量反馈放大）。
    ...(options.headless === true ? { headless: true } : { autoResize: false }),
    backgroundOpacity: 0, // 背景全透明：融入卡片，明暗主题由宿主透出
    ...(kind === 'ThreeDScene'
      ? {
          ...THREE_D_CAMERA_DEFAULTS,
          // 3D 场景里这两个不再管 2D 相机、而是**钉住 HUD 相机**（add_fixed_in_frame_mobjects
          // 那层）的正交范围——给它和 2D 同一套 frame，固定图层与画面内容才对得上同一把尺子。
          frameWidth: FRAME_HEIGHT * (width / height),
          frameHeight: FRAME_HEIGHT,
        }
      : {}),
  }) as unknown as ManimScene
  if (kind !== 'ThreeDScene') {
    try {
      // 画面坐标系对齐标准 Manim：高度恒 8 单位、宽度按画布比例（16:9 → 14.22），
      // 恰好等于 Manim 默认 frame（14.22×8）——AI 按标准坐标写（to_edge、LEFT*4 等）不会出界。
      // 勿改小：frame 一旦偏离标准，AI 心中的默认坐标系就失效，内容会被裁切（曾用 5 导致此事故）。
      // 3D 场景不走这条：ThreeDScene 渲染用的是 camera3D，这块 2D frame 是死值（见 surface.ts）。
      scene.camera.frameHeight = FRAME_HEIGHT
      scene.camera.frameWidth = FRAME_HEIGHT * (width / height)
    } catch (error) {
      console.error('[manim-live] camera frame normalize failed:', error)
    }
  }
  return scene
}

/**
 * 一块**会换**的场景槽：2D 起手，跑到 `class X(ThreeDScene)` 时换成真 3D 场景。
 *
 * 为什么要单独抽出来：这个「换画布」的动作有**两个**调用方——产品侧的 `engine/renderer.ts`，
 * 与工具侧的 `scripts/shot-corpus.mjs`（语料截图自查台）。后者原先把 `createScene` 手抄了一遍，
 * Phase 2 一改就漏了：截图台仍按 2D 建画布，3D 语料当场报
 * 「add_fixed_in_frame_mobjects() 在 manim-web 无对应方法」——那其实是**假画布不够真**。
 * 现在两边共用这一处：少一份真源，就少一处会漂移的地方。
 *
 * 为什么不能在建画布时就定下种类：种类是 **Python 侧**的 `class X(ThreeDScene)` 决定的，
 * 建画布时还没跑代码、根本不知道。所以先摆一块 2D 的（2D 语料完全不受影响），
 * 真跑到 3D 场景时再换——路径是 `Scene.__init__` → 桥的 `create(kind)` → 这里。
 */
export interface SceneSlot {
  /** 当前那块场景。 */
  scene(): ManimScene
  /** 按 CE 的场景基类名换画布；种类没变（含都是 2D）就原样交回，不白拆一块。 */
  sceneFor(kind: string): ManimScene
  /**
   * 拆掉当前场景、按**同一场景种类**重建一块。
   * 「从头真播」（renderer 的 replay）要的就是它：不复用旧场景，免得上一次留下的物体、
   * 追踪器、相机姿态串到这一遍里。
   */
  reset(): ManimScene
  /** 拆掉当前场景。之后不再重建（调用方自己保证不再用）。 */
  dispose(): void
}

/** 造一块场景槽。`container` 为 null = 无头（Node 单测）。 */
export function createSceneSlot(
  container: HTMLDivElement | null,
  manim: ManimRuntime,
  width: number,
  height: number,
  options: Pick<CreateSceneOptions, 'headless'> = {},
): SceneSlot {
  let kind = 'Scene'
  let scene = createScene(container, manim, width, height, options)

  const replace = (wanted: string): ManimScene => {
    try {
      // scene.dispose() 释放 mobject、WebGL 上下文与 resize 观察者，并从容器摘掉 canvas。
      scene.dispose()
    } catch (error) {
      console.error('[manim-live] scene dispose failed:', error)
    }
    if (container !== null) container.innerHTML = ''
    scene = createScene(container, manim, width, height, { ...options, kind: wanted })
    return scene
  }

  return {
    scene: () => scene,
    sceneFor(wanted: string): ManimScene {
      const resolved = resolveSceneKind(wanted)
      if (resolved === kind) return scene
      kind = resolved
      return replace(wanted)
    },
    reset(): ManimScene {
      return replace(kind)
    },
    dispose(): void {
      try {
        scene.dispose()
      } catch (error) {
        console.error('[manim-live] scene dispose failed:', error)
      }
    },
  }
}
