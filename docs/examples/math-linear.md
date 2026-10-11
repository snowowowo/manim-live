<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# 线性代数

矩阵乘向量、行列式面积、奇异矩阵、投影、Gram–Schmidt、特征分解、秩与零空间、基变换、最小二乘、二次型与 SVD。

本页 12 条示例。代码引自 `corpus/examples/math-linear/`，截图为真机渲染的终态。

## 矩阵乘向量 = 列的线性组合

两个列向量 a₁ / a₂（蓝、绿）按系数各自伸缩后拼成平行四边形，对角线就是 A·x。

::: code-group

<div class="vp-block active" data-title="画面">

![矩阵乘向量 = 列的线性组合](../shots/math-linear/01-matrix-vector-product.png)

</div>

<<< @/../corpus/examples/math-linear/01-matrix-vector-product.py[代码]

:::

## 行列式的几何意义：单位正方形的面积被放大 |det| 倍

网格里那个黄色单位正方形被拉成平行四边形，面积从 1 变成 2（det=2）。

::: code-group

<div class="vp-block active" data-title="画面">

![行列式的几何意义：单位正方形的面积被放大 |det| 倍](../shots/math-linear/02-determinant-area.png)

</div>

<<< @/../corpus/examples/math-linear/02-determinant-area.py[代码]

:::

## 奇异矩阵：det=0 把整个平面压成一条线

网格连同黄色方块被压扁成一条斜线，方块永远变不回有面积的形状。

::: code-group

<div class="vp-block active" data-title="画面">

![奇异矩阵：det=0 把整个平面压成一条线](../shots/math-linear/03-singular-matrix.png)

</div>

<<< @/../corpus/examples/math-linear/03-singular-matrix.py[代码]

:::

## 正交投影：b 在 a 上的影子

从 b 的末端落一条虚线垂直打到 a 直线上，交点处有个直角符号；黄色箭头就是投影向量。

::: code-group

<div class="vp-block active" data-title="画面">

![正交投影：b 在 a 上的影子](../shots/math-linear/04-orthogonal-projection.png)

</div>

<<< @/../corpus/examples/math-linear/04-orthogonal-projection.py[代码]

:::

## Gram–Schmidt：把第二个向量减掉它在第一个上的投影

绿色向量沿虚线滑到红色位置后，与蓝色向量成直角（交点处有直角符号）。

::: code-group

<div class="vp-block active" data-title="画面">

![Gram–Schmidt：把第二个向量减掉它在第一个上的投影](../shots/math-linear/05-gram-schmidt.png)

</div>

<<< @/../corpus/examples/math-linear/05-gram-schmidt.py[代码]

:::

## 特征方向：变换后方向不变的向量

两条虚线标出的方向上，向量变换后仍落在同一条直线上（只被拉长/压短）；第三个向量明显偏转。变换前三根向量以半透明 ghost 留在画面，与变换后的实色向量形成 before/after 对照。

::: code-group

<div class="vp-block active" data-title="画面">

![特征方向：变换后方向不变的向量](../shots/math-linear/06-eigen-decomposition.png)

</div>

<<< @/../corpus/examples/math-linear/06-eigen-decomposition.py[代码]

:::

## 零空间：被映到 0 的那些方向

沿 (-2,1) 方向的箭头（红）变换后缩成一个点（原点处红点）；另一个方向（绿）变换后变成它的 2 倍长。

::: code-group

<div class="vp-block active" data-title="画面">

![零空间：被映到 0 的那些方向](../shots/math-linear/07-rank-nullspace.png)

</div>

<<< @/../corpus/examples/math-linear/07-rank-nullspace.py[代码]

:::

## 基变换：同一个向量的两套坐标

蓝色基与绿色基合成一个平行四边形（0.6·b₂ 那条闭合边用绿色虚线补全，并标注 1.2·b₁ / 0.6·b₂），黄色向量沿它们走的方式就是 (1.2, 0.6)；换成标准基去看，同一根箭头的坐标变成另一组数。

::: code-group

<div class="vp-block active" data-title="画面">

![基变换：同一个向量的两套坐标](../shots/math-linear/08-basis-change.png)

</div>

<<< @/../corpus/examples/math-linear/08-basis-change.py[代码]

:::

## 旋转矩阵的复合：转两次 30° 等于转一次 60°

网格与黄色方块先被转 30°、再转 30°，两次之后的姿态与「一次转 60°」（虚线参考）完全重合。

::: code-group

<div class="vp-block active" data-title="画面">

![旋转矩阵的复合：转两次 30° 等于转一次 60°](../shots/math-linear/09-rotation-composition.png)

</div>

<<< @/../corpus/examples/math-linear/09-rotation-composition.py[代码]

:::

## 最小二乘：拟合直线与残差

五个数据点上方有一条蓝色拟合直线，每个点到直线的竖直残差用灰色虚线画出、长短一目了然。

::: code-group

<div class="vp-block active" data-title="画面">

![最小二乘：拟合直线与残差](../shots/math-linear/10-least-squares.png)

</div>

<<< @/../corpus/examples/math-linear/10-least-squares.py[代码]

:::

## 二次型：正定的椭圆 vs 不定的双曲

左边一组同心椭圆（正定：所有方向都往上弯），右边一对双曲分支（不定：有的方向往下弯）。

::: code-group

<div class="vp-block active" data-title="画面">

![二次型：正定的椭圆 vs 不定的双曲](../shots/math-linear/11-quadratic-form.png)

</div>

<<< @/../corpus/examples/math-linear/11-quadratic-form.py[代码]

:::

## SVD 的几何含义：旋转 → 拉伸 → 再旋转

黄色圆经过三步（转 40°、沿轴拉伸、再转 -25°）变成一个倾斜的椭圆；中间那一步能明显看出两个方向被拉得不一样。

::: code-group

<div class="vp-block active" data-title="画面">

![SVD 的几何含义：旋转 → 拉伸 → 再旋转](../shots/math-linear/12-svd-geometry.png)

</div>

<<< @/../corpus/examples/math-linear/12-svd-geometry.py[代码]

:::
