<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# Linear algebra

Matrix-vector products, determinant as area, singular matrices, projection, Gram–Schmidt, eigen decomposition, rank and null space, basis change, least squares, quadratic forms and SVD.

This page lists 12 examples. The code is imported from `corpus/examples/math-linear/`; the screenshots are end states rendered on real machines.

## Matrix times vector = linear combination of columns

The two column vectors a₁ / a₂ (blue, green) are scaled by their coefficients and assembled into a parallelogram; the diagonal is A·x.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Matrix times vector = linear combination of columns](../../shots/math-linear/01-matrix-vector-product.png)

</div>

<<< @/../corpus/examples/math-linear/01-matrix-vector-product.py[Code]

:::

## Geometric meaning of the determinant: the unit square's area scales by |det|

The yellow unit square in the grid is stretched into a parallelogram; its area goes from 1 to 2 (det=2).

::: code-group

<div class="vp-block active" data-title="Rendered">

![Geometric meaning of the determinant: the unit square's area scales by |det|](../../shots/math-linear/02-determinant-area.png)

</div>

<<< @/../corpus/examples/math-linear/02-determinant-area.py[Code]

:::

## Singular matrix: det=0 collapses the whole plane onto a line

The grid and the yellow square collapse onto one slanted line; the square can never regain an area.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Singular matrix: det=0 collapses the whole plane onto a line](../../shots/math-linear/03-singular-matrix.png)

</div>

<<< @/../corpus/examples/math-linear/03-singular-matrix.py[Code]

:::

## Orthogonal projection: the shadow of b on a

A dashed line drops perpendicularly from the tip of b onto the line a, with a right-angle mark at the intersection; the yellow arrow is the projection vector.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Orthogonal projection: the shadow of b on a](../../shots/math-linear/04-orthogonal-projection.png)

</div>

<<< @/../corpus/examples/math-linear/04-orthogonal-projection.py[Code]

:::

## Gram–Schmidt: subtracting the projection onto the first vector

The green vector slides along the dashed line to the red position and then stands at a right angle to the blue vector (right-angle mark at the intersection).

::: code-group

<div class="vp-block active" data-title="Rendered">

![Gram–Schmidt: subtracting the projection onto the first vector](../../shots/math-linear/05-gram-schmidt.png)

</div>

<<< @/../corpus/examples/math-linear/05-gram-schmidt.py[Code]

:::

## Eigen directions: vectors whose direction survives the map

On the two dashed directions the vectors stay on the same line after the map (only stretched or shortened) while a third vector visibly deflects. The three pre-image vectors stay in the frame as translucent ghosts, forming a before/after comparison with the solid post-image vectors.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Eigen directions: vectors whose direction survives the map](../../shots/math-linear/06-eigen-decomposition.png)

</div>

<<< @/../corpus/examples/math-linear/06-eigen-decomposition.py[Code]

:::

## Null space: the directions mapped to 0

The arrow along (-2,1) (red) collapses to a point after the map (a red dot at the origin); the other direction (green) maps to twice its length.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Null space: the directions mapped to 0](../../shots/math-linear/07-rank-nullspace.png)

</div>

<<< @/../corpus/examples/math-linear/07-rank-nullspace.py[Code]

:::

## Basis change: two coordinate systems for the same vector

The blue basis and the green basis close into a parallelogram (the 0.6·b₂ closing edge drawn as a green dashed line, labelled 1.2·b₁ / 0.6·b₂); the way the yellow vector travels along them is (1.2, 0.6). Read against the standard basis, the same arrow has a different pair of coordinates.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Basis change: two coordinate systems for the same vector](../../shots/math-linear/08-basis-change.png)

</div>

<<< @/../corpus/examples/math-linear/08-basis-change.py[Code]

:::

## Composing rotation matrices: two 30° turns equal one 60° turn

Grid and yellow square are turned 30° and then 30° again; the final pose coincides exactly with the single 60° turn (dashed reference).

::: code-group

<div class="vp-block active" data-title="Rendered">

![Composing rotation matrices: two 30° turns equal one 60° turn](../../shots/math-linear/09-rotation-composition.png)

</div>

<<< @/../corpus/examples/math-linear/09-rotation-composition.py[Code]

:::

## Least squares: fitted line and residuals

A blue fitted line above five data points, with each point's vertical residual drawn as a grey dashed line of obvious length.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Least squares: fitted line and residuals](../../shots/math-linear/10-least-squares.png)

</div>

<<< @/../corpus/examples/math-linear/10-least-squares.py[Code]

:::

## Quadratic forms: positive-definite ellipses vs indefinite hyperbolas

Concentric ellipses on the left (positive definite: every direction curves upward), a pair of hyperbola branches on the right (indefinite: some direction curves downward).

::: code-group

<div class="vp-block active" data-title="Rendered">

![Quadratic forms: positive-definite ellipses vs indefinite hyperbolas](../../shots/math-linear/11-quadratic-form.png)

</div>

<<< @/../corpus/examples/math-linear/11-quadratic-form.py[Code]

:::

## Geometric meaning of SVD: rotate, stretch, rotate again

The yellow circle becomes a tilted ellipse in three steps (rotate 40°, stretch along the axes, rotate -25°); the middle step shows plainly that the two directions are stretched differently.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Geometric meaning of SVD: rotate, stretch, rotate again](../../shots/math-linear/12-svd-geometry.png)

</div>

<<< @/../corpus/examples/math-linear/12-svd-geometry.py[Code]

:::
