<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# 方法与改写

set_stroke / set_fill 这类改写、shift / rotate 这类变换链、save_state / restore 与 copy 的边界。

本页 13 条示例。代码引自 `corpus/examples/method/`，截图为真机渲染的终态。

## set_stroke（改写为 setStyle）

只有描边变了（粗细 / 颜色），填充保持原样——set_stroke 冲掉填充是修过的事故，这条钉它。

::: code-group

<div class="vp-block active" data-title="画面">

![set_stroke（改写为 setStyle）](../shots/method/01-set-stroke.png)

</div>

<<< @/../corpus/examples/method/01-set-stroke.py[代码]

:::

## set_opacity（拆成描边 + 填充）

描边与填充的透明度一起变淡，颜色不变。

::: code-group

<div class="vp-block active" data-title="画面">

![set_opacity（拆成描边 + 填充）](../shots/method/02-set-opacity.png)

</div>

<<< @/../corpus/examples/method/02-set-opacity.py[代码]

:::

## set_fill 关键字不透明度

填充色变成指定颜色、透明度生效，描边不受影响。

::: code-group

<div class="vp-block active" data-title="画面">

![set_fill 关键字不透明度](../shots/method/03-set-fill.png)

</div>

<<< @/../corpus/examples/method/03-set-fill.py[代码]

:::

## put_start_and_end_on（Line 拆两步）

线的两端精确落在指定的两个点上。

::: code-group

<div class="vp-block active" data-title="画面">

![put_start_and_end_on（Line 拆两步）](../shots/method/04-put-start-and-end-on.png)

</div>

<<< @/../corpus/examples/method/04-put-start-and-end-on.py[代码]

:::

## next_to 带 buff

两物体之间留的空隙与 buff 值一致，不贴死也不离太远。

::: code-group

<div class="vp-block active" data-title="画面">

![next_to 带 buff](../shots/method/05-next-to-buff.png)

</div>

<<< @/../corpus/examples/method/05-next-to-buff.py[代码]

:::

## to_edge / to_corner

物体贴到指定边 / 角，并与边界留出 buff。

::: code-group

<div class="vp-block active" data-title="画面">

![to_edge / to_corner](../shots/method/06-edge-corner.png)

</div>

<<< @/../corpus/examples/method/06-edge-corner.py[代码]

:::

## shift / move_to / scale / rotate 链

shift / move_to / scale / rotate 依次链上去，最终位置朝向与链的顺序一致。

::: code-group

<div class="vp-block active" data-title="画面">

![shift / move_to / scale / rotate 链](../shots/method/07-process-family.png)

</div>

<<< @/../corpus/examples/method/07-process-family.py[代码]

:::

## arrange_in_grid

一组物体排成整齐的网格，行列数与间距按参数。

::: code-group

<div class="vp-block active" data-title="画面">

![arrange_in_grid](../shots/method/08-arrange-grid.png)

</div>

<<< @/../corpus/examples/method/08-arrange-grid.py[代码]

:::

## save_state / restore

改动后 restore 回到 save_state 时的样子（位置 / 大小 / 样式都回去）。

::: code-group

<div class="vp-block active" data-title="画面">

![save_state / restore](../shots/method/09-save-restore.png)

</div>

<<< @/../corpus/examples/method/09-save-restore.py[代码]

:::

## become 换形

播完后物体变成了目标形状（become 是直接换形，不是复制一份）。

::: code-group

<div class="vp-block active" data-title="画面">

![become 换形](../shots/method/10-become.png)

</div>

<<< @/../corpus/examples/method/10-become.py[代码]

:::

## 读 width 属性

print 出的 width 与物体实际宽度一致（数值断言为准）。

::: code-group

<div class="vp-block active" data-title="画面">

![读 width 属性](../shots/method/11-attr-read.png)

</div>

<<< @/../corpus/examples/method/11-attr-read.py[代码]

:::

## get_center 参与定位

用 get_center 的返回值定位出的物体，中心正落在预期位置。

::: code-group

<div class="vp-block active" data-title="画面">

![get_center 参与定位](../shots/method/12-get-center.png)

</div>

<<< @/../corpus/examples/method/12-get-center.py[代码]

:::

## copy 出新物体

副本改动后原件不动——两者独立，不串样式。

::: code-group

<div class="vp-block active" data-title="画面">

![copy 出新物体](../shots/method/13-copy.png)

</div>

<<< @/../corpus/examples/method/13-copy.py[代码]

:::
