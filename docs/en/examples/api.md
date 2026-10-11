<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# API roll call (offline)

Batch-naming every entry marked ok in the support table: 76 colours, 16 rate functions, direction constants, the method surface, shapes and 3D solids, the animation surface, and the complex plane.

This page lists 14 examples. The code is imported from `corpus/examples/api/`; the screenshots are end states rendered on real machines.

## API roll call: the colour constants (all 76 usable colours)

76 squares in rows of 10 forming a palette, each filled with its own name (red, yellow, blue, green, purple, grey, brown… all distinct) — not a field of black (black was the set_stroke-wipes-fill incident, now fixed).

::: code-group

<div class="vp-block active" data-title="Rendered">

![API roll call: the colour constants (all 76 usable colours)](../../shots/api/01-colors.png)

</div>

<<< @/../corpus/examples/api/01-colors.py[Code]

:::

## API roll call: all 16 rate functions

Sixteen rows, each a rate name plus one dot: every dot travels left to right over the same distance, but each row's pacing is its name — smooth starts fast and eases out, rush_into bolts from the start, there_and_back turns back at the end, wiggle jitters in place. What is observed is not the endpoint but how it gets there.

::: code-group

<div class="vp-block active" data-title="Rendered">

![API roll call: all 16 rate functions](../../shots/api/02-rates.png)

</div>

<<< @/../corpus/examples/api/02-rates.py[Code]

:::

## API roll call: direction and axis constants

Several arrows pointing in the directions the RIGHT / UP / OUT constants name, directions matching the names; placements involving axis constants are not skewed.

::: code-group

<div class="vp-block active" data-title="Rendered">

![API roll call: direction and axis constants](../../shots/api/03-const.png)

</div>

<<< @/../corpus/examples/api/03-const.py[Code]

:::

## API roll call: the method surface (rewrites, geometry reads, coordinate mapping)

The method surface exercised item by item: style rewrites, geometry reads and coordinate mapping all pass their print assertions, and the marked points and lines land where expected on screen.

::: code-group

<div class="vp-block active" data-title="Rendered">

![API roll call: the method surface (rewrites, geometry reads, coordinate mapping)](../../shots/api/04-methods.png)

</div>

<<< @/../corpus/examples/api/04-methods.py[Code]

:::

## API roll call: shapes and markers (ok in the table, unused by the corpus)

A grid layout: each named shape occupies one cell with its name label under the cell, nothing overlapping and everything inside the canvas.

::: code-group

<div class="vp-block active" data-title="Rendered">

![API roll call: shapes and markers (ok in the table, unused by the corpus)](../../shots/api/06-classes-2d.png)

</div>

<<< @/../corpus/examples/api/06-classes-2d.py[Code]

:::

## API roll call: matrices, tables, 3D and miscellany

A grid layout: one 3D solid per cell (each coloured and shaded with volume, not a black block), four matrices per row, four miscellany per row, name labels beside the cells, nothing overlapping and everything inside the canvas.

::: code-group

<div class="vp-block active" data-title="Rendered">

![API roll call: matrices, tables, 3D and miscellany](../../shots/api/07-classes-3d.png)

</div>

<<< @/../corpus/examples/api/07-classes-3d.py[Code]

:::

## API roll call: the scene family

A blue cube standing at an angle in the centre of the frame: top face and two side faces visible with different shading (a real 3D scene, lit and with depth); a white line ThreeDScene ok pinned to the bottom edge of the frame — it does not rotate with the camera and is not squashed by the oblique view.

::: code-group

<div class="vp-block active" data-title="Rendered">

![API roll call: the scene family](../../shots/api/08-scenes.png)

</div>

<<< @/../corpus/examples/api/08-scenes.py[Code]

:::

## API roll call: the animation surface (ok in the table, unused by the corpus)

Each animation played through: every one has a recognizable effect, none crashes and none stalls the render loop.

::: code-group

<div class="vp-block active" data-title="Rendered">

![API roll call: the animation surface (ok in the table, unused by the corpus)](../../shots/api/09-anims.png)

</div>

<<< @/../corpus/examples/api/09-anims.py[Code]

:::

## API roll call: the animation surface (functions, text and wrappers)

Function, text and wrapper animations played through: callbacks really fire and text appears letter by letter — recognizable effects.

::: code-group

<div class="vp-block active" data-title="Rendered">

![API roll call: the animation surface (functions, text and wrappers)](../../shots/api/10-anims-func.png)

</div>

<<< @/../corpus/examples/api/10-anims-func.py[Code]

:::

## API roll call: shapes, markers and graphs (ok in the table, previously unrolled)

A four-row grid (six cells per row, five in the last): each named class in one cell with its name label under the cell; dependency clusters (arc plus arc brackets, square plus brackets) placed as groups; nothing overlapping and everything inside the canvas.

::: code-group

<div class="vp-block active" data-title="Rendered">

![API roll call: shapes, markers and graphs (ok in the table, previously unrolled)](../../shots/api/11-classes-extra.png)

</div>

<<< @/../corpus/examples/api/11-classes-extra.py[Code]

:::

## API roll call: animation addenda (ok in the table, previously unrolled)

Each animation in this batch played once with its object in its own place, nothing overlapping: a line revealing its middle, a square returning to its saved state, a dot moving to the target above, three dots entering in turn, a number walking to 10.00, a dot becoming a square, a single dot present. All inside the canvas.

::: code-group

<div class="vp-block active" data-title="Rendered">

![API roll call: animation addenda (ok in the table, previously unrolled)](../../shots/api/12-anims-extra.png)

</div>

<<< @/../corpus/examples/api/12-anims-extra.py[Code]

:::

## API roll call: 3D solids (line, arrow, convex hull) — must land on ThreeDScene

Three 3D solids in a row at x = -4 / 0 / +4: a cyan horizontal line segment on the left, a blue arrow in the same direction in the middle (segment plus cone tip), a green tetrahedron on the right with two or three faces of different shading (light is what gives volume, not a black blob). All three lie along the horizontal of the frame, each with its name label below, labels facing the camera and not squashed by the oblique view.

::: code-group

<div class="vp-block active" data-title="Rendered">

![API roll call: 3D solids (line, arrow, convex hull) — must land on ThreeDScene](../../shots/api/12-classes-3d-extra.png)

</div>

<<< @/../corpus/examples/api/12-classes-3d-extra.py[Code]

:::

## API roll call: a whole inline SVG string (needs browser DOM, checked in the playground only)

A shape (a circle) parsed out of an inline SVG string and drawn.

::: code-group

<div class="vp-block active" data-title="Rendered">

![API roll call: a whole inline SVG string (needs browser DOM, checked in the playground only)](../../shots/api/13-svg-browser.png)

</div>

<<< @/../corpus/examples/api/13-svg-browser.py[Code]

:::

## Complex plane and polar grid: the whole canvas is their canvas

First a complex plane fills the canvas with a yellow dot marked at 60° on the unit circle and labelled e^{iπ/3}; then the whole frame fades into a polar grid (concentric circles plus radial lines) with the same direction marked again.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Complex plane and polar grid: the whole canvas is their canvas](../../shots/api/14-planes.png)

</div>

<<< @/../corpus/examples/api/14-planes.py[Code]

:::
