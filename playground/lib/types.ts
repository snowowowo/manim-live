// playground 的公共类型与常量。集中在这里，是因为下面几个模块（存储 / 报告 / 组件）都要用它们，
// 而「谁定义 CardResult」这种事只该有一处答案。

/** 一条语料跑完的结果。`text` 是人看的（错误原文，或一句状态）；判「通没通过」不只看 ok（见 isPassed）。 */
export interface CardResult {
  ok: boolean
  text: string
  /**
   * 这一趟**作废**了（画布在轮到它之前被拆 / 被下一趟顶掉）——不是渲染失败。
   *
   * 与 `ok:false` 分开是有原因的：作废的结论一个字都不该报出去（屏幕上根本没发生这件事），
   * 更不该被记进结果（那一栏会挂一条莫名其妙的红）。DSH 卡片对 `cancelled` 也是这个口径。
   */
  cancelled?: true
}

/**
 * 盖在画布上的那一层（`null` = 不盖）。两种来源，都是「这会儿画布上本来就没东西」的时刻：
 *
 *   · `skeleton` 极速档在渲染 / 批量在跑。极速只是把动画时长压到 0，每个 play 仍然各画一帧，
 *     不盖住就会把一串中间态频闪出来；盖住之后只剩「骨架 → 终态」两步。DSH 实验场同款。
 *   · `packages` 正在联网取第三方包。这时画布必然是空的，把「在取什么」说在画布正中
 *     （视线本来就在那儿），比只在底下一行小字清楚。
 */
export type Overlay = { kind: 'skeleton' } | { kind: 'packages'; text: string }

/** 看什么：语料清单，还是自己写一段。 */
/**
 * 左边导航的分节——**与文档站 API 参考一一对应**（顺序也照它）：
 * playground 对文档里每一个 API 负责，每条一个可上手的分节。
 * 机器可读的清单与标签在 components/api-nav.tsx。
 */
export type GroundView =
  | 'renderer'   // 渲染器：warmup / check / pyodideIndexURL / dispose
  | 'surface'    // 画布：run / replay / canvas / isRendered
  | 'session'    // 会话：check / append / count / source / dispose
  | 'playback'   // 时间轴回放：createPlayback / seek / play / pause / step
  | 'hooks'      // 钩子：onLoading / onProgress / signal
  | 'status'     // 环境状态：environmentStatus / onEnvironmentStatus
  | 'export'     // 导出：Exporter 契约 / browserRecorder
  | 'machine'    // 本机探测（Node 侧，经 dev-api）
  | 'packages'   // 包管理（Node 侧，经 dev-api）
  | 'node'       // Node 入口：runPython + createDryRunBridge（经 dev-api）
  | 'corpus'     // 语料与测试台：语料回归网 + 判定/统计
  | 'internals'  // 低层导出与缺口表

/**
 * 左侧怎么摆。**三种布局共用同一套数据与同一套交互**，换的只是版式——
 * 不是三份实现，所以「哪条跑过、哪条标过」切来切去都在。
 *
 *   · `list`    竖向分组清单（对齐 DSH 实验场那一版）
 *   · `gallery` 语料**平铺网格**：一眼看全一组，靠缩略图与状态色定位
 *   · `docs`    文档式三栏：左导航 · 中正文（说明 / 源码 / 截图）· 右活画布
 */
export type LayoutMode = 'list' | 'gallery' | 'docs'

export type ThemeMode = 'dark' | 'light'

/** 人工验证标注：人对着画面标「对 / 不对」，与自动结果分开存、分开清。 */
export type ManualMark = 'pass' | 'fail'

/** 当前要渲染什么（自由编辑时是那段代码本身）。 */
export type Job = { kind: 'example'; id: string } | { kind: 'free'; code: string }

/** 清单筛选：239 条语料，只想看「还没跑的」或「跑挂的」时用它。 */
export type GroundFilter = 'all' | 'pending' | 'failed' | 'passed'

/**
 * 批量渲染时单条的最长等待：卡住不能把整轮拖死。
 * 60 秒是量出来的——最慢的一条（3D + 相机环绕）真时序不到 10 秒，留六倍余量。
 */
export const TIMEOUT_MS = 60_000

/** 自由编辑的起手样本：坐标系 + 圆 + 公式，顺带验证 KaTeX 字体路由真的接上了。 */
export const FREE_SAMPLE = `ax = Axes(x_range=[-2, 2, 1], y_range=[-2, 2, 1])
circle = Circle(radius=1)
circle.move_to(ax.c2p(0, 0, 0))
circle.set_color("#247bbf")
self.add(ax, circle)
self.play(Create(ax), Create(circle))

eq = MathTex(latex=["x^2", "+", "y^2", "=", "1"], font_size=34)
eq.move_to(ax.c2p(0, 1.5, 0))
self.play(Write(eq))
`

/** 会话视图的起手段：写成两步，天然的「第一段建物体、第二段引用它」演示。 */
export const SEGMENT_SAMPLE = `dot = Dot(point=[-2, 0, 0], color=RED)
self.add(dot)
self.play(dot.animate.shift(RIGHT * 4))`
