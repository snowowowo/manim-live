<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# 概率论与统计

容斥、条件概率、贝叶斯树、期望与方差、大数定律、中心极限、泊松、3σ 法则、蒙特卡洛 π、随机游走与假设检验。

本页 12 条示例。代码引自 `corpus/examples/math-prob/`，截图为真机渲染的终态。

## 概率的加法公式（容斥）：P(A∪B) = P(A) + P(B) - P(A∩B)

样本空间 Ω 里两个半透明矩形事件 A、B 相互交叠，重叠区由两层填色混出中间色；A∩B 用红色描边框单独点亮并标注字母，再回到公式里说明它刚好是被重复计入的那一份。

::: code-group

<div class="vp-block active" data-title="画面">

![概率的加法公式（容斥）：P(A∪B) = P(A) + P(B) - P(A∩B)](../shots/math-prob/01-inclusion-exclusion.png)

</div>

<<< @/../corpus/examples/math-prob/01-inclusion-exclusion.py[代码]

:::

## 条件概率：换一个样本空间重新归一化

事件 A 被 B 的边界切成两半，先点亮落在 B 里的那一半；随后 B 之外的部分整体压暗，只剩 B 内部重新按比例摊开。

::: code-group

<div class="vp-block active" data-title="画面">

![条件概率：换一个样本空间重新归一化](../shots/math-prob/02-conditional-probability.png)

</div>

<<< @/../corpus/examples/math-prob/02-conditional-probability.py[代码]

:::

## 贝叶斯公式：一棵树上把先验和似然合成后验

左侧两层分叉的树把「患病 1% × 检出 99%」和「健康 99% × 误报 5%」两条路分别铺开；右侧列出两条路的联合概率，绿色那条阳性总概率是分母，红色那条占比就是后验。

::: code-group

<div class="vp-block active" data-title="画面">

![贝叶斯公式：一棵树上把先验和似然合成后验](../shots/math-prob/03-bayes-tree.png)

</div>

<<< @/../corpus/examples/math-prob/03-bayes-tree.py[代码]

:::

## 期望：概率分布的「重心」，也是这根杠杆的支点

六个取值位置上立着高度正比于概率的方块，杠杆在正中间找到平衡——支点恰好落在加权平均 μ=3.6 处，而不是算术中心 3.5。

::: code-group

<div class="vp-block active" data-title="画面">

![期望：概率分布的「重心」，也是这根杠杆的支点](../shots/math-prob/04-expectation-balance.png)

</div>

<<< @/../corpus/examples/math-prob/04-expectation-balance.py[代码]

:::

## 方差刻画离散程度：同期望，不同「撒得开」

上下一共两组数据共享同一条数轴和同一个均值刻度，但一组的点挤成一撮、另一组散得很开；两条两端带短竖线端点标记的横线标出各自的极差，视觉差距直接对应方差 2 与 200。

::: code-group

<div class="vp-block active" data-title="画面">

![方差刻画离散程度：同期望，不同「撒得开」](../shots/math-prob/05-variance-spread.png)

</div>

<<< @/../corpus/examples/math-prob/05-variance-spread.py[代码]

:::

## 大数定律：频率随试验次数增加而贴向真实概率

一条从剧烈上下抖动开始、越往右摆幅越小的折线，逐渐收拢到 y=0.5 那条理论概率的虚线上——收敛是「以概率 1」的，不是每一步都单调靠近。

::: code-group

<div class="vp-block active" data-title="画面">

![大数定律：频率随试验次数增加而贴向真实概率](../shots/math-prob/06-law-of-large-numbers.png)

</div>

<<< @/../corpus/examples/math-prob/06-law-of-large-numbers.py[代码]

:::

## 中心极限定理：独立同分布求和，分布形状必然向正态靠拢

三个并排直方图，从左到右分别是一颗骰子（平的）、两颗之和（三角形）、四颗之和（明显钟形）；右侧两张的柱子朝中间堆、两端塌下去，且被归一化成同高以便比较形状。

::: code-group

<div class="vp-block active" data-title="画面">

![中心极限定理：独立同分布求和，分布形状必然向正态靠拢](../shots/math-prob/07-central-limit-theorem.png)

</div>

<<< @/../corpus/examples/math-prob/07-central-limit-theorem.py[代码]

:::

## 泊松分布：稀有事件在时间轴上的到达

一条时间轴上不均匀地散落着若干次到达时刻（事件不能重叠），旁边画出计数 k 的分布柱：k=2、3 附近最高，两端迅速衰减。

::: code-group

<div class="vp-block active" data-title="画面">

![泊松分布：稀有事件在时间轴上的到达](../shots/math-prob/08-poisson-arrivals.png)

</div>

<<< @/../corpus/examples/math-prob/08-poisson-arrivals.py[代码]

:::

## 正态分布的 3σ 法则：钟形曲线下的面积怎么分

钟形曲线下方用虚线切出 ±1σ、±2σ、±3σ 三道关口，右侧列出各自覆盖的面积；下方 1000 次抽样的小点密密麻麻挤在中间，落在 ±2.5σ 之外的少数几个被染红。

::: code-group

<div class="vp-block active" data-title="画面">

![正态分布的 3σ 法则：钟形曲线下的面积怎么分](../shots/math-prob/09-normal-sigma.png)

</div>

<<< @/../corpus/examples/math-prob/09-normal-sigma.py[代码]

:::

## 蒙特卡洛估算 π：往正方形里撒点，数落在四分之一圆内的比例

边长为 2 的正方形内含一个四分之一圆，蓝点在正方形里随机撒开：落在圆弧内的染黄、在外面的留蓝；右下角实时显示累计比例乘 4 逼近 3.14。

::: code-group

<div class="vp-block active" data-title="画面">

![蒙特卡洛估算 π：往正方形里撒点，数落在四分之一圆内的比例](../shots/math-prob/10-monte-carlo-pi.png)

</div>

<<< @/../corpus/examples/math-prob/10-monte-carlo-pi.py[代码]

:::

## 随机游走：每一步无记忆，但整体呈现出 √n 的尺度

四条独立的一维随机游走轨迹同时从原点出发，各自上下乱走、互不同步；终点被标出，包围它们的横向包络宽度远小于步数——典型量级是 √n 而不是 n。

::: code-group

<div class="vp-block active" data-title="画面">

![随机游走：每一步无记忆，但整体呈现出 √n 的尺度](../shots/math-prob/11-random-walk.png)

</div>

<<< @/../corpus/examples/math-prob/11-random-walk.py[代码]

:::

## 假设检验的两类错误：α 是弃真，β 是取伪

两条错开的钟形曲线分别代表原假设 H0 与备择假设 H1；H0 右尾被切出红线区（弃真 / 假阳性），H1 左尾被切出黄线区（取伪 / 假阴性），中间那道竖线就是拒绝域的门槛。

::: code-group

<div class="vp-block active" data-title="画面">

![假设检验的两类错误：α 是弃真，β 是取伪](../shots/math-prob/12-hypothesis-test.png)

</div>

<<< @/../corpus/examples/math-prob/12-hypothesis-test.py[代码]

:::
