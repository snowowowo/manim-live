<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# 讲解场景（模板）

通用讲解范式：单位圆、正弦波追踪、勾股、极坐标、割线趋近、黎曼和、线性变换与概率对照。

本页 13 条示例。代码引自 `corpus/examples/lesson/`，截图为真机渲染的终态。

## 单位圆与三角函数线

单位圆上一点转动，正弦 / 余弦线随角度伸缩，长度与角度对得上。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/lesson/01-unit-circle.png" alt="单位圆与三角函数线" />
</div>

<<< @/../corpus/examples/lesson/01-unit-circle.py[代码]

:::

## 从圆上一点画出正弦波

圆上的点一边转、波形一边向右展开，画出的正是正弦曲线（振幅 ±1.2 的完整正弦，真时序下观察；极速截图帧点过疏会让 TracedPath 轨迹塌成直线，属截图假象）。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/lesson/02-sine-wave-trace.png" alt="从圆上一点画出正弦波" />
</div>

<<< @/../corpus/examples/lesson/02-sine-wave-trace.py[代码]

:::

## 勾股定理

直角三角形三边上贴的正方形面积关系呈现 a² + b² = c²。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/lesson/03-pythagorean.png" alt="勾股定理" />
</div>

<<< @/../corpus/examples/lesson/03-pythagorean.py[代码]

:::

## 极坐标玫瑰线

玫瑰线的花瓣数与方程参数一致：左边 k=5 是 5 瓣（k 奇）、右边 k=2 是 4 瓣（2k 瓣，k 偶），两条曲线各自配方程标注，「奇 k → k 瓣 / 偶 k → 2k 瓣」的规律对照着看得出来。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/lesson/04-polar-rose.png" alt="极坐标玫瑰线" />
</div>

<<< @/../corpus/examples/lesson/04-polar-rose.py[代码]

:::

## 阿基米德螺线

螺线一圈圈等距外扩，圈距恒定（阿基米德螺线的特征）。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/lesson/05-polar-spiral.png" alt="阿基米德螺线" />
</div>

<<< @/../corpus/examples/lesson/05-polar-spiral.py[代码]

:::

## 割线趋近切线（导数的定义）

割线绕切点旋转、越来越贴近切线，最终重合。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/lesson/06-secant-tangent.png" alt="割线趋近切线（导数的定义）" />
</div>

<<< @/../corpus/examples/lesson/06-secant-tangent.py[代码]

:::

## 黎曼和逼近积分

矩形越分越细、矩形面积之和越来越接近定积分值：粗分 dx=1 的矩形以描边 ghost 留在终态与细分 dx=0.25 对照，右侧两行标注给出两档的面积和（1.60 → 2.63，真值 2.27）。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/lesson/07-riemann-sum.png" alt="黎曼和逼近积分" />
</div>

<<< @/../corpus/examples/lesson/07-riemann-sum.py[代码]

:::

## 线性变换：旋转

网格与向量整体旋转 30°（非 90° 倍数，网格斜过来朝向明显变了），形状不变；矩阵写成 cos/sin 30° 的形式，绿色箭头长 2 格、旋转后仍对齐网格刻度。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/lesson/08-linear-rotate.png" alt="线性变换：旋转" />
</div>

<<< @/../corpus/examples/lesson/08-linear-rotate.py[代码]

:::

## 线性变换：剪切

网格被剪切：横行水平错动、竖列倾斜，变换前网格以低透明度 ghost 留在原位对照，一个 1×1 参照正方形变成同底同高的平行四边形——「每格面积不变（det=1）」看得见。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/lesson/09-linear-shear.png" alt="线性变换：剪切" />
</div>

<<< @/../corpus/examples/lesson/09-linear-shear.py[代码]

:::

## 线性变换：特征方向

特征方向上的向量变换后仍在这条方向上（红 v₁ 沿虚线拉长 3 倍、蓝 v₂ 不动），灰色对照向量 u 变换后偏离原方向——偏折的与不偏折的对照着看；虚线即两条特征方向。变换前三根向量以半透明 ghost 留原位，箭头尖附近有 λ₁=3 / λ₂=1 标注。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/lesson/10-eigenvector.png" alt="线性变换：特征方向" />
</div>

<<< @/../corpus/examples/lesson/10-eigenvector.py[代码]

:::

## 概率：投骰子的频率

掷骰子次数越多，六面的频率柱越来越齐平（趋近均匀）：六根柱几乎等高（15%–18%），实测值都贴着理论值 16.7% 的橙色虚线附近起伏。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/lesson/11-probability-dice.png" alt="概率：投骰子的频率" />
</div>

<<< @/../corpus/examples/lesson/11-probability-dice.py[代码]

:::

## 概率：二项分布

两组二项分布 pmf 折线并排：n=10 峰值约 0.25、n=30 峰值约 0.14——同样的 p，n 越大分布越矮越宽，「参数决定胖瘦」靠两组对照成立。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/lesson/12-probability-binomial.png" alt="概率：二项分布" />
</div>

<<< @/../corpus/examples/lesson/12-probability-binomial.py[代码]

:::

## 空间直角坐标系与立方体

斜视看一个棱长 2 的立方体：三个面同时可见、明暗各不同（有光有深度，不是一块黑）；它坐在第一象限，最远的顶点 (2, 2, 2) 上有个黄点、旁边跟着黄色标注；三条坐标轴从原点穿出，Z 轴朝上。标题钉在画面左上角、不跟相机跑。相机先绕方位角自转一段，再动画转到另一侧——终帧看到的是立方体的另一组侧面，与初始斜视完全不同，证明相机真动了，不是被 2D 拍扁的一张脸。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/lesson/13-space-cube-camera.png" alt="空间直角坐标系与立方体" />
</div>

<<< @/../corpus/examples/lesson/13-space-cube-camera.py[代码]

:::
