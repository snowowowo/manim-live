# 支持面

本页列出支持与不支持的 Manim 写法——「常用子集」的具体边界，编写代码前查阅本页即可。数据来自实测，不是主观判断：对照 **Manim CE 0.22.0 公开 API 的 437 个名字**，在真实运行时逐项实测（由仓内探针脚本生成，升级依赖后重测）。

## 总览

<!-- gen:support-stats -->
| 状态 | 数量 | 含义 |
| --- | --- | --- |
| 直接支持 | 381 | 与 CE 同名同写法，直接可跑 |
| 改名映射 | 13 | 写 CE 名字即可，执行层自动翻译（`set_stroke`、`move_camera`、`m[i]` 等） |
| 不支持 | 43 | 当场报错，多数附带替代写法（见下） |

合计可用 **394 / 437，约 90%**。
<!-- /gen:support-stats -->

缺失的 43 项集中分布如下：

- **多数与常规写法无关**：OpenGL 渲染器系列（3 个）、视频文件产出的三项（`SceneFileWriter` / `Section` / `DefaultSectionType`，浏览器环境下本就没有文件产出）、坐标系抽象基类 `CoordinateSystem`、13 个 Logo 与灰阶色常量，以及 `TrueDot`、`DotCloud`、`Point`、`ImageMobjectFromCamera` 这类少见替代项。
- **常规写法中会遇到的**：`always_redraw` 系列 9 个函数与 8 个方法、1 个动画、1 个速率函数——**每一项都有等价写法**（多为 `add_updater()` 组合），报错信息中直接给出。

**结论：基础图形、坐标系与函数图像、文本与公式、动画、updater、3D 等主力场景全部覆盖**——20 组 / 273 条语料全部通过即为实证（其中 34 条走**引擎扩展**车道，见下），成品见[示例画廊](/examples/)。

## 支持的写法

- **物体与图形**：基础形状（`Circle` / `Arc` / `Angle` / `ArcPolygon` / `ArcPolygonFromArcs`）、组合（`VGroup` / `CurvesAsSubmobjects`）、表格（`Table` / `IntegerTable`）、参数曲线（`ParametricFunction` / `FunctionGraph`）。
- **坐标系与图像**：`Axes` / `NumberPlane` / `NumberLine` / `plot()` / `BarChart`，网络图 `Graph`（自定义刻度见下节「名字在、东西不能用」）。
- **文本与公式**：`Text` / `Tex` / `MathTex` / `Label`（公式渲染需配置样式资源，见[安装](/guide/installation)）。
- **动画**：`play()` 与全套 CE 动画动词，含 `.animate` 语法。
- **动态更新**：`add_updater` 每帧更新（`always_redraw` 系组合器除外，见下表）。
- **3D**：`ThreeDScene` / `SpecialThreeDScene` 与相机操作（`set_camera_orientation` / `move_camera` / 环境相机旋转为改名映射），以及参数曲面 `Surface`。
- **颜色与速率函数**：常用颜色常量与速率函数（少数例外见下表）。

## 不支持的写法（43 项）

写法撞上下表时**当场报错**——报错文案就是下表的「替代 / 说明」一列，照着改即可。

### 类（11 个）

| 名称 | 替代 / 说明 |
| --- | --- |
| `CoordinateSystem` | 坐标系抽象基类——直接用 `Axes` / `NumberPlane` |
| `DefaultSectionType` | 视频分段——浏览器内没有文件产出 |
| `DotCloud` | 散点用 `VGroup(*[Dot(p) for p in points])` 拼 |
| `ImageMobjectFromCamera` | 运行时报错会给出建议 |
| `OpenGLPGroup` / `OpenGLPMPoint` / `OpenGLPMobject` | OpenGL 渲染器相关，不适用 |
| `Point` | 运行时报错会给出建议 |
| `SceneFileWriter` | 视频文件写出——浏览器内没有文件产出 |
| `Section` | 视频分段——浏览器内没有文件产出 |
| `TrueDot` | 用 `Dot` |

