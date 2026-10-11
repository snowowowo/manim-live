<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# 构造器参数

位置参数与关键字参数怎么收：半径、边长、坐标、向量、控制点，以及 VGroup 的变长参数。

本页 14 条示例。代码引自 `corpus/examples/ctor/`，截图为真机渲染的终态。

## Circle 位置参数（半径）

两个只给半径位置参数的圆大小不同，半径值与画面一致。

::: code-group

<div class="vp-block active" data-title="画面">

![Circle 位置参数（半径）](../shots/ctor/01-circle-positional.png)

</div>

<<< @/../corpus/examples/ctor/01-circle-positional.py[代码]

:::

## Square 位置参数（边长）

两个只给边长位置参数的方块大小不同。

::: code-group

<div class="vp-block active" data-title="画面">

![Square 位置参数（边长）](../shots/ctor/02-square-positional.png)

</div>

<<< @/../corpus/examples/ctor/02-square-positional.py[代码]

:::

## Dot 位置参数（坐标）

点落在传入的坐标处，不在默认原点。

::: code-group

<div class="vp-block active" data-title="画面">

![Dot 位置参数（坐标）](../shots/ctor/03-dot-positional.png)

</div>

<<< @/../corpus/examples/ctor/03-dot-positional.py[代码]

:::

## Text 字重、字形与字号

几段 Text 的字重 / 斜体 / 字号差异肉眼可见。

::: code-group

<div class="vp-block active" data-title="画面">

![Text 字重、字形与字号](../shots/ctor/04-text-kwargs.png)

</div>

<<< @/../corpus/examples/ctor/04-text-kwargs.py[代码]

:::

## Vector 位置参数

一支箭头，方向与长度和传入的向量一致。

::: code-group

<div class="vp-block active" data-title="画面">

![Vector 位置参数](../shots/ctor/05-vector.png)

</div>

<<< @/../corpus/examples/ctor/05-vector.py[代码]

:::

## ParametricFunction 位置参数

按参数方程画出的曲线，形状与参数方程一致（不是圆也不是直线）。

::: code-group

<div class="vp-block active" data-title="画面">

![ParametricFunction 位置参数](../shots/ctor/06-parametric.png)

</div>

<<< @/../corpus/examples/ctor/06-parametric.py[代码]

:::

## FunctionGraph 收函数

曲线形状与传入的函数一致。

::: code-group

<div class="vp-block active" data-title="画面">

![FunctionGraph 收函数](../shots/ctor/07-function-graph.png)

</div>

<<< @/../corpus/examples/ctor/07-function-graph.py[代码]

:::

## RightAngle 收两条线

直角记号（小折角）立在两条线相交的角上。

::: code-group

<div class="vp-block active" data-title="画面">

![RightAngle 收两条线](../shots/ctor/08-right-angle.png)

</div>

<<< @/../corpus/examples/ctor/08-right-angle.py[代码]

:::

## Angle 收三个点

圆弧贴着三个点确定的角张開，弧的开口与角一致。

::: code-group

<div class="vp-block active" data-title="画面">

![Angle 收三个点](../shots/ctor/09-angle-points.png)

</div>

<<< @/../corpus/examples/ctor/09-angle-points.py[代码]

:::

## Brace 收一个物体

花括号贴在物体一侧，长短与物体相当。

::: code-group

<div class="vp-block active" data-title="画面">

![Brace 收一个物体](../shots/ctor/10-brace.png)

</div>

<<< @/../corpus/examples/ctor/10-brace.py[代码]

:::

## BraceBetweenPoints 收两点

花括号撑在两点之间，方向与两点连线一致、长短与距离相称。

::: code-group

<div class="vp-block active" data-title="画面">

![BraceBetweenPoints 收两点](../shots/ctor/11-brace-between.png)

</div>

<<< @/../corpus/examples/ctor/11-brace-between.py[代码]

:::

## CubicBezier 收四个点

曲线按四个控制点走出三次贝塞尔的形状（起终点在第一、四个点上）。

::: code-group

<div class="vp-block active" data-title="画面">

![CubicBezier 收四个点](../shots/ctor/12-cubic-bezier.png)

</div>

<<< @/../corpus/examples/ctor/12-cubic-bezier.py[代码]

:::

## ValueTracker 收一个初值

ValueTracker 不画任何东西（它只是数值），场景渲染不炸、其余物体正常。

::: code-group

<div class="vp-block active" data-title="画面">

![ValueTracker 收一个初值](../shots/ctor/13-value-tracker.png)

</div>

<<< @/../corpus/examples/ctor/13-value-tracker.py[代码]

:::

## VGroup 变长位置参数

若干物体收进一个 VGroup 后整体定位：一起移动、相对位置不变。

::: code-group

<div class="vp-block active" data-title="画面">

![VGroup 变长位置参数](../shots/ctor/14-vgroup-variadic.png)

</div>

<<< @/../corpus/examples/ctor/14-vgroup-variadic.py[代码]

:::
