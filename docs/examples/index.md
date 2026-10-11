# 渲染成品画廊

下面所有截图都出自本仓语料（`corpus/examples/`，239 条 / 19 组），由 `scripts/shot-corpus.mjs`
用**真 Chromium 逐条渲染**落图——不是设计稿，每一张背后都有一段能跑的 Python。
按领域与 API 分节，从基础图形到线性代数、数学分析、概率、离散数学、群论，再到第三方库联动。
想看动画过程，`pnpm playground` 在本地起演示台，逐条实播。

::: info 为什么是终态截图
截图抓的是动画播完后的那一帧。动画**过程**（物体怎么动、怎么变形）静态图呈现不了；
个别强动画语料的终态还很平淡（比如「物体飞出去了」）。这类请以 playground 实播为准。
:::

## 基础图形与函数

<figure>
  <img src="../images/axes-plot.png" alt="坐标系与函数曲线" loading="lazy" />
  <figcaption>坐标系 + 函数曲线 —— <code>basic/09-axes-plot.py</code></figcaption>
</figure>

<figure>
  <img src="../images/bar-chart.png" alt="三色柱状图" loading="lazy" />
  <figcaption>柱状图（红 / 蓝 / 绿，高度与数据一致）—— <code>graph/08-bar-chart.py</code></figcaption>
</figure>

<figure>
  <img src="../images/area.png" alt="曲线下的面积" loading="lazy" />
  <figcaption>曲线与 x 轴之间的半透明填充，边界就是曲线段 —— <code>graph/06-area.py</code></figcaption>
</figure>

## 文字与公式

<figure>
  <img src="../images/mathtex-frac.png" alt="MathTex 分式与根号" loading="lazy" />
  <figcaption>MathTex：分式有横线、根号盖住被开方数 —— <code>text/02-mathtex-frac.py</code></figcaption>
</figure>

<figure>
  <img src="../images/markup.png" alt="MarkupText 富文本" loading="lazy" />
  <figcaption>MarkupText 富文本：局部加粗 / 变色生效，其余部分不受影响 —— <code>text/04-markup.py</code></figcaption>
</figure>

## 动画与更新

<figure>
  <img src="../images/rate-variants.png" alt="there_and_back 速率函数" loading="lazy" />
  <figcaption>速率函数：物体走到目标后又原路折返（there_and_back 的标志性行为）—— <code>animate/04-rate-variants.py</code></figcaption>
</figure>

<figure>
  <img src="../images/traced-path.png" alt="TracedPath 跟随物体" loading="lazy" />
  <figcaption>TracedPath：点移动时身后拖出一条轨迹线，与走过的路径重合 —— <code>updater/01-traced-path.py</code></figcaption>
</figure>

## 线性代数

<figure>
  <img src="../images/determinant-area.png" alt="行列式的几何意义" loading="lazy" />
  <figcaption>行列式：单位正方形面积被放大 |det| 倍 —— <code>math-linear/02-determinant-area.py</code></figcaption>
</figure>

<figure>
  <img src="../images/matrix-vector-product.png" alt="矩阵乘向量的几何意义" loading="lazy" />
  <figcaption>矩阵乘向量 = 列的线性组合：两个列向量各自伸缩后拼成平行四边形，对角线即 A·x —— <code>math-linear/01-matrix-vector-product.py</code></figcaption>
</figure>

<figure>
  <img src="../images/gram-schmidt.png" alt="Gram–Schmidt 正交化" loading="lazy" />
  <figcaption>Gram–Schmidt：第二个向量减掉它在第一个上的投影后与之成直角 —— <code>math-linear/05-gram-schmidt.py</code></figcaption>
</figure>

<figure>
  <img src="../images/eigen-decomposition.png" alt="特征方向" loading="lazy" />
  <figcaption>特征分解：虚线标出的方向上向量变换后不偏转、只被伸缩；第三个向量明显偏转 —— <code>math-linear/06-eigen-decomposition.py</code></figcaption>
</figure>

## 数学分析

<figure>
  <img src="../images/taylor-sin.png" alt="泰勒展开逐阶逼近 sin" loading="lazy" />
  <figcaption>泰勒展开：1、3、5、7 次多项式逐阶逼近 sin x，原点附近先贴合 —— <code>math-calculus/03-taylor-sin.py</code></figcaption>
</figure>

<figure>
  <img src="../images/e-definition.png" alt="e 的定义" loading="lazy" />
  <figcaption>e 的定义：(1+1/n)ⁿ 的点列单调上升、始终压在 y=e 虚线之下 —— <code>math-calculus/04-e-definition.py</code></figcaption>
</figure>

<figure>
  <img src="../images/mean-value-theorem.png" alt="拉格朗日中值定理" loading="lazy" />
  <figcaption>拉格朗日中值定理：割线（蓝）与中点处切线（黄）平行 —— <code>math-calculus/05-mean-value-theorem.py</code></figcaption>
</figure>

<figure>
  <img src="../images/upper-lower-sum.png" alt="上积分与下积分" loading="lazy" />
  <figcaption>达布上和与下和：同一分割上左端点（低）与右端点（高）两组矩形夹住真值 —— <code>math-calculus/06-upper-lower-sum.py</code></figcaption>
</figure>

## 概率与统计

<figure>
  <img src="../images/monte-carlo-pi.png" alt="蒙特卡洛估算 π" loading="lazy" />
  <figcaption>蒙特卡洛估算 π：1200 个点撒出 3.140 —— <code>math-prob/10-monte-carlo-pi.py</code></figcaption>
