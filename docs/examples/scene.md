<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# 场景与分组

clear / remove 的场景语义、VGroup 的下标与嵌套、循环搭建，以及 3D 相机的「正」。

本页 6 条示例。代码引自 `corpus/examples/scene/`，截图为真机渲染的终态。

## clear 后重新画

clear 后画面清空，随后新画的物体单独出现。

::: code-group

<div class="vp-block active" data-title="画面">

![clear 后重新画](../shots/scene/01-clear.png)

</div>

<<< @/../corpus/examples/scene/01-clear.py[代码]

:::

## remove 摘掉物体

被 remove 的物体消失，其余物体原样保留：场景放三个物体，只 remove 其中一个（红圆，标注「remove」），终帧蓝方块与黄三角仍在、红圆不在——「只删一个」自证。

::: code-group

<div class="vp-block active" data-title="画面">

![remove 摘掉物体](../shots/scene/02-remove.png)

</div>

<<< @/../corpus/examples/scene/02-remove.py[代码]

:::

## VGroup + 下标取子物体

下标取出的子物体单独被操作，越界下标抛 IndexError（print 断言为准）。

::: code-group

<div class="vp-block active" data-title="画面">

![VGroup + 下标取子物体](../shots/scene/03-vgroup-index.png)

</div>

<<< @/../corpus/examples/scene/03-vgroup-index.py[代码]

:::

## VGroup 套 VGroup

嵌套组整体动、子组也单独动，两层互不串。自证：外层整体上移后红点跟着走，内层再单独变黄、红点颜色不变。

::: code-group

<div class="vp-block active" data-title="画面">

![VGroup 套 VGroup](../shots/scene/04-vgroup-nested.png)

</div>

<<< @/../corpus/examples/scene/04-vgroup-nested.py[代码]

:::

## 循环搭一组方块

循环搭出的一排（一列）方块，数量与循环次数一致。

::: code-group

<div class="vp-block active" data-title="画面">

![循环搭一组方块](../shots/scene/05-loop-build.png)

</div>

<<< @/../corpus/examples/scene/05-loop-build.py[代码]

:::

## 3D 相机的「正」：x 轴该在屏幕上水平

五个立方体排成一个**正十字**：红(x=-4)在左、蓝(x=+4)在右，两者的高低完全一样；黄(y=+3)在上、橙(y=-3)在下，两者与中间绿块的横向位置完全一样。立方体各自露出顶面与正面（有光、有深度）。

::: code-group

<div class="vp-block active" data-title="画面">

![3D 相机的「正」：x 轴该在屏幕上水平](../shots/scene/07-three-d-upright.png)

</div>

<<< @/../corpus/examples/scene/07-three-d-upright.py[代码]

:::
