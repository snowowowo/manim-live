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
   * 组类句柄的子物体个数（VGroup 的位置参数就是子物体）。
   *
   * 为什么要记：真桥的 `m[i]` 越界返回 undefined（过桥是 None），适配层据此抛 IndexError，
   * `for m in group` 才收得了尾。预检桥若对任何下标都返句柄，那段代码在预检里会**永远取下去**
   * 直到把 Host 的内存吃满——用户写一个再普通不过的 `for m in group:` 就能把工具调用挂死。
   *
   * ⚠️ 2026-10-13 补：只给 VGroup 登记是一条**会挂死**的漏洞——`for part in MathTex("a","+","b")`
   * 实测在预检里刹不住（跑到 501 还在取）。现在两条一起上：① 知道的种类都登记大小；
   * ② **没登记的句柄一律当「取不到」**（返回 undefined → 适配层抛 IndexError → 迭代收尾）。
   * 宁可让预检把「我们没建模的迭代」判成 0 个子物体（偏严），也不能让它无限取下去。
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
      // 取下标：登记过大小的按真实个数判越界；**没登记的也一律「取不到」**——不这么判，
      // 迭代永远收不了尾（见 sizes 的注释）。
      // 取法名单从 INDEX_GETTERS 派生（单一来源）：2026-10-13 加 getCurve 时就是漏在这里——
      // 新取法落到下面的「一律返占位句柄」兜底，于是预检里的 `for part in MathTex(...)`
      // 永远取得到东西、刹不住（真桥没事，只有预检挂）。
      if (INDEX_GETTERS.includes(name)) {
        const index = args[0]
        const size = sizes.get(handle)
        if (typeof index === 'number' && Number.isInteger(index) && index >= (size ?? 0)) {
          return undefined
        }
      }
      // 取「值」的方法按真桥的形状返占位：坐标类是数值数组、数值类是数。
      // 一律返句柄的话，`(ax.c2p(a) + ax.c2p(b)) / 2`、`tracker.get_value() ** 2`
      // 这类**合法算术**会被判成 Mobject 运算错误（真机事故，见 METHOD_RETURNS 的注释）。
      const shaped = METHOD_RETURNS[name]
      if (shaped === 'vector') return [0, 0, 0]
      if (shaped === 'number') return 0
      return fake()
    },
    getAttr(handle, name) {
      planAttrRead(name)
      // 与真桥同判：登记过子物体数的组，length 报真实个数（`len(group)` 才对得上）。
      // 别的种类不建模，返占位——适配层 int(占位) 抛 TypeError，与真桥读不到 length 同类。
      if (name === 'length' && sizes.has(handle)) return sizes.get(handle)
      return fake()
    },
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
