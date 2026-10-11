<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# 离散数学

真值表、幂集格、关系矩阵、等价类、哈斯图、归纳法、鸽巢、二分图、着色、最小生成树、欧拉与哈密顿回路、汉诺塔递推。

本页 12 条示例。代码引自 `corpus/examples/math-discrete/`，截图为真机渲染的终态。

## 真值表：p → q 和 ¬p ∨ q 逐行等价

五列的表格里，p、q、¬p、p→q、¬p∨q 四行取值全部填满；最后两列被绿框一起圈住——上下四行逐格相同，右侧标出「恒等」。

::: code-group

<div class="vp-block active" data-title="画面">

![真值表：p → q 和 ¬p ∨ q 逐行等价](../shots/math-discrete/01-truth-table.png)

</div>

<<< @/../corpus/examples/math-discrete/01-truth-table.py[代码]

:::

## 幂集格：{1,2,3} 的 8 个子集按包含关系排成一个立方体

八个节点按子集大小分成四层：最上 ∅、中间两层各三个、最下 {1,2,3}；连线只在「差一个元素」的节点之间。整体形状就是一个三维立方体的平面投影。

::: code-group

<div class="vp-block active" data-title="画面">

![幂集格：{1,2,3} 的 8 个子集按包含关系排成一个立方体](../shots/math-discrete/02-power-set-lattice.png)

</div>

<<< @/../corpus/examples/math-discrete/02-power-set-lattice.py[代码]

:::

## 关系矩阵：把「自反」和「对称」读成矩阵的样子

4×4 的方格对应 {1,2,3,4} 上的有序对，填实代表「有这条关系」。绿色小框圈出主对角线（自反），黄色小框圈出一对关于对角线镜像的格子（对称）——图案翻过去完全不变。

::: code-group

<div class="vp-block active" data-title="画面">

![关系矩阵：把「自反」和「对称」读成矩阵的样子](../shots/math-discrete/03-relation-matrix.png)

</div>

<<< @/../corpus/examples/math-discrete/03-relation-matrix.py[代码]

:::

## 等价类：模 3 同余把 0~8 切成三堆

上方 0~8 九个数字排成一条线；下方被重新排成三行，每行三个数字——同余的那三个凑成一组并被绿框圈住，三组互不重叠、合起来正好是全部九个数。

::: code-group

<div class="vp-block active" data-title="画面">

![等价类：模 3 同余把 0~8 切成三堆](../shots/math-discrete/04-equivalence-classes.png)

</div>

<<< @/../corpus/examples/math-discrete/04-equivalence-classes.py[代码]

:::

## 哈斯图：只画「覆盖关系」，不可比的两个元素一眼看出

{1,2,3,6} 按整除关系排成菱形——1 在最下、6 在最上，而 2 和 3 并排站在中间；2 与 3 之间没有连线，被标上「不可比」。从 1 到 6 的传递关系也没有画线。

::: code-group

<div class="vp-block active" data-title="画面">

![哈斯图：只画「覆盖关系」，不可比的两个元素一眼看出](../shots/math-discrete/05-hasse-diagram.png)

</div>

<<< @/../corpus/examples/math-discrete/05-hasse-diagram.py[代码]

:::

## 数学归纳法的经典图示：两段阶梯拼成一个矩形

左边蓝色阶梯的柱高依次是 1、2、3、4，右边黄色阶梯柱高 4、3、2、1；两块交错拼合后正好填满一个宽 4、高 5 的矩形——所以阶梯的总格子数是 4×5 的一半。

::: code-group

<div class="vp-block active" data-title="画面">

![数学归纳法的经典图示：两段阶梯拼成一个矩形](../shots/math-discrete/06-mathematical-induction.png)

</div>

<<< @/../corpus/examples/math-discrete/06-mathematical-induction.py[代码]

:::

## 鸽巢原理：13 只鸽子放进 12 个巢

12 个巢先各落一只鸽子，还剩一只无处可放；它落进第一个巢时被红圈标出——巢数已经用完，必然有一只和别的挤在一起。

::: code-group

<div class="vp-block active" data-title="画面">

![鸽巢原理：13 只鸽子放进 12 个巢](../shots/math-discrete/07-pigeonhole.png)

</div>

<<< @/../corpus/examples/math-discrete/07-pigeonhole.py[代码]

:::

## 二分图：顶点能分成两组、边只在组间出现

左边六个顶点分成蓝、黄两列，六条边全部从蓝列跨到黄列，同列内部一条边都没有；右侧对照画着一个三角形——三条边首尾相接构成的奇环。

::: code-group

<div class="vp-block active" data-title="画面">

![二分图：顶点能分成两组、边只在组间出现](../shots/math-discrete/08-bipartite-graph.png)

</div>

<<< @/../corpus/examples/math-discrete/08-bipartite-graph.py[代码]

:::

## 图着色：相邻顶点不能同色，最少要几种

左边 5 个顶点连成一个奇数环，只用红蓝两色会在闭合处撞色，于是必须动用第三种颜色（绿）；右边 4 个顶点两两相连，无论怎么排都得用满四种颜色。

::: code-group

<div class="vp-block active" data-title="画面">

![图着色：相邻顶点不能同色，最少要几种](../shots/math-discrete/09-graph-coloring.png)

</div>

<<< @/../corpus/examples/math-discrete/09-graph-coloring.py[代码]

:::

## 最小生成树：按权重从小到大加边，成环的边就丢掉

六个顶点上先淡淡铺开全部 8 条带权边；随后按权重 1→8 依次判定——能被采纳的边亮成绿色（共 5 条，刚好把 6 个点连成一棵），会成环的边被判红并画成虚线。最终 5 条绿边总权重 19。

::: code-group

<div class="vp-block active" data-title="画面">

![最小生成树：按权重从小到大加边，成环的边就丢掉](../shots/math-discrete/10-spanning-tree.png)

</div>

<<< @/../corpus/examples/math-discrete/10-spanning-tree.py[代码]

:::

## 欧拉回路与哈密顿回路：一个数「边」，一个数「点」

左边是共用一个顶点的两个三角形：中心顶点度数为 4、其余都是 2，全为偶数，所以能一笔走遍每条边恰好一次（欧拉回路）；但走遍每个顶点恰好一次做不到。右边是带一条斜线的四边形：沿外圈可以走遍四个顶点（哈密顿回路），但有两个度为 3 的顶点，欧拉回路不存在。

::: code-group

<div class="vp-block active" data-title="画面">

![欧拉回路与哈密顿回路：一个数「边」，一个数「点」](../shots/math-discrete/11-euler-hamilton.png)

</div>

<<< @/../corpus/examples/math-discrete/11-euler-hamilton.py[代码]

:::

## 汉诺塔的递推：T(n) = 2T(n−1) + 1，所以是 2ⁿ − 1

左下画着三根柱子，最左边那根垒着从小到大的三个盘子；右边的柱状图给出 n=1 到 8 的步数。柱子高度是按 log₂(T+1) 等比缩放的，所以画面上的高度恰好等距上升——一条完美的直线，代表的是货真价实的指数增长。

::: code-group

<div class="vp-block active" data-title="画面">

![汉诺塔的递推：T(n) = 2T(n−1) + 1，所以是 2ⁿ − 1](../shots/math-discrete/12-hanoi-recurrence.png)

</div>

<<< @/../corpus/examples/math-discrete/12-hanoi-recurrence.py[代码]

:::
