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
 * 左边导航的分节。2026-10-14 重组：不与文档站一一对应，按「使用方式」分两组——
 *
 *   工作台（要画布的四件事）：
 *   · corpus   语料——回归网本行（三版式）
 *   · free     自由代码——写一段 → 预检（check）→ 渲染 → 导出（逐帧），一条完整工作流
 *   · session  会话——黑板形态：分段追加 / 回滚
 *   · playback 时间轴——收集成时间轴，帧级定位与走带
 *
 *   诊断（不要画布的读数台）：
 *   · env      运行环境——浏览器能力 / Pyodide 运行时 / KaTeX / 取包（environmentStatus）
 *               + 本机探测 + 包库存 + Node 干跑（经 dev-api 真跑核心包 Node 入口）
 *
 * 被收进别的节的旧分节：渲染器（check → 自由代码；warmup/indexURL → 运行环境，顶栏本就有就绪徽章）、
 * 钩子（onLoading 在自由代码里写个 import pandas 就能看到；onProgress/signal 在导出按钮组）、
 * 导出（→ 自由代码的动作组）、环境状态/本机探测/包管理/Node 入口（→ 运行环境）。
 * 「低层导出与缺口表」整节删除：纯静态文字，证明不了任何东西；缺口表归文档站（API 参考 › 低层导出）。
 */
export type GroundView = 'corpus' | 'free' | 'session' | 'playback' | 'env'

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

/**
 * 起手样本：**完整 Manim 文件形态**（import + class + construct）——这是默认该给人看的形态。
 * 「裸 construct 体」是允许的简写（runtime 的 prepareSource 自动套壳），但简写不该当门面；
 * 分段形态只属于会话（「会话」分节的起手段才是顶层语句）。
 * 内容：坐标系 + 圆 + 公式，顺带验证 KaTeX 字体路由真的接上了。
 */
export const FREE_SAMPLE = `from manim import *

class CircleAndFormula(Scene):
    def construct(self):
        ax = Axes(x_range=[-2, 2, 1], y_range=[-2, 2, 1])
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
