# 支持面

本页列出支持与不支持的 Manim 写法——「常用子集」的具体边界，编写代码前查阅本页即可。数据来自实测，不是主观判断：对照 **Manim CE 0.22.0 公开 API 的 437 个名字**，在真实运行时逐项实测（由仓内探针脚本生成，升级依赖后重测）。

## 总览

| 状态 | 数量 | 含义 |
| --- | --- | --- |
| 直接支持 | 372 | 与 CE 同名同写法，直接可跑 |
| 改名映射 | 13 | 写 CE 名字即可，执行层自动翻译（`set_stroke`、`move_camera`、`m[i]` 等） |
| 不支持 | 52 | 当场报错，多数附带替代写法（见下） |

合计可用 **385 / 437，约 88%**。缺失的 52 项集中分布如下：

- **约三分之二与常规写法无关**：OpenGL 渲染器系列（3 个）、视频文件产出的三项（`SceneFileWriter` / `Section` / `DefaultSectionType`，浏览器环境下本就没有文件产出）、抽象基类与刻度策略类（`CoordinateSystem` / `LinearBase` / `LogBase`）、13 个 Logo 与灰阶色常量，以及 Typst 公式、`TrueDot` 等少见替代项。
- **常规写法中会遇到的**：`always_redraw` 系列 9 个函数与 8 个方法、1 个动画、1 个速率函数——**每一项都有等价写法**（多为 `add_updater()` 组合），报错信息中直接给出。

**结论：基础图形、坐标系与函数图像、文本与公式、动画、updater、3D 等主力场景全部覆盖**——19 组 / 239 条语料全部通过即为实证，成品见[示例画廊](/examples/)。

## 支持的写法

- **物体与图形**：基础形状（`Circle` / `Arc` / `Angle` / `ArcPolygon`…）、组合（`VGroup`）、表格（`Table` / `IntegerTable`）、参数曲线（`ParametricFunction` / `FunctionGraph`）。
- **坐标系与图像**：`Axes` / `NumberPlane` / `NumberLine` / `plot()` / `BarChart`，网络图 `Graph`。
- **文本与公式**：`Text` / `Tex` / `MathTex`（公式渲染需配置样式资源，见[安装](/guide/installation)）。
- **动画**：`play()` 与全套 CE 动画动词，含 `.animate` 语法。
- **动态更新**：`add_updater` 每帧更新（`always_redraw` 系组合器除外，见下表）。
- **3D**：`ThreeDScene` 与相机操作（`set_camera_orientation` / `move_camera` / 环境相机旋转为改名映射）。
- **颜色与速率函数**：常用颜色常量与速率函数（少数例外见下表）。

## 不支持的写法（52 项）

写法撞上下表时**当场报错**——报错文案就是下表的「替代 / 说明」一列，照着改即可。

### 类（20 个）

| 名称 | 替代 / 说明 |
| --- | --- |
| `ArcPolygonFromArcs` | 用 `ArcPolygon` |
| `CoordinateSystem` | 坐标系抽象基类——直接用 `Axes` / `NumberPlane` |
| `CurvesAsSubmobjects` | 运行时报错会给出建议 |
| `DefaultSectionType` | 视频分段——浏览器内没有文件产出 |
| `DotCloud` | 散点用 `VGroup(*[Dot(p) for p in points])` 拼 |
| `ImageMobjectFromCamera` | 运行时报错会给出建议 |
| `Label` | 运行时报错会给出建议 |
| `LinearBase` | 轴刻度策略类——常用需求用 `Axes` 的参数即可 |
| `LogBase` | 轴刻度策略类——对数轴暂不支持 |
| `MathTypst` | 用 `MathTex` |
| `OpenGLPGroup` / `OpenGLPMPoint` / `OpenGLPMobject` | OpenGL 渲染器相关，不适用 |
| `Point` | 运行时报错会给出建议 |
| `SceneFileWriter` | 视频文件写出——浏览器内没有文件产出 |
| `Section` | 视频分段——浏览器内没有文件产出 |
| `SpecialThreeDScene` | 用 `ThreeDScene` 并手动配置 |
| `Surface` | 参数曲面不支持；`ThreeDScene` 本身可用 |
| `TrueDot` | 用 `Dot` |
| `Typst` | 用 `MathTex` |

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

## 数据来源

`scripts/probe-api.mjs` 在无头浏览器里把 Manim CE 0.22.0 的公开 API 逐项对到运行时实测：能直接用的记 `ok`、改名可用的记 `alias`、缺失的记 `missing` 并附替代写法。升级依赖后重跑探针、重新生成本页数据——清单与运行时行为始终一致，不是手工维护的文档。
