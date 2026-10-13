// manim-web 0.3.24 的上游缺陷：本包在拿到库之后打一层**最小**补丁。现有两处（Camera3D.orbit / MathTex 的渲染落位）。
//
// `Camera3D.orbit(phi, theta, distance, gamma)` 里，「相机朝上方向」被**锁死在第一次调用**上：
//
//   orbit(e, t, n, r = 0) {
//     …
//     this._up || (this._up = new Vector3(…由 gamma/phi/theta 算出…), this._camera.up.copy(this._up))
//     this._camera.lookAt(this._lookAt)
//   }
//
// `this._up ||` 使 up 只在**第一次** orbit 时算一次，之后永远不更新。而 up 本来是
// (gamma, phi, theta) 的纯函数——`Camera.d.ts` 写得很清楚：「Default (phi=0, theta=-π/2):
// X axis → screen right, Y axis → screen up」「gamma – Roll angle」。于是**第二次起的每一次
// 转相机都带着上一组角度残留的滚转**：
//
//   * 建场景时我们按 CE 的默认斜视摆了相机（`THREE_D_CAMERA_DEFAULTS`：phi=70°/theta=-135°），
//     up 就此锁死在那组角度上；
//   * 用户再写 `self.set_camera_orientation(phi=50*DEGREES, theta=-90*DEGREES)`——相机**位置**是
//     对的（`getOrbitAngles()` 读回来分毫不差），画面却**歪 15°**：x 轴被抬成上斜、y 轴被推歪；
//   * `begin_ambient_camera_rotation()` 每帧都 orbit，地平线会一路歪下去；
//   * `move_camera()` 的每一帧同样中招——整段动画从头歪到尾。
//
// 这个「歪」不会报错、也不会被任何几何断言抓到（位置全对），只有**看图**才看得见。
// 实测：diagnostic 语料里 5 个立方体排成十字，渲染出来 x 轴那三个是**斜着往上**的。
//
// 修法只有一处：每次 orbit 前把锁清掉，让它按**本次**的 (phi, theta, gamma) 重算 up。
// 这不是改语义，是让它回到 `Camera.d.ts` 里写明的语义。改的是原型上的一个方法体，幂等
// （WeakSet 记住已打过的原型），也不碰 Camera3D 的其它行为。
import type { ManimRuntime } from './library.ts'

/** 已打过补丁的原型（同一份 manim-web 模块只打一次）。 */
const patched = new WeakSet<object>()

/** 给 manim-web 打上游补丁。幂等；拿不到目标时静默跳过（换了库版本不该把页面搞挂）。 */
export function patchManimWeb(manim: ManimRuntime): void {
  // MathTex 的补丁独立守卫、先打（别被相机那段的早退挡掉——第二个场景进来时相机已打过）。
  patchMathtexCopy(manim)
  const ctor = (manim as unknown as Record<string, unknown>).Camera3D as
    | { prototype?: Record<string, unknown> }
    | undefined
  const proto = ctor?.prototype
  if (proto === undefined || patched.has(proto)) return
  const original = proto.orbit
  if (typeof original !== 'function') return
  proto.orbit = function patchedOrbit(
    this: { _up?: unknown },
    phi: number,
    theta: number,
    distance?: number,
    gamma?: number,
  ): unknown {
    // 清掉锁：让紧随其后的 orbit 按本次角度重算 up（见文件头）。
    this._up = undefined
    return (original as (...rest: unknown[]) => unknown).call(this, phi, theta, distance, gamma)
  }
  patched.add(proto)
}

/**
 * 第二处：`MathTex.copy()` 的副本会「旧子物 + 自己那条异步渲染」叠成双份；时间轴 seek 一 reset 就炸。
 *
 * 上游（0.3.24）的三段事实叠在一起：
 *   ① MonoPart 的构造器原地**启动异步渲染**（`this._renderPromise = this._renderMultiPart(latex)` 或 `_startRender()`）；
 *   ② `copy()` 又是同步的：`new MathTex(...)` 之后紧跟 `_copyBaseAttributesInto(clone, { copyChildren: true })`，
 *      把原件的子物拷进这个**渲染还在飞**的副本；
 *   ③ 两条渲染路径收尾都是 `this.add(...)` **追加**而不是替换。
 * 于是副本的渲染一落地就叠在拷来的子物上（实测 5 个部件 → 10 个 children，点数 443 → 886）。
 *
 * 为什么平时看不见、时间轴上必炸：副本被 `Animation.begin()` 当「动画前快照」收着，live 路径从不 reset
 * 它；时间轴（MasterTimeline）的 `seek` 会 `reset()` 每个动画——reset 拿快照的 `getLocalPoints()` 去
 * `setPoints()`，对着「子物 443、数组 886」当场抛错（真机首屏 MathTex 样例）。
 *
 * 修法只碰副本：copy 出来的那一刻把「拷进来的那批子物」记下，等**副本自己的渲染**落地后把它们摘掉——
 * 留下的正是这次渲染的产出，与正常渲染出的实例同构。渲染失败（`_renderError`）时一个都不摘，
 * 保持原件语义（宁可留旧子物，不做盲裁）。原件与普通实例完全不经过这里，行为零变化。
 */
function patchMathtexCopy(manim: ManimRuntime): void {
  const ctor = (manim as unknown as Record<string, unknown>).MathTex as
    | { prototype?: object }
    | undefined
  let proto = ctor?.prototype
  while (proto !== undefined && proto !== null && !Object.prototype.hasOwnProperty.call(proto, 'copy')) {
    proto = Object.getPrototypeOf(proto) as object | undefined
  }
  const owner = proto as Record<string, unknown> | undefined
  if (owner === undefined || owner === null || patched.has(owner)) return
  const original = owner.copy
  if (typeof original !== 'function') return
  owner.copy = function patchedMathtexCopy(this: unknown): unknown {
    const clone = (original as () => {
      children?: unknown[]
      _renderPromise?: Promise<unknown> | null
      remove?: (child: unknown) => void
    }).call(this)
    const copied = Array.isArray(clone?.children) ? [...clone.children] : []
    const pending = clone?._renderPromise
    if (copied.length > 0 && pending !== undefined && pending !== null && typeof pending.then === 'function') {
      void pending
        .then(() => {
          for (const child of copied) {
            if (Array.isArray(clone.children) && clone.children.includes(child)) clone.remove?.(child)
          }
        })
        .catch(() => { /* 渲染失败：保持原件语义，不动 */ })
    }
    return clone
  }
  patched.add(owner)
}