这张表随探针逐版收缩：`ArcPolygonFromArcs`、`CurvesAsSubmobjects`、`Label`、`SpecialThreeDScene`、`Surface` 曾列在这里，现已**真浏览器截过图、确认画得出来**（`Surface` 收 `lambda u, v: …` 参数方程）。

### 「名字在、东西不能用」的四个（不在上表，也不在支持面）

上表是「**名字都不在**」——写出来当场报错、附带替代写法。下面这四个相反：**名字在、探针也标 `ok`，真拿去用却是废的**。它们不计进「不支持 43 项」（那一列统计的是名字缺失），但实际同样不能用：

| 名称 | 为什么不能用 |
| --- | --- |
| `LinearBase` / `LogBase` | CE 里是**坐标系的刻度配置件，不是 Mobject**——`self.add(LinearBase(base=10, x_range=[1, 1000]))` 一进真画布就炸 `_setSceneContext is not a function`。要自定义刻度就把它传给轴：`Axes(x_axis_config={"scaling": LogBase(base=10)})` |
| `MathTypst` / `Typst` | 构造不报错，但 Typst 渲染器资源未随包发布——渲染时只在控制台留一行 `Typst rendering error`，画面上什么都没有。要公式一律用 `Tex` / `MathTex` |

> 这一节存在的理由，是**探针的构造检查只验「建得出来」，不验「画得出来」**——这四个正是它测不到的那一层。它们的判定依据是**截图**（`scripts/shot-corpus.mjs` 跑真 Chromium），不是探针表。

### 函数（9 个）

| 名称 | 替代 / 说明 |
| --- | --- |
| `always` / `always_redraw` | 用 `add_updater()` 组合重画 |
| `always_rotate` | 用 `add_updater()` 挂 `rotate` |
| `always_shift` | 用 `add_updater()` 挂 `shift` |
| `f_always` / `cycle_animation` / `override_animation` / `turn_animation_into_updater` / `assert_is_mobject_method` | 用 `add_updater()` 自己组合 |

### 方法（8 个）

| 名称 | 替代 / 说明 |
| --- | --- |
| `surround` | 用 `get_bounding_box()` 取外接框后自建 `Rectangle` |
| `set_z_index` | 用 `set_z(数值)` 设层级 |
| `put_start_and_end` | 用 `put_start_and_end_on(a, b)`，或 `set_start(a)` + `set_end(b)` |
| `plot_parametric_curve` | 用 `plot()` 画按参数方程采样好的点 |
| `plot_derivative_graph` | 用 `plot()` 画手算好的导数 |
| `get_part_by_tex` | `MathTex` 取段用 `m[i]`（只有按序号取，没有按 tex 找） |
| `bring_to_front` / `bring_to_back` | 用 `set_z(较大值)` 提到上层 / `set_z(较小值)` 压到下层 |

### 颜色常量（13 个）

| 名称 | 替代 / 说明 |
| --- | --- |
| `DARK_GREY` / `DARKER_GREY` / `LIGHT_GREY` / `LIGHTER_GREY` / `GRAY_BROWN` / `LOGO_BLACK` / `LOGO_BLUE` / `LOGO_GREEN` / `LOGO_RED` / `LOGO_WHITE` / `PURE_CYAN` / `PURE_MAGENTA` / `PURE_YELLOW` | 不在内置色表——用 hex 字符串（如 `'#58c4dd'`） |

### 速率函数（1 个）

| 名称 | 替代 / 说明 |
| --- | --- |
| `squish_rate_func` | 用 `smooth` / `linear` / `there_and_back` |

### 动画（1 个）

| 名称 | 替代 / 说明 |
| --- | --- |
| `MaintainPositionRelativeTo` | 用 `add_updater()` 每帧对齐相对位置 |

## 引擎扩展（`manim_live_extra`）——另一条车道

上面所有内容都是「**Manim CE 有什么、我们支持到哪**」。本节反过来：**Manim CE 没有、本套引擎另加**的图形，共 34 个。它们**不在支持面里**，也不该按原版写法去记——**默认不要用**，需要时按需引入。

