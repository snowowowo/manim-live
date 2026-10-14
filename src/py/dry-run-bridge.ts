/**
 * 预检用桥：跑一遍代码但不建任何真对象——Host 在工具返回前用它「干跑」一次，
 * 语法错、未定义名、manim-web 实测缺失的能力、构造参数写错，都能在模型看到结果之前回给它。
 *
 * 为什么不直接用真桥：真桥要 manim-web 与 WebGL，Host 是 Node 且不该为此背上 5MB 依赖。
 *
 * 判定的口径**不在本文件**——全部问 `surface.ts`（支持面 SSOT），与真桥取同一份，
 * 所以同一段代码两端**同判**：预检放行的，真桥不会当场拒；预检拒的，真桥也拒。
 */
import { ANIMATE_KIND, HANDLE_KEY, type AnimationSpec, type ManimBridge } from './bridge.ts'
import {
  ASYNC_METHODS,
  INDEX_GETTERS,
  METHOD_RETURNS,
  planAnimate,
  planAnimation,
  planAttrRead,
  planCreate,
  planMethod,
  planPlayOptions,
  SCENE_FAMILY,
} from './surface.ts'

export function createDryRunBridge(): ManimBridge {
  let nextHandle = 1
  const fake = (): { [HANDLE_KEY]: number } => ({ [HANDLE_KEY]: nextHandle++ })
  /**
   * 组类句柄的子物体个数（VGroup 的位置参数就是子物体；`VGroup()` 空构造记 0，
   * 后续 add 会累加——空构造再逐个 add 是语料里最常见的写法）。
   *
   * 为什么要记：真桥的 `m[i]` 越界返回 undefined（过桥是 None），适配层据此抛 IndexError。
   *
   * 没登记的句柄**不再**一律判「取不到」（2026-10-14 改）：迭代收尾已不靠 IndexError
   *（适配层 `__iter__` 改成 `range(len(...))`，挂死不可能），而「未登记=取不到」会把
   * `chart[2]`、`blocks[3]` 这类**真桥取得到**的单点下标全拦成预检误报（真机事故：
   * 8 条期望 ok 的语料被预检拒，用户逐条标叉）。现在：登记过才判越界，没登记的返回占位句柄。
   */
  const sizes = new Map<number, number>()

  /** 构造时的子物体个数：能给就给（给不出就不登记，见 sizes 的注释）。 */
  function sizeOf(kind: string, args: unknown[], kwargs: Record<string, unknown>): number | null {
    if (kind === 'VGroup' || kind === 'Group') return args.length
    // MathTex / Tex 的 CTOR 是 pack 模式：位置参数打包进 latex；关键字也可写成列表。
    if (kind === 'MathTex' || kind === 'Tex') {
      if (args.length > 0) return args.length
      const latex = kwargs.latex
      if (Array.isArray(latex)) return latex.length
      return typeof latex === 'string' ? 1 : null
    }
    return null
  }

  return {
    create(kind, args, kwargs) {
      // 场景族不是「构造一个物体」，而是「换一块哪种场景的画布」（名字表在 surface.ts 的
      // SCENE_FAMILY，真桥只管换画布不做判定）——所以不走 planCreate。与真桥同判：
      // 同一段 `class X(ThreeDScene)` 两边都不该被当成「构造 ThreeDScene」来审。
      if (SCENE_FAMILY[kind] !== undefined) return nextHandle++
      // 名字缺失、位置参数与构造规则对不上，都在这里当场拒——和真桥同一份判定
      planCreate(kind, args, kwargs)
      const handle = nextHandle++
      const size = sizeOf(kind, args, kwargs)
      if (size !== null) sizes.set(handle, size)
      return handle
    },
    method(handle, name, args, kwargs) {
      planMethod(name, args, kwargs)
      // 取下标：**登记过**大小的按真实个数判越界；没登记的落到下面的兜底返回占位句柄
      //（理由见 sizes 的注释——单点取放宽，挂死已由 `__iter__` 的 len 版收口）。
      // 取法名单从 INDEX_GETTERS 派生（单一来源）：2026-10-13 加 getCurve 时就是漏在这里。
      if (INDEX_GETTERS.includes(name)) {
        const index = args[0]
        const size = sizes.get(handle)
        if (
          size !== undefined
          && typeof index === 'number' && Number.isInteger(index) && index >= size
        ) {
          return undefined
        }
      }
      // mobject.add(...)（不是 scene.add——那是协议里的 add）：累加组的大小。
      // `blocks = VGroup()` 再逐个 add 是语料的常见写法，不累加的话 size 停在 0，
      // `blocks[3]` 又会被判越界（真机事故：math-prob/04）。
      if (name === 'add') {
        const size = sizes.get(handle)
        if (size !== undefined) {
          const objects = args.filter(
            (arg) => arg !== null && typeof arg === 'object' && HANDLE_KEY in arg,
          ).length
          sizes.set(handle, size + objects)
        }
      }
      // 异步方法（适配层会给这类调用补 await）：真桥过桥的是 JS Promise（可 await），
      // 干跑若返回句柄 dict，`await dict` 当场 TypeError——「预检拒、真桥过」的判定漂移
      //（真机事故：lesson/13 的 move_camera 在预检里报 'object dict can't be used in await'）。
      if (ASYNC_METHODS.includes(name)) return Promise.resolve(fake())
      // 取「值」的方法按真桥的形状返占位：坐标类是数值数组、数值类是数。
      // 一律返句柄的话，`(ax.c2p(a) + ax.c2p(b)) / 2`、`tracker.get_value() ** 2`
      // 这类**合法算术**会被判成 Mobject 运算错误（真机事故，见 METHOD_RETURNS 的注释）。
      const shaped = METHOD_RETURNS[name]
      if (shaped === 'vector') return [0, 0, 0]
      if (shaped === 'number') return 0
      // 兜底返回**原句柄**（真桥对原地改的方法也是这么返的，见 manim-bridge 的同款注释）：
      // 链式调用 `VGroup(...).arrange(...).set_stroke(...)` 的每一环都拿回同一个句柄，
      // 登记过的子物体数才不会在第二环就丢掉——`len(tips)` 曾因此被句柄拖炸（api/06）。
      return { [HANDLE_KEY]: handle }
    },
    getAttr(handle, name) {
      planAttrRead(name)
      // 与真桥同判：登记过子物体数的组，length 报真实个数（`len(group)` 才对得上）。
      if (name === 'length' && sizes.has(handle)) return sizes.get(handle)
      return fake()
    },
    // scene.add(...mobjects)：把物体交给场景，不改变组大小（mobject.add 在 method 里累加）。
    add() {},
    async play(_handle, animations: AnimationSpec[], kwargs) {
      // play 级选项也要判——不然 rate_func 写错名会过预检、到真桥才炸（正是 SSOT 要消灭的那类）
      planPlayOptions(kwargs)
      for (const animation of animations) {
        if (animation.kind === ANIMATE_KIND) planAnimate(animation.calls ?? [])
        else planAnimation(animation.kind, animation.targets, animation.kwargs)
      }
    },
    async wait() {},
    async flush() {},
  }
}
