<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# Updaters and trails

TracedPath trails, tracker-driven positions, (m, dt) updaters, clear_updaters and the UpdateFromFunc family.

This page lists 6 examples. The code is imported from `corpus/examples/updater/`; the screenshots are end states rendered on real machines.

## TracedPath follows a mobject

A trail line grows behind the moving dot and coincides with the path travelled.

::: code-group

<div class="vp-block active" data-title="Rendered">

![TracedPath follows a mobject](../../shots/updater/01-traced-path.png)

</div>

<<< @/../corpus/examples/updater/01-traced-path.py[Code]

:::

## Position driven by a tracker

As the tracker's value is animated, the dot moves to the matching position (printed coordinates agree with the picture). Self-evidence: tick 2 on the NumberLine at the bottom coincides with where the red dot settles.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Position driven by a tracker](../../shots/updater/02-value-driven.png)

</div>

<<< @/../corpus/examples/updater/02-value-driven.py[Code]

:::

## Updater taking (m, dt)

A (m, dt) updater advances with real time during wait, not only during animations.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Updater taking (m, dt)](../../shots/updater/03-with-dt.png)

</div>

<<< @/../corpus/examples/updater/03-with-dt.py[Code]

:::

## clear_updaters stops the following

After clear_updaters the mobject stays put: further tracker changes no longer move it.

::: code-group

<div class="vp-block active" data-title="Rendered">

![clear_updaters stops the following](../../shots/updater/04-clear.png)

</div>

<<< @/../corpus/examples/updater/04-clear.py[Code]

:::

## Number follows the tracker

The number follows the tracker live; it does not jump to the final value at the end.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Number follows the tracker](../../shots/updater/05-decimal.png)

</div>

<<< @/../corpus/examples/updater/05-decimal.py[Code]

:::

## Animations driving update functions (UpdateFromFunc / UpdateFromAlphaFunc)

The update function is driven during the animation and the m it receives answers to CE method names (a fixed wrapping incident).

::: code-group

<div class="vp-block active" data-title="Rendered">

![Animations driving update functions (UpdateFromFunc / UpdateFromAlphaFunc)](../../shots/updater/06-update-from-func.png)

</div>

<<< @/../corpus/examples/updater/06-update-from-func.py[Code]

:::
