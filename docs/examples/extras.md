<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# 引擎扩展图表（manim_live_extra）

**这些不是原版 Manim 的图形。** 它们在引擎扩展车道上：代码里要写 `from manim_live_extra import …`，只在本套引擎里渲染；本机 CLI 导出会被导出前置门当场拒绝（见[支持面](/guide/support)）。本页 34 个图形按用途分：统计与通用图表 14、数学可视化 2、生物 3、化学 1、机器学习 5、概率 1、网络与流程 1、3D 5、分形 2。

本页 34 条示例。代码引自 `corpus/examples/extras/`，截图为真机渲染的终态。

## 直方图 Histogram

四根柱子的直方图，柱高按各桶计数、右高左低，坐标轴自动生成。

::: code-group

<div class="vp-block active" data-title="画面">

![直方图 Histogram](../shots/extras/01-histogram.png)

</div>

<<< @/../corpus/examples/extras/01-histogram.py[代码]

:::

## 箱线图 BoxPlot

两组并排的箱线图（箱 + 须 + 离群点），左组数据整体高于右组。

::: code-group

<div class="vp-block active" data-title="画面">

![箱线图 BoxPlot](../shots/extras/02-boxplot.png)

</div>

<<< @/../corpus/examples/extras/02-boxplot.py[代码]

:::

## 小提琴图 ViolinPlot

两把「小提琴」（核密度轮廓）并排，提琴宽度随数据密度起伏。

::: code-group

<div class="vp-block active" data-title="画面">

![小提琴图 ViolinPlot](../shots/extras/03-violinplot.png)

</div>

<<< @/../corpus/examples/extras/03-violinplot.py[代码]

:::

## 散点图 ScatterPlot

一片正相关的散点（x 越大 y 越大），坐标轴自动生成。

::: code-group

<div class="vp-block active" data-title="画面">

![散点图 ScatterPlot](../shots/extras/04-scatterplot.png)

</div>

<<< @/../corpus/examples/extras/04-scatterplot.py[代码]

:::

## 堆叠柱状图 StackedBarChart

三根柱子，每根由两段颜色堆成（下蓝上绿），带图例。

::: code-group

<div class="vp-block active" data-title="画面">

![堆叠柱状图 StackedBarChart](../shots/extras/05-stacked-bar.png)

</div>

<<< @/../corpus/examples/extras/05-stacked-bar.py[代码]

:::

## 面积图 AreaChart

两条填充到基线的面积带（颜色不同、部分重叠），随 x 起伏。

::: code-group

<div class="vp-block active" data-title="画面">

![面积图 AreaChart](../shots/extras/06-area-chart.png)

</div>

<<< @/../corpus/examples/extras/06-area-chart.py[代码]

:::

## 阶梯图 StepChart

一条台阶状的折线（数据点之间水平 / 垂直跳变），各点带圆点。

::: code-group

<div class="vp-block active" data-title="画面">

![阶梯图 StepChart](../shots/extras/07-step-chart.png)

</div>

<<< @/../corpus/examples/extras/07-step-chart.py[代码]

:::

## 日历热图 CalendarHeatmap

一排按周对齐的格子（日历），颜色深浅随每天的数值变化。

::: code-group

<div class="vp-block active" data-title="画面">

![日历热图 CalendarHeatmap](../shots/extras/08-calendar-heatmap.png)

</div>

<<< @/../corpus/examples/extras/08-calendar-heatmap.py[代码]

:::

## 饼图 PieChart

一张三块的饼（占比 2:1:1），每块带文字标签。

::: code-group

<div class="vp-block active" data-title="画面">

![饼图 PieChart](../shots/extras/09-pie-chart.png)

</div>

<<< @/../corpus/examples/extras/09-pie-chart.py[代码]

:::

## 环图 DonutChart

中空的三色圆环（占比 3:2:1），中间能看到画布底色。

::: code-group

<div class="vp-block active" data-title="画面">

![环图 DonutChart](../shots/extras/10-donut-chart.png)

</div>

<<< @/../corpus/examples/extras/10-donut-chart.py[代码]

:::

## 雷达图 RadarChart

