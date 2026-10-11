<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# 文字与公式

Text / MathTex / Tex / MarkupText 的渲染与排版，列表、折行、下划线、数字动画与标题。

本页 11 条示例。代码引自 `corpus/examples/text/`，截图为真机渲染的终态。

## Text 文字

文字以真实字形渲染出来（不是方框 / 乱码），内容一致。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/text/01-basic.png" alt="Text 文字" />
</div>

<<< @/../corpus/examples/text/01-basic.py[代码]

:::

## MathTex 分式与根号

分式有横线、根号盖住被开方数，排版是公式排版。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/text/02-mathtex-frac.png" alt="MathTex 分式与根号" />
</div>

<<< @/../corpus/examples/text/02-mathtex-frac.py[代码]

:::

## Tex 收一段 LaTeX

一整段 LaTeX 排成公式，字体与间距正常。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/text/03-tex-plain.png" alt="Tex 收一段 LaTeX" />
</div>

<<< @/../corpus/examples/text/03-tex-plain.py[代码]

:::

## MarkupText 富文本

富文本的局部加粗 / 变色生效，其余部分不受影响。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/text/04-markup.png" alt="MarkupText 富文本" />
</div>

<<< @/../corpus/examples/text/04-markup.py[代码]

:::

## BulletedList 项目列表

多行列表每行前有项目符号，行距整齐。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/text/05-bulleted-list.png" alt="BulletedList 项目列表" />
</div>

<<< @/../corpus/examples/text/05-bulleted-list.py[代码]

:::

## Paragraph 单串自动折行

长串文字自动折成多行，行宽不超界。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/text/06-paragraph.png" alt="Paragraph 单串自动折行" />
</div>

<<< @/../corpus/examples/text/06-paragraph.py[代码]

:::

## Underline 下划线

文字下方有一条下划线，长度与文字相当。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/text/07-underline.png" alt="Underline 下划线" />
</div>

<<< @/../corpus/examples/text/07-underline.py[代码]

:::

## DecimalNumber 数字动画

数值动画：数字位数 / 小数位按参数显示，动画中数值连续变化。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/text/08-decimal-number.png" alt="DecimalNumber 数字动画" />
</div>

<<< @/../corpus/examples/text/08-decimal-number.py[代码]

:::

## 两位数标签贴右上角

两位数标签贴在目标右上角，不出画、不叠在目标上（这是修过的定位事故）。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/text/09-mathtex-corner.png" alt="两位数标签贴右上角" />
</div>

<<< @/../corpus/examples/text/09-mathtex-corner.py[代码]

:::

## MathTex 多段位置参数

多段参数排成一行，段间距合理、内容顺序一致。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/text/10-mathtex-parts.png" alt="MathTex 多段位置参数" />
</div>

<<< @/../corpus/examples/text/10-mathtex-parts.py[代码]

:::

## Title 标题

标题居中出现在画面顶部，字号大于正文。

::: code-group

<div class="vp-block active" data-title="画面">
<img src="../../corpus/shots/text/11-title.png" alt="Title 标题" />
</div>

<<< @/../corpus/examples/text/11-title.py[代码]

:::