| 用途 | 个数 | 名字 |
| --- | --- | --- |
| 统计与通用图表 | 14 | `Histogram` `BoxPlot` `ViolinPlot` `ScatterPlot` `StackedBarChart` `AreaChart` `StepChart` `CalendarHeatmap` `CandlestickChart` `WaterfallChart` `PieChart` `DonutChart` `RadarChart` `GanttChart` |
| 数学可视化 | 2 | `HeatMap` `ContourPlot` |
| 生物 | 3 | `DNAHelix` `Cell` `AminoAcidChain` |
| 化学 | 1 | `MoleculeMobject` |
| 机器学习 | 5 | `NeuralNetwork` `FeedForwardLayer` `ConvolutionalLayer` `PoolingLayer` `ImageLayer` |
| 概率 | 1 | `DiceFace` |
| 网络与流程 | 1 | `SankeyDiagram` |
| 3D | 5 | `Box3D` `Vector3D` `ParametricSurface` `Surface3D` `ImplicitSurface` |
| 分形 | 2 | `MandelbrotSet` `NewtonFractal` |

用法与「原版」的唯一差别是 import 那一行：

```python
from manim import *
from manim_live_extra import RadarChart           # ← 只 import 你用到的，别 import *

chart = RadarChart(data=[3, 5, 4, 2, 5], categories=['速度', '精度', '成本', '维护', '扩展'])
self.play(Create(chart))
```

**三条硬边界**，用之前先认清：

- **只有本套引擎认**。别的 Manim 环境（含本机 manim CLI）里这些名字不存在，`import` 就失败。
- **本机 CLI 导出会被前置门拒绝**——导出通道只接受「纯 CE」的源码，判定依据就是源码里有没有那行 `from manim_live_extra import`。这条是**故意**的：宁可当场拒，也不要导出一个跑到一半才发现图形缺失的产物。
- **不能自动注入**。写成 `from manim import *` 之后直接拿扩展名用，会当场报错并告诉你该 import 什么——但引擎不会替你补上那行 import。原因同上：前置门与源码投影都靠源码自足，替你补一行等于把判定依据擦掉。

34 个全部是**类**，一律关键字传参。签名速查、每条的截图与完整源码见[示例画廊的引擎扩展页](/examples/extras)；写法纪律见黑板 / 卡片技能文档的「引擎扩展」一节。

**仍未收的**（有人问过，我们没做）：函数条目（预置分子、图工厂这类）、有状态模拟（`PhysicsWorld` / `ParticleSystem`）、吃外部数据的 `VideoMobject`、地图与地球、`Text3D` / `TextOnPath`（字体资源不随包发布，截出来是空白）。

## 数据来源

`scripts/probe-api.mjs` 在无头浏览器里把 Manim CE 0.22.0 的公开 API 逐项对到运行时实测：能直接用的记 `ok`、改名可用的记 `alias`、缺失的记 `missing` 并附替代写法。升级依赖后重跑探针、重新生成本页数据——清单与运行时行为始终一致，不是手工维护的文档。

同一个探针还跑第二张表：脚本顶部的 `EXTRAS` 清单（[引擎扩展](#引擎扩展-manim_live_extra-另一条车道)那 34 个名字）逐项实构造，产出 `src/py/extras-map.generated.ts`。**那张清单是整条车道的总开关**——清空它，`manim_live_extra` 这个模块、技能文档里的扩展段、示例页的扩展分组会一起消失，不需要再去别处删。清空或改动后重跑 `node scripts/gen-examples-docs.mjs` 与两侧的 `scripts/gen-skill.mjs` 把派生文档一起刷新。

> 探针的构造检查**只验「建得出来」，不验「画得出来」**。`MathTypst` / `Typst` / `LinearBase` / `LogBase` 正是栽在这一层（见上文「名字在、东西不能用」），`Text3D` / `TextOnPath` 也是——所以后两个名字不进 `EXTRAS`，判定依据是截图，不是探针。
