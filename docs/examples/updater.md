<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# 更新器与轨迹

TracedPath 轨迹、tracker 驱动、(m, dt) 更新器、clear_updaters 与 UpdateFromFunc 一族。

本页 6 条示例。代码引自 `corpus/examples/updater/`，截图为真机渲染的终态。

## TracedPath 跟随物体

点移动时身后拖出一条轨迹线，轨迹与走过的路径重合。

::: code-group

<div class="vp-block active" data-title="画面">

![TracedPath 跟随物体](../shots/updater/01-traced-path.png)

</div>

<<< @/../corpus/examples/updater/01-traced-path.py[代码]

:::

## 用 tracker 驱动位置

tracker 的值被动画推进时，点跟着移到对应位置（print 出的坐标与画面一致）。自证：底部 NumberLine 的刻度 2 与红点落定位置重合。

::: code-group

<div class="vp-block active" data-title="画面">

![用 tracker 驱动位置](../shots/updater/02-value-driven.png)

</div>

<<< @/../corpus/examples/updater/02-value-driven.py[代码]

:::

## 更新器收 (m, dt) 两个参数

(m, dt) 更新器在 wait 期间按真实时间推进，不是只在动画里动。

::: code-group

<div class="vp-block active" data-title="画面">

![更新器收 (m, dt) 两个参数](../shots/updater/03-with-dt.png)

</div>

<<< @/../corpus/examples/updater/03-with-dt.py[代码]

:::

## clear_updaters 停掉跟随

clear_updaters 之后物体停住：tracker 再变它也不跟。

::: code-group

<div class="vp-block active" data-title="画面">

![clear_updaters 停掉跟随](../shots/updater/04-clear.png)

</div>

<<< @/../corpus/examples/updater/04-clear.py[代码]

:::

## 数字跟着 tracker 变

数字实时跟着 tracker 变（不是播完才跳到终值）。

::: code-group

<div class="vp-block active" data-title="画面">

![数字跟着 tracker 变](../shots/updater/05-decimal.png)

</div>

<<< @/../corpus/examples/updater/05-decimal.py[代码]

:::

## 用动画驱动更新函数（UpdateFromFunc / UpdateFromAlphaFunc）

更新函数在动画期间被驱动，回调里拿到的 m 能用 CE 方法名操作（修过的包装事故）。

::: code-group

<div class="vp-block active" data-title="画面">

![用动画驱动更新函数（UpdateFromFunc / UpdateFromAlphaFunc）](../shots/updater/06-update-from-func.png)

</div>

<<< @/../corpus/examples/updater/06-update-from-func.py[代码]

:::
