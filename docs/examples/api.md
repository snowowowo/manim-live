<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# API 点名（离线）

把支持面表里 state=ok 的名字成批点名：76 个颜色、16 个速率、方向常量、方法面、形状与 3D 实体、动画面与复平面。

本页 14 条示例。代码引自 `corpus/examples/api/`，截图为真机渲染的终态。

## API 覆盖：颜色常量一览（全部 76 个可用色）

76 个方块按每行 10 个排成色板，每块用自己的名字上色（红黄蓝绿紫灰棕……各不相同）——不是一整片黑（黑 = 修过的 set_stroke 冲掉填充的事故）。

::: code-group

<div class="vp-block active" data-title="画面">

![API 覆盖：颜色常量一览（全部 76 个可用色）](../shots/api/01-colors.png)

</div>

<<< @/../corpus/examples/api/01-colors.py[代码]

:::

## API 点名：全部 16 个速率函数

十六行，每行一个速率名 + 一颗圆点：圆点都从左走到右、走完同样的距离，但每一行的节奏就是它的名字——smooth 先快后缓、rush_into 起步就冲、there_and_back 走到头又折返回来、wiggle 原地抖几下。看的不是终点，是「怎么走」。

::: code-group

<div class="vp-block active" data-title="画面">

![API 点名：全部 16 个速率函数](../shots/api/02-rates.png)

</div>

<<< @/../corpus/examples/api/02-rates.py[代码]

:::

## API 点名：方向与轴向常量

几支箭头分别指向 RIGHT/UP/OUT 等常量对应的方向，方向与名字一致；轴向常量参与的定位不偏。

::: code-group

<div class="vp-block active" data-title="画面">

![API 点名：方向与轴向常量](../shots/api/03-const.png)

</div>

<<< @/../corpus/examples/api/03-const.py[代码]

:::

## API 点名：方法面（改写 / 取几何 / 坐标映射）

方法面逐项用一遍：改样式、取几何、坐标映射的 print 断言全过，画面上标记点/线落在预期位置。

::: code-group

<div class="vp-block active" data-title="画面">

![API 点名：方法面（改写 / 取几何 / 坐标映射）](../shots/api/04-methods.png)

</div>

<<< @/../corpus/examples/api/04-methods.py[代码]

:::

## API 点名：形状与标记（表里 ok、语料未用到的那一批）

网格布局：每个被点名的形状占一格、格下有名字标签，互不遮挡、全部在画布内。

::: code-group

<div class="vp-block active" data-title="画面">

![API 点名：形状与标记（表里 ok、语料未用到的那一批）](../shots/api/06-classes-2d.png)

</div>

<<< @/../corpus/examples/api/06-classes-2d.py[代码]

:::

## API 点名：矩阵 / 表 / 3D / 杂项

网格布局：3D 实体一格一个（各自有颜色、**有明暗立体感**，不是黑块）、矩阵一行四个、杂项一行四个，格旁有名字标签，互不遮挡、全部在画布内。

::: code-group

<div class="vp-block active" data-title="画面">

![API 点名：矩阵 / 表 / 3D / 杂项](../shots/api/07-classes-3d.png)

</div>

<<< @/../corpus/examples/api/07-classes-3d.py[代码]

:::

## API 点名：场景家族

一个蓝色的立方体斜立在画面中心：能看到顶面与两个侧面、明暗不同（真 3D 场景，有光照有深度）；画面下缘钉着一行白字 "ThreeDScene ok"——它不跟相机转、也不会被斜视压扁。

::: code-group

<div class="vp-block active" data-title="画面">

![API 点名：场景家族](../shots/api/08-scenes.png)

</div>

<<< @/../corpus/examples/api/08-scenes.py[代码]

:::

## API 点名：动画面（表里 ok、语料未用到的那一批）

动画面逐支播完：每支动画都有可辨识的效果、不炸、不卡死渲染循环。

::: code-group

<div class="vp-block active" data-title="画面">

![API 点名：动画面（表里 ok、语料未用到的那一批）](../shots/api/09-anims.png)

</div>

<<< @/../corpus/examples/api/09-anims.py[代码]

:::

## API 点名：动画面（函数 / 文字 / 包装那一批）

函数/文字/包装类动画逐支播完：回调真的被调、文字逐字出现等效果可辨识。

::: code-group

<div class="vp-block active" data-title="画面">

![API 点名：动画面（函数 / 文字 / 包装那一批）](../shots/api/10-anims-func.png)

</div>

<<< @/../corpus/examples/api/10-anims-func.py[代码]

:::

## API 点名：形状 / 标记 / 图（表里 ok、语料此前没点到的那一批）

四行网格（每行六格，末行五格）：每个被点名的类占一格、格下有名字标签；依赖簇（弧+弧括号、方块+括号）成组摆放；互不遮挡、全部在画布内。

::: code-group

<div class="vp-block active" data-title="画面">

![API 点名：形状 / 标记 / 图（表里 ok、语料此前没点到的那一批）](../shots/api/11-classes-extra.png)

</div>

<<< @/../corpus/examples/api/11-classes-extra.py[代码]

:::

## API 点名：动画补遗（表里 ok、语料此前没点到的那一批）

这批动画各播一次、对象各占一处互不遮挡：线段露出中段、方块回到存过的样子、圆点搬到上方目标位、三颗点依次入场、数字走到 10.00、点变方、单颗点在场。全部在画布内。

::: code-group

<div class="vp-block active" data-title="画面">

![API 点名：动画补遗（表里 ok、语料此前没点到的那一批）](../shots/api/12-anims-extra.png)

</div>

<<< @/../corpus/examples/api/12-anims-extra.py[代码]

:::

## API 点名：3D 实体（线 / 箭头 / 凸包）——必须落在 ThreeDScene 上

一排三件 3D 实体，从左到右在 x = -4 / 0 / +4：左边是一根青色的水平线段；中间是一枝同向的蓝色箭头（线段 + 锥头）；右边是一个绿色的四面体——能看到深浅不同的两三个面（有光才有立体，不是一团黑）。三件都沿画面水平方向躺着，各自下方有名字标签，标签正对镜头、不被斜视压扁。

::: code-group

<div class="vp-block active" data-title="画面">

![API 点名：3D 实体（线 / 箭头 / 凸包）——必须落在 ThreeDScene 上](../shots/api/12-classes-3d-extra.png)

</div>

<<< @/../corpus/examples/api/12-classes-3d-extra.py[代码]

:::

## API 点名：整段 SVG 字符串（要浏览器 DOM，只在实验场核）

从一段内联 SVG 字符串里解析出图形（一个圆）并画出来。

::: code-group

<div class="vp-block active" data-title="画面">

![API 点名：整段 SVG 字符串（要浏览器 DOM，只在实验场核）](../shots/api/13-svg-browser.png)

</div>

<<< @/../corpus/examples/api/13-svg-browser.py[代码]

:::

## 复平面与极坐标网格：整幅画布就是它们的画布

先是一幅复平面铺满画布，单位圆方向上标出一个 60° 的黄点并注明 e^{iπ/3}；随后整幅淡出，换成极坐标网格（同心圆 + 放射线），同一个方向再标一次。

::: code-group

<div class="vp-block active" data-title="画面">

![复平面与极坐标网格：整幅画布就是它们的画布](../shots/api/14-planes.png)

</div>

<<< @/../corpus/examples/api/14-planes.py[代码]

:::