五边形网格上叠一个数据多边形（五个维度数值不一），维度带标签。

::: code-group

<div class="vp-block active" data-title="画面">

![雷达图 RadarChart](../shots/extras/11-radar-chart.png)

</div>

<<< @/../corpus/examples/extras/11-radar-chart.py[代码]

:::

## 甘特图 GanttChart

两条时间条（调研在前、开发在后并有交叠），横轴是时间、行带任务名。

::: code-group

<div class="vp-block active" data-title="画面">

![甘特图 GanttChart](../shots/extras/12-gantt-chart.png)

</div>

<<< @/../corpus/examples/extras/12-gantt-chart.py[代码]

:::

## 标量场热图 HeatMap

一片按函数值着色的色块（中心亮、向外渐变），色带连续无网格线。

::: code-group

<div class="vp-block active" data-title="画面">

![标量场热图 HeatMap](../shots/extras/13-heatmap.png)

</div>

<<< @/../corpus/examples/extras/13-heatmap.py[代码]

:::

## 等值线图 ContourPlot

同心闭合的等值线（马鞍面上若干圈），线密的地方梯度大。

::: code-group

<div class="vp-block active" data-title="画面">

![等值线图 ContourPlot](../shots/extras/14-contour-plot.png)

</div>

<<< @/../corpus/examples/extras/14-contour-plot.py[代码]

:::

## K 线图 CandlestickChart

三根 K 线：实体 + 上下影线齐全，涨的红、跌的绿（按中国习惯显式指定了涨红跌绿）。

::: code-group

<div class="vp-block active" data-title="画面">

![K 线图 CandlestickChart](../shots/extras/15-candlestick.png)

</div>

<<< @/../corpus/examples/extras/15-candlestick.py[代码]

:::

## 瀑布图 WaterfallChart

四段增减加一根总计柱，柱间有连接线，起点 3 逐段走到 6。

::: code-group

<div class="vp-block active" data-title="画面">

![瀑布图 WaterfallChart](../shots/extras/16-waterfall.png)

</div>

<<< @/../corpus/examples/extras/16-waterfall.py[代码]

:::

## DNA 双螺旋 DNAHelix

两条反向缠绕的骨架带与之间的碱基横档，按碱基着色。

::: code-group

<div class="vp-block active" data-title="画面">

![DNA 双螺旋 DNAHelix](../shots/extras/17-dna-helix.png)

</div>

<<< @/../corpus/examples/extras/17-dna-helix.py[代码]

:::

## 细胞图 Cell

圆形细胞膜 + 细胞核 + 若干带标注的细胞器。

::: code-group

<div class="vp-block active" data-title="画面">

![细胞图 Cell](../shots/extras/18-cell.png)

</div>

<<< @/../corpus/examples/extras/18-cell.py[代码]

:::

## 氨基酸链 AminoAcidChain

一串按残基着色的圆珠，圆珠之间有肽键连线。

::: code-group

<div class="vp-block active" data-title="画面">

![氨基酸链 AminoAcidChain](../shots/extras/19-amino-acid.png)

</div>

<<< @/../corpus/examples/extras/19-amino-acid.py[代码]

:::

## 分子结构式 MoleculeMobject

水分子的骨架式：氧原子标 O、两个氢原子标 H，原子之间是键线。

::: code-group

<div class="vp-block active" data-title="画面">

![分子结构式 MoleculeMobject](../shots/extras/20-molecule.png)

</div>

<<< @/../corpus/examples/extras/20-molecule.py[代码]

:::

## 神经网络 NeuralNetwork

三层节点从左到右排开、相邻层之间连满线，整体在画面中央。

::: code-group

<div class="vp-block active" data-title="画面">

![神经网络 NeuralNetwork](../shots/extras/21-neural-network.png)

</div>

<<< @/../corpus/examples/extras/21-neural-network.py[代码]

:::

## 全连接层 FeedForwardLayer

一列 4 个圆点，等距竖排。

::: code-group

<div class="vp-block active" data-title="画面">

![全连接层 FeedForwardLayer](../shots/extras/22-feed-forward-layer.png)

</div>