</figure>

<figure>
  <img src="../images/bayes-tree.png" alt="贝叶斯公式的树形展开" loading="lazy" />
  <figcaption>贝叶斯公式：两层分叉树把「患病 1% × 检出 99%」与「健康 99% × 误报 5%」两条路铺开合成后验 —— <code>math-prob/03-bayes-tree.py</code></figcaption>
</figure>

<figure>
  <img src="../images/variance-spread.png" alt="方差刻画离散程度" loading="lazy" />
  <figcaption>方差：两组数据同均值同数轴，一组挤成一撮、一组散得很开，横线标出各自的离散范围 —— <code>math-prob/05-variance-spread.py</code></figcaption>
</figure>

<figure>
  <img src="../images/law-of-large-numbers.png" alt="大数定律" loading="lazy" />
  <figcaption>大数定律：频率折线从剧烈抖动到逐渐收拢在 y=0.5 的理论概率虚线上 —— <code>math-prob/06-law-of-large-numbers.py</code></figcaption>
</figure>

## 离散数学

<figure>
  <img src="../images/power-set-lattice.png" alt="幂集格" loading="lazy" />
  <figcaption>幂集格：8 个子集按包含关系排成立方体投影 —— <code>math-discrete/02-power-set-lattice.py</code></figcaption>
</figure>

<figure>
  <img src="../images/truth-table.png" alt="真值表" loading="lazy" />
  <figcaption>真值表：p→q 与 ¬p∨q 逐行取值，最后两列被绿框圈住——恒等 —— <code>math-discrete/01-truth-table.py</code></figcaption>
</figure>

<figure>
  <img src="../images/hasse-diagram.png" alt="哈斯图" loading="lazy" />
  <figcaption>哈斯图：{1,2,3,6} 按整除关系排成菱形，2 与 3 并排不可比、没有连线 —— <code>math-discrete/05-hasse-diagram.py</code></figcaption>
</figure>

## 群论

<figure>
  <img src="../images/dihedral-symmetry.png" alt="二面体群 D4" loading="lazy" />
  <figcaption>二面体群 D₄：正方形的 8 个对称——上排 4 个旋转、下排 4 个镜像 —— <code>math-group/03-dihedral-symmetry.py</code></figcaption>
</figure>

<figure>
  <img src="../images/cayley-table.png" alt="Cayley 表" loading="lazy" />
  <figcaption>Cayley 表：4×4 的 (Z/4, +) 加法表，单位元一行与表头一致，公理直接读出 —— <code>math-group/02-cayley-table.py</code></figcaption>
</figure>

<figure>
  <img src="../images/lagrange-theorem.png" alt="拉格朗日定理" loading="lazy" />
  <figcaption>拉格朗日定理：12 个元素按陪集染成三色，块数 × 块大小 = 群大小 —— <code>math-group/06-lagrange-theorem.py</code></figcaption>
</figure>

## 3D 与综合课堂

<figure>
  <img src="../images/unit-circle.png" alt="单位圆与三角函数线" loading="lazy" />
  <figcaption>单位圆上一点转动，sin / cos 线随角度伸缩 —— <code>lesson/01-unit-circle.py</code></figcaption>
</figure>

<figure>
  <img src="../images/polar-rose.png" alt="极坐标玫瑰线" loading="lazy" />
  <figcaption>极坐标玫瑰线：k 奇数 k 瓣、k 偶数 2k 瓣 —— <code>lesson/04-polar-rose.py</code></figcaption>
</figure>

<figure>
  <img src="../images/space-cube.png" alt="空间直角坐标系与立方体" loading="lazy" />
  <figcaption>真 3D：三个面同时可见、明暗各不同（ThreeDScene）—— <code>lesson/13-space-cube-camera.py</code></figcaption>
</figure>

## 第三方库联动（pandas / scipy / sklearn / statsmodels）

<figure>
  <img src="../images/sklearn-fit.png" alt="pandas + sklearn 拟合" loading="lazy" />
  <figcaption>pandas 读数据 + sklearn 拟合，结果直接画进 Manim 场景 —— <code>combo/01-pandas-sklearn-fit.py</code></figcaption>
</figure>

<figure>
  <img src="../images/statsmodels-ols.png" alt="statsmodels OLS 回归" loading="lazy" />
  <figcaption>statsmodels 的 OLS 回归：拟合线与样本点同图 —— <code>combo/04-pandas-statsmodels-ols.py</code></figcaption>
</figure>

## 支持面（API 覆盖）

<figure>
  <img src="../images/colors.png" alt="全部 76 个可用色" loading="lazy" />
  <figcaption>76 个颜色常量逐一上色（各不相同，不是一片黑）—— <code>api/01-colors.py</code></figcaption>
</figure>

这只是一瞥。**239 条语料、19 个组**的完整清单与截图在 `corpus/shots/`
（每张图在 `index.json` 里都有一条「应该看见什么」的断言），支持与不支持的逐项清单见[支持面](/guide/support)。

<style>
img { width: 100%; max-width: 720px; display: block; margin: 0 auto; border-radius: 8px; border: 1px solid var(--vp-c-divider); }
figure { margin: 8px 0 28px; }
figcaption { font-size: 13px; color: var(--vp-c-text-2); text-align: center; margin-top: 6px; }
</style>
