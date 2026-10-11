<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# Scenes and groups

Scene semantics of clear / remove, VGroup indexing and nesting, loop-built groups, and what an upright 3D camera looks like.

This page lists 6 examples. The code is imported from `corpus/examples/scene/`; the screenshots are end states rendered on real machines.

## Redraw after clear

clear empties the frame; the mobjects drawn afterwards appear on their own.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Redraw after clear](../../shots/scene/01-clear.png)

</div>

<<< @/../corpus/examples/scene/01-clear.py[Code]

:::

## remove takes a mobject out

The removed mobject disappears while the others stay as they were: the scene holds three mobjects and only one is removed (the red circle, labelled remove); in the final frame the blue square and the yellow triangle remain and the red circle does not — evidence that exactly one was removed.

::: code-group

<div class="vp-block active" data-title="Rendered">

![remove takes a mobject out](../../shots/scene/02-remove.png)

</div>

<<< @/../corpus/examples/scene/02-remove.py[Code]

:::

## VGroup plus index access

An indexed child is manipulated on its own; an out-of-range index raises IndexError (the print assertion is authoritative).

::: code-group

<div class="vp-block active" data-title="Rendered">

![VGroup plus index access](../../shots/scene/03-vgroup-index.png)

</div>

<<< @/../corpus/examples/scene/03-vgroup-index.py[Code]

:::

## VGroup inside VGroup

The outer group moves as a whole and the inner group moves on its own; the two layers do not leak into each other. Self-evidence: after the outer group moves up the red dot follows, then the inner group turns yellow on its own while the red dot's colour stays.

::: code-group

<div class="vp-block active" data-title="Rendered">

![VGroup inside VGroup](../../shots/scene/04-vgroup-nested.png)

</div>

<<< @/../corpus/examples/scene/04-vgroup-nested.py[Code]

:::

## Building a row of squares in a loop

A row (column) of squares built in a loop; the count matches the iteration count.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Building a row of squares in a loop](../../shots/scene/05-loop-build.png)

</div>

<<< @/../corpus/examples/scene/05-loop-build.py[Code]

:::

## The upright 3D camera: the x axis must be horizontal on screen

Five cubes form a true cross: red (x=-4) on the left and blue (x=+4) on the right at exactly the same height; yellow (y=+3) above and orange (y=-3) below at exactly the same horizontal position as the green centre cube. Each cube shows its top and front face (lit, with depth).

::: code-group

<div class="vp-block active" data-title="Rendered">

![The upright 3D camera: the x axis must be horizontal on screen](../../shots/scene/07-three-d-upright.png)

</div>

<<< @/../corpus/examples/scene/07-three-d-upright.py[Code]

:::
