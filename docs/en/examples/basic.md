<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# Basic shapes

The basic shapes — circle, rectangle, ellipse, arc, polygons, star — plus the line, dot and arrow variants.

This page lists 11 examples. The code is imported from `corpus/examples/basic/`; the screenshots are end states rendered on real machines.

## Draw a circle

A circle in the default stroke colour appears at the centre of the frame, drawn by Create tracing its outline.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Draw a circle](../../shots/basic/01-circle.png)

</div>

<<< @/../corpus/examples/basic/01-circle.py[Code]

:::

## Rotate a square by 45°

The square rotates 45° about its own centre; position and size stay put.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Rotate a square by 45°](../../shots/basic/02-square-rotate.png)

</div>

<<< @/../corpus/examples/basic/02-square-rotate.py[Code]

:::

## Rectangle and rounded rectangle

A plain rectangle beside a rounded one; the smoothed corners are a visible difference.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Rectangle and rounded rectangle](../../shots/basic/03-rect-rounded.png)

</div>

<<< @/../corpus/examples/basic/03-rect-rounded.py[Code]

:::

## Ellipse and annulus

An ellipse and an annulus; the ring is hollow (an inner and an outer radius).

::: code-group

<div class="vp-block active" data-title="Rendered">

![Ellipse and annulus](../../shots/basic/04-ellipse-annulus.png)

</div>

<<< @/../corpus/examples/basic/04-ellipse-annulus.py[Code]

:::

## Arc and sector

An arc (stroke only) and a sector (arc plus two radii plus fill).

::: code-group

<div class="vp-block active" data-title="Rendered">

![Arc and sector](../../shots/basic/05-arc-sector.png)

</div>

<<< @/../corpus/examples/basic/05-arc-sector.py[Code]

:::

## Triangle and regular hexagon

A triangle and a regular hexagon side by side; the edge counts match the names.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Triangle and regular hexagon](../../shots/basic/06-polygons.png)

</div>

<<< @/../corpus/examples/basic/06-polygons.py[Code]

:::

## Six-pointed star

A six-pointed star outline with six crisp tips.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Six-pointed star](../../shots/basic/07-star.png)

</div>

<<< @/../corpus/examples/basic/07-star.py[Code]

:::

## Polygon from vertices

A polygon connecting the given vertices in order; the shape matches the coordinates.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Polygon from vertices](../../shots/basic/08-polygon-vertices.png)

</div>

<<< @/../corpus/examples/basic/08-polygon-vertices.py[Code]

:::

## Axes plus a function curve

A function curve on a set of axes; the curve follows the function and sits on the ticks.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Axes plus a function curve](../../shots/basic/09-axes-plot.png)

</div>

<<< @/../corpus/examples/basic/09-axes-plot.py[Code]

:::

## Line, dot, arrow

One line, one dot and one arrow: the arrow carries a tip on one end and the dot sits where specified.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Line, dot, arrow](../../shots/basic/10-line-dot-arrow.png)

</div>

<<< @/../corpus/examples/basic/10-line-dot-arrow.py[Code]

:::

## Dashed, double arrow, arc arrow

The dashed line is broken, the double arrow has tips on both ends and the arc arrow curves — all three distinguishable at a glance.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Dashed, double arrow, arc arrow](../../shots/basic/11-line-variants.png)

</div>

<<< @/../corpus/examples/basic/11-line-variants.py[Code]

:::
