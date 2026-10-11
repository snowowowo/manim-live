<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# 高等数学与数学分析

数列极限、夹逼、泰勒、e 的定义、中值定理、上下和、变上限积分、偏导、梯度下降、二重积分、傅里叶与级数。

本页 12 条示例。代码引自 `corpus/examples/math-calculus/`，截图为真机渲染的终态。

## 数列极限：a_n = 1 + 1/n 逼近 1

一排点随 n 增大越挤越密，逐渐贴上 y=1 那条虚线，但永远不与之相交。

::: code-group

<div class="vp-block active" data-title="画面">

![数列极限：a_n = 1 + 1/n 逼近 1](../shots/math-calculus/01-sequence-limit.png)

</div>

<<< @/../corpus/examples/math-calculus/01-sequence-limit.py[代码]

:::

## 夹逼定理：x·sin(1/x) 被 ±x 夹住

中间那条高频抖动的曲线始终夹在两条直线（y=x 与 y=-x）之间，两端一起收到原点。

::: code-group

<div class="vp-block active" data-title="画面">

![夹逼定理：x·sin(1/x) 被 ±x 夹住](../shots/math-calculus/02-squeeze-theorem.png)

</div>

<<< @/../corpus/examples/math-calculus/02-squeeze-theorem.py[代码]

:::

## 泰勒展开：多项式逐阶逼近 sin x

1 次、3 次、5 次、7 次多项式一条比一条贴近正弦曲线，在原点附近先贴合、越远越偏；右边那条公式逐阶补全为完整多项式（1 阶到 7 阶一项不缺），最终颜色与 7 阶曲线一致。

::: code-group

<div class="vp-block active" data-title="画面">

![泰勒展开：多项式逐阶逼近 sin x](../shots/math-calculus/03-taylor-sin.png)

</div>

<<< @/../corpus/examples/math-calculus/03-taylor-sin.py[代码]

:::

## e 的定义：(1+1/n)^n 单调递增趋近 e

点列随 n 增大一路单调上升、并且始终待在那条 y=e 的虚线下面。

::: code-group

<div class="vp-block active" data-title="画面">

![e 的定义：(1+1/n)^n 单调递增趋近 e](../shots/math-calculus/04-e-definition.png)

</div>

<<< @/../corpus/examples/math-calculus/04-e-definition.py[代码]

:::

## 拉格朗日中值定理：割线与切线平行

两端连线（割线，蓝）与中间某点处的切线（黄）**平行**，切点恰好落在中点 x=1。

::: code-group

<div class="vp-block active" data-title="画面">

![拉格朗日中值定理：割线与切线平行](../shots/math-calculus/05-mean-value-theorem.png)

</div>

<<< @/../corpus/examples/math-calculus/05-mean-value-theorem.py[代码]

:::

## 上积分与下积分：同一段区间两种取点法夹住真值

左端点（低）与右端点（高）两组矩形画在同一条分割上：黄色实心块始终在曲线内，蓝色描边框的顶边始终高出曲线；两组各带文字标注（上和 / 下和），对比一眼可见。

::: code-group

<div class="vp-block active" data-title="画面">

![上积分与下积分：同一段区间两种取点法夹住真值](../shots/math-calculus/06-upper-lower-sum.png)

</div>

<<< @/../corpus/examples/math-calculus/06-upper-lower-sum.py[代码]

:::

## 变上限积分：面积函数 S(x) 与它的导数

曲线下的面积一块块往右长出来，右侧数字 S(x) 同步变大；最后点明 S'(x)=f(x)。

::: code-group

<div class="vp-block active" data-title="画面">

![变上限积分：面积函数 S(x) 与它的导数](../shots/math-calculus/07-accumulation-function.png)

</div>

<<< @/../corpus/examples/math-calculus/07-accumulation-function.py[代码]

:::

## 偏导数：分别固定 y 与固定 x 去看的斜率

左边那块画的是「固定 y=1 时 f 随 x 的变化」，右边是「固定 x=1 时 f 随 y 的变化」，两块各有一条过切点 (1, 1.2) 的黄色切线，斜率分别是 0.8 与 1.6，右边明显更陡。

::: code-group

<div class="vp-block active" data-title="画面">

![偏导数：分别固定 y 与固定 x 去看的斜率](../shots/math-calculus/08-partial-derivative.png)

</div>

<<< @/../corpus/examples/math-calculus/08-partial-derivative.py[代码]

:::

## 梯度下降：沿负梯度方向一步步走向最小值

五条同心椭圆是等高线（越里越低），折线从外圈锯齿状折向中心——步子沿负梯度在谷的两侧交替弹跳、一步步收窄，箭头标出每一步的方向。

::: code-group

<div class="vp-block active" data-title="画面">

![梯度下降：沿负梯度方向一步步走向最小值](../shots/math-calculus/09-gradient-descent.png)

</div>

<<< @/../corpus/examples/math-calculus/09-gradient-descent.py[代码]

:::

## 二重积分：把区域切成小方块

矩形区域内铺满小方格，落在圆内的格子被高亮，边上的格子只算一部分。

::: code-group

<div class="vp-block active" data-title="画面">

![二重积分：把区域切成小方块](../shots/math-calculus/10-double-integral-grid.png)

</div>

<<< @/../corpus/examples/math-calculus/10-double-integral-grid.py[代码]

:::

## 傅里叶级数逼近方波

一条方波（台阶状）与四条部分和曲线叠在一起：项数越多，平坦段越平、跳变处越陡，但跳变点附近始终有一个小过冲（吉布斯现象）。

::: code-group

<div class="vp-block active" data-title="画面">

![傅里叶级数逼近方波](../shots/math-calculus/11-fourier-square.png)

</div>

<<< @/../corpus/examples/math-calculus/11-fourier-square.py[代码]

:::

## 部分和：调和级数发散 vs Σ1/n² 收敛

蓝线（调和级数部分和）一路上爬、看不到头；黄线（1/n² 部分和）很快压平并停住。

::: code-group

<div class="vp-block active" data-title="画面">

![部分和：调和级数发散 vs Σ1/n² 收敛](../shots/math-calculus/12-series-partial-sums.png)

</div>

<<< @/../corpus/examples/math-calculus/12-series-partial-sums.py[代码]

:::