<<< @/../corpus/examples/extras/22-feed-forward-layer.py[代码]

:::

## 卷积层 ConvolutionalLayer

三张 3×3 的特征图方块，横向并排。

::: code-group

<div class="vp-block active" data-title="画面">

![卷积层 ConvolutionalLayer](../shots/extras/23-conv-layer.png)

</div>

<<< @/../corpus/examples/extras/23-conv-layer.py[代码]

:::

## 池化层 PoolingLayer

三张 2×2 的特征图方块，横向并排。

::: code-group

<div class="vp-block active" data-title="画面">

![池化层 PoolingLayer](../shots/extras/24-pooling-layer.png)

</div>

<<< @/../corpus/examples/extras/24-pooling-layer.py[代码]

:::

## 图像层 ImageLayer

一块 5×5 的像素方格阵列。

::: code-group

<div class="vp-block active" data-title="画面">

![图像层 ImageLayer](../shots/extras/25-image-layer.png)

</div>

<<< @/../corpus/examples/extras/25-image-layer.py[代码]

:::

## 骰子面 DiceFace

一个圆角方块，上面按 5 点排布五颗圆点。

::: code-group

<div class="vp-block active" data-title="画面">

![骰子面 DiceFace](../shots/extras/26-dice-face.png)

</div>

<<< @/../corpus/examples/extras/26-dice-face.py[代码]

:::

## 桑基图 SankeyDiagram

两条左侧节点汇入两条右侧节点，带宽度与流量成正比的流带。

::: code-group

<div class="vp-block active" data-title="画面">

![桑基图 SankeyDiagram](../shots/extras/27-sankey.png)

</div>

<<< @/../corpus/examples/extras/27-sankey.py[代码]

:::

## 长方体 Box3D

一根坐标轴上立着一个有明暗面的长方体，斜视角一眼是 3D。

::: code-group

<div class="vp-block active" data-title="画面">

![长方体 Box3D](../shots/extras/28-box3d.png)

</div>

<<< @/../corpus/examples/extras/28-box3d.py[代码]

:::

## 三维向量 Vector3D

从原点伸出的带箭头向量，落在三根坐标轴之间。

::: code-group

<div class="vp-block active" data-title="画面">

![三维向量 Vector3D](../shots/extras/29-vector3d.png)

</div>

<<< @/../corpus/examples/extras/29-vector3d.py[代码]

:::

## 参数曲面 ParametricSurface

一块由 u·v 张成的马鞍形曲面，配三根坐标轴。

::: code-group

<div class="vp-block active" data-title="画面">

![参数曲面 ParametricSurface](../shots/extras/30-parametric-surface.png)

</div>

<<< @/../corpus/examples/extras/30-parametric-surface.py[代码]

:::

## 曲面 Surface3D

一块向上翘起的抛物面，配三根坐标轴。

::: code-group

<div class="vp-block active" data-title="画面">

![曲面 Surface3D](../shots/extras/31-surface3d.png)

</div>

<<< @/../corpus/examples/extras/31-surface3d.py[代码]

:::

## 隐式曲面 ImplicitSurface

一个由 x²+y²+z²=1 等值面剖出来的球面。

::: code-group

<div class="vp-block active" data-title="画面">

![隐式曲面 ImplicitSurface](../shots/extras/32-implicit-surface.png)

</div>

<<< @/../corpus/examples/extras/32-implicit-surface.py[代码]

:::

## 曼德博集 MandelbrotSet

一块完整的分形图：心形主体加周边小圆盘，边界有色带。

::: code-group

<div class="vp-block active" data-title="画面">

![曼德博集 MandelbrotSet](../shots/extras/33-mandelbrot.png)

</div>

<<< @/../corpus/examples/extras/33-mandelbrot.py[代码]

:::

## 牛顿分形 NewtonFractal

一块按三次单位根分区的三色分形，边界处有细密纹理。

::: code-group

<div class="vp-block active" data-title="画面">

![牛顿分形 NewtonFractal](../shots/extras/34-newton-fractal.png)

</div>

<<< @/../corpus/examples/extras/34-newton-fractal.py[代码]

:::
