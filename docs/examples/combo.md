<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# 综合场景（多库协同·需联网）

pandas / scipy / sklearn / statsmodels / matplotlib 与 Manim 串成一条讲解管线，需联网取包。

本页 5 条示例。代码引自 `corpus/examples/combo/`，截图为真机渲染的终态。

## 综合场景：pandas 洗数 → sklearn 拟合 → Manim 画线

数据点散布 + 拟合直线：直线贴合数据趋势，斜率截距与 sklearn 的结果一致。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/combo/01-pandas-sklearn-fit.png" alt="综合场景：pandas 洗数 → sklearn 拟合 → Manim 画线" />
</div>

<<< @/../corpus/examples/combo/01-pandas-sklearn-fit.py[代码]

:::

## 综合场景：pandas 滚动统计 + scipy.signal 平滑与寻峰

原始数据、平滑后的曲线、寻峰标记三层都在：峰位与数据特征对得上。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/combo/02-pandas-scipy-signal.png" alt="综合场景：pandas 滚动统计 + scipy.signal 平滑与寻峰" />
</div>

<<< @/../corpus/examples/combo/02-pandas-scipy-signal.py[代码]

:::

## 综合场景：scipy 解 ODE + numpy 取解 + Manim 画两条对照曲线

两条对照曲线的形态与 ODE 数值解一致，图例 / 标注齐全。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/combo/03-scipy-numpy-ode.png" alt="综合场景：scipy 解 ODE + numpy 取解 + Manim 画两条对照曲线" />
</div>

<<< @/../corpus/examples/combo/03-scipy-numpy-ode.py[代码]

:::

## 综合场景：pandas 造表 → statsmodels OLS 拟合与预测 → Manim 画回归

造表、拟合、画回归一条龙：拟合线贴合数据，预测点落在合理位置。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/combo/04-pandas-statsmodels-ols.png" alt="综合场景：pandas 造表 → statsmodels OLS 拟合与预测 → Manim 画回归" />
</div>

<<< @/../corpus/examples/combo/04-pandas-statsmodels-ols.py[代码]

:::

## 综合场景：numpy 造簇 → sklearn KMeans → matplotlib 取色 → Manim 上色

散点按 KMeans 的簇用 matplotlib 取的色上色：同簇同色、中心可辨。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/combo/05-sklearn-matplotlib-clusters.png" alt="综合场景：numpy 造簇 → sklearn KMeans → matplotlib 取色 → Manim 上色" />
</div>

<<< @/../corpus/examples/combo/05-sklearn-matplotlib-clusters.py[代码]

:::
