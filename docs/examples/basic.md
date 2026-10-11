<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# 基础几何

圆、矩形、椭圆、弧、多边形、星形这些基本形，以及线、点、箭头的各种变体。

本页 11 条示例。代码引自 `corpus/examples/basic/`，截图为真机渲染的终态。

## 画一个圆

画面中央出现一个默认描边色的圆，动画是 Create 沿轮廓描出来。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/basic/01-circle.png" alt="画一个圆" />
</div>

<<< @/../corpus/examples/basic/01-circle.py[代码]

:::

## 方块旋转 45°

方块绕自身中心旋转 45°，位置与大小不变。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/basic/02-square-rotate.png" alt="方块旋转 45°" />
</div>

<<< @/../corpus/examples/basic/02-square-rotate.py[代码]

:::

## 矩形与圆角矩形

并排一个普通矩形与一个圆角矩形，四角圆滑差异肉眼可见。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/basic/03-rect-rounded.png" alt="矩形与圆角矩形" />
</div>

<<< @/../corpus/examples/basic/03-rect-rounded.py[代码]

:::

## 椭圆与圆环

一个椭圆与一个圆环：环是中空的（内外两个半径）。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/basic/04-ellipse-annulus.png" alt="椭圆与圆环" />
</div>

<<< @/../corpus/examples/basic/04-ellipse-annulus.py[代码]

:::

## 圆弧与扇形

一段圆弧（只描边）与一个扇形（弧 + 两条半径 + 填充）。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/basic/05-arc-sector.png" alt="圆弧与扇形" />
</div>

<<< @/../corpus/examples/basic/05-arc-sector.py[代码]

:::

## 三角形与正六边形

一个三角形与一个正六边形并排，边数与名字一致。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/basic/06-polygons.png" alt="三角形与正六边形" />
</div>

<<< @/../corpus/examples/basic/06-polygons.py[代码]

:::

## 六角星

一个六角星轮廓，六个尖角清晰。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/basic/07-star.png" alt="六角星" />
</div>

<<< @/../corpus/examples/basic/07-star.py[代码]

:::

## 按顶点画多边形

按给定顶点顺次连成的多边形，形状与顶点坐标相符。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/basic/08-polygon-vertices.png" alt="按顶点画多边形" />
</div>

<<< @/../corpus/examples/basic/08-polygon-vertices.py[代码]

:::

## 坐标系 + 函数曲线

一套坐标系上画出函数曲线，曲线走势与函数一致、贴着坐标刻度。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/basic/09-axes-plot.png" alt="坐标系 + 函数曲线" />
</div>

<<< @/../corpus/examples/basic/09-axes-plot.py[代码]

:::

## 线、点、箭头

线、点、箭头各一个：箭头的一端有箭头帽，点在指定位置。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/basic/10-line-dot-arrow.png" alt="线、点、箭头" />
</div>

<<< @/../corpus/examples/basic/10-line-dot-arrow.py[代码]

:::

## 虚线、双箭头、弧线箭头

虚线是断续的、双箭头两端都有帽、弧线箭头带弧度，三者一眼可分。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/basic/11-line-variants.png" alt="虚线、双箭头、弧线箭头" />
</div>

<<< @/../corpus/examples/basic/11-line-variants.py[代码]

:::
