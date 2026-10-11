<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# 坐标系与数据

数轴、网格、坐标轴标签、c2p 坐标换算、曲线面积与黎曼矩形，以及柱状图、矩阵与表格。

本页 12 条示例。代码引自 `corpus/examples/graph/`，截图为真机渲染的终态。

## 数轴 + 数字

一条数轴，刻度与刻度数字对得上、间距均匀。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/graph/01-number-line.png" alt="数轴 + 数字" />
</div>

<<< @/../corpus/examples/graph/01-number-line.py[代码]

:::

## 平面网格

平面网格两个方向的线都齐整，间距一致。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/graph/02-number-plane.png" alt="平面网格" />
</div>

<<< @/../corpus/examples/graph/02-number-plane.py[代码]

:::

## 坐标轴 + 轴标签

坐标轴带箭头与 x / y 轴标签，标签贴在轴端。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/graph/03-axes-labels.png" alt="坐标轴 + 轴标签" />
</div>

<<< @/../corpus/examples/graph/03-axes-labels.py[代码]

:::

## 曲线加标签

曲线旁边贴着它的标签，不出画、不压线。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/graph/04-graph-label.png" alt="曲线加标签" />
</div>

<<< @/../corpus/examples/graph/04-graph-label.py[代码]

:::

## c2p 把坐标换算成画布位置

标记点精确落在 c2p 换算出的坐标位置上（print 的数值与画面一致）。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/graph/05-c2p.png" alt="c2p 把坐标换算成画布位置" />
</div>

<<< @/../corpus/examples/graph/05-c2p.py[代码]

:::

## 曲线下的面积

曲线与 x 轴之间一块半透明填充，边界就是曲线段。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/graph/06-area.png" alt="曲线下的面积" />
</div>

<<< @/../corpus/examples/graph/06-area.py[代码]

:::

## 黎曼矩形

一排矩形贴着曲线下沿排开，高度按取样点的函数值。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/graph/07-riemann.png" alt="黎曼矩形" />
</div>

<<< @/../corpus/examples/graph/07-riemann.py[代码]

:::

## 柱状图

三根柱子红 / 蓝 / 绿三色、高低与数据一致、间距均匀，标题在图上方不压图。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/graph/08-bar-chart.png" alt="柱状图" />
</div>

<<< @/../corpus/examples/graph/08-bar-chart.py[代码]

:::

## 矩阵

矩阵按行列排布，元素与传入内容一致。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/graph/09-matrix.png" alt="矩阵" />
</div>

<<< @/../corpus/examples/graph/09-matrix.py[代码]

:::

## 表格 + 表头

表格带表头行，行列对齐、格线齐全。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/graph/10-table.png" alt="表格 + 表头" />
</div>

<<< @/../corpus/examples/graph/10-table.py[代码]

:::

## 整数表（直接写数字）

整数直接填进格子（不经过 LaTeX 数字格式化），内容一致。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/graph/11-integer-table.png" alt="整数表（直接写数字）" />
</div>

<<< @/../corpus/examples/graph/11-integer-table.py[代码]

:::

## LaTeX 表

表格内容按 LaTeX 排版（公式字体），不是普通文本字体。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/graph/12-math-table.png" alt="LaTeX 表" />
</div>

<<< @/../corpus/examples/graph/12-math-table.py[代码]

:::
