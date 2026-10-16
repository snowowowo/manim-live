<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# 示例画廊

示例章的每一页对应语料的一个分组。每条示例给两个 tab：默认显示「画面」——它在真 Chromium 里渲染出的终态截图（`scripts/shot-corpus.mjs` 逐条落图）；切到「代码」看该条语料的完整源码（直接引自 `corpus/examples/`，不复制一份）。

`net`（需联网取包）与 `reject`（预期被当场拒绝）两组没有截图，不进示例章：前者是取包链路的回归，见[第三方包](/guide/packages)；后者是拦截口径的回归，见[支持面](/guide/support)。最后一组[引擎扩展](/examples/extras)是**另一条车道**：那些图形标准 Manim 没有，代码里要 `from manim_live_extra import …`，本机 CLI 导出会被前置门拒绝——它单独成页，别与前 17 页混用。

<div class="gallery">

<figure>

[![基础几何](../shots/basic/01-circle.png)](./basic)

<figcaption>基础几何 · 11</figcaption>

</figure>

<figure>

[![构造器参数](../shots/ctor/01-circle-positional.png)](./ctor)

<figcaption>构造器参数 · 14</figcaption>

</figure>

<figure>

[![方法与改写](../shots/method/01-set-stroke.png)](./method)

<figcaption>方法与改写 · 13</figcaption>

</figure>

<figure>

[![坐标系与数据](../shots/graph/01-number-line.png)](./graph)

<figcaption>坐标系与数据 · 12</figcaption>

</figure>

<figure>

[![文字与公式](../shots/text/01-basic.png)](./text)

<figcaption>文字与公式 · 11</figcaption>

</figure>

<figure>

[![语法综合（离线）](../shots/syntax/01-comprehensions.png)](./syntax)

<figcaption>语法综合（离线） · 6</figcaption>

</figure>

<figure>

[![动画](../shots/animate/01-chain.png)](./animate)

<figcaption>动画 · 17</figcaption>

</figure>

<figure>

[![更新器与轨迹](../shots/updater/01-traced-path.png)](./updater)

<figcaption>更新器与轨迹 · 6</figcaption>

</figure>

<figure>

[![场景与分组](../shots/scene/01-clear.png)](./scene)

<figcaption>场景与分组 · 6</figcaption>

</figure>

<figure>

[![高等数学与数学分析](../shots/math-calculus/01-sequence-limit.png)](./math-calculus)

<figcaption>高等数学与数学分析 · 12</figcaption>

</figure>

<figure>

[![线性代数](../shots/math-linear/01-matrix-vector-product.png)](./math-linear)

<figcaption>线性代数 · 12</figcaption>

</figure>

<figure>

[![概率论与统计](../shots/math-prob/01-inclusion-exclusion.png)](./math-prob)

<figcaption>概率论与统计 · 12</figcaption>

</figure>

<figure>

[![群论](../shots/math-group/01-cyclic-rotation-group.png)](./math-group)

<figcaption>群论 · 12</figcaption>

</figure>

<figure>

[![离散数学](../shots/math-discrete/01-truth-table.png)](./math-discrete)

<figcaption>离散数学 · 12</figcaption>

</figure>

<figure>

[![讲解场景（模板）](../shots/lesson/01-unit-circle.png)](./lesson)

<figcaption>讲解场景（模板） · 13</figcaption>

</figure>

<figure>

[![API 点名（离线）](../shots/api/01-colors.png)](./api)

<figcaption>API 点名（离线） · 14</figcaption>

</figure>

<figure>

[![综合场景（多库协同·需联网）](../shots/combo/01-pandas-sklearn-fit.png)](./combo)

<figcaption>综合场景（多库协同·需联网） · 5</figcaption>

</figure>

<figure>

[![引擎扩展图表（manim_live_extra）](../shots/extras/01-histogram.png)](./extras)

<figcaption>引擎扩展图表（manim_live_extra） · 34</figcaption>

</figure>

</div>
