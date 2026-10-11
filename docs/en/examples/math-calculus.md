<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# Calculus and analysis

Sequence limits, the squeeze theorem, Taylor expansion, the definition of e, the mean value theorem, upper and lower sums, accumulation functions, partial derivatives, gradient descent, double integrals, Fourier series and partial sums.

This page lists 12 examples. The code is imported from `corpus/examples/math-calculus/`; the screenshots are end states rendered on real machines.

## Sequence limit: a_n = 1 + 1/n approaching 1

A row of points crowds denser as n grows and settles onto the dashed line y=1 without ever crossing it.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Sequence limit: a_n = 1 + 1/n approaching 1](../../shots/math-calculus/01-sequence-limit.png)

</div>

<<< @/../corpus/examples/math-calculus/01-sequence-limit.py[Code]

:::

## Squeeze theorem: x·sin(1/x) squeezed by ±x

The high-frequency oscillating curve in the middle stays between the two lines y=x and y=-x, and both ends collapse to the origin together.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Squeeze theorem: x·sin(1/x) squeezed by ±x](../../shots/math-calculus/02-squeeze-theorem.png)

</div>

<<< @/../corpus/examples/math-calculus/02-squeeze-theorem.py[Code]

:::

## Taylor expansion: polynomials approaching sin x order by order

The degree-1, 3, 5 and 7 polynomials each hug the sine curve more closely, matching first near the origin and diverging farther away; the formula on the right grows term by term into the full polynomial (degrees 1 through 7, no term missing) and finally takes the colour of the degree-7 curve.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Taylor expansion: polynomials approaching sin x order by order](../../shots/math-calculus/03-taylor-sin.png)

</div>

<<< @/../corpus/examples/math-calculus/03-taylor-sin.py[Code]

:::

## Definition of e: (1+1/n)^n increases monotonically towards e

The point sequence rises monotonically as n grows and always stays below the dashed line y=e.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Definition of e: (1+1/n)^n increases monotonically towards e](../../shots/math-calculus/04-e-definition.png)

</div>

<<< @/../corpus/examples/math-calculus/04-e-definition.py[Code]

:::

## Lagrange mean value theorem: secant parallel to tangent

The chord through the endpoints (blue secant) is parallel to the tangent (yellow) at some interior point, and the tangency point lands exactly at the midpoint x=1.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Lagrange mean value theorem: secant parallel to tangent](../../shots/math-calculus/05-mean-value-theorem.png)

</div>

<<< @/../corpus/examples/math-calculus/05-mean-value-theorem.py[Code]

:::

## Upper and lower integrals: two sampling rules bracketing the true value

Left-endpoint (low) and right-endpoint (high) rectangle sets drawn on the same partition: the solid yellow blocks stay inside the curve while the top edges of the blue stroked frames stay above it; each set carries its label (upper sum / lower sum) so the comparison is immediate.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Upper and lower integrals: two sampling rules bracketing the true value](../../shots/math-calculus/06-upper-lower-sum.png)

</div>

<<< @/../corpus/examples/math-calculus/06-upper-lower-sum.py[Code]

:::

## Accumulation function: the area function S(x) and its derivative

The area under the curve grows block by block to the right while the number S(x) on the right grows with it; at the end the page states S'(x)=f(x).

::: code-group

<div class="vp-block active" data-title="Rendered">

![Accumulation function: the area function S(x) and its derivative](../../shots/math-calculus/07-accumulation-function.png)

</div>

<<< @/../corpus/examples/math-calculus/07-accumulation-function.py[Code]

:::

## Partial derivatives: slopes seen with y fixed and with x fixed

The left panel draws how f changes with x at y=1 fixed, the right how f changes with y at x=1 fixed; each panel carries a yellow tangent through the point (1, 1.2), with slopes 0.8 and 1.6 — the right one visibly steeper.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Partial derivatives: slopes seen with y fixed and with x fixed](../../shots/math-calculus/08-partial-derivative.png)

</div>

<<< @/../corpus/examples/math-calculus/08-partial-derivative.py[Code]

:::

## Gradient descent: stepping along the negative gradient towards the minimum

Five concentric ellipses are the contour lines (lower towards the centre); the polyline zigzags from the outer ring towards the centre — steps alternate on both sides of the valley along the negative gradient and shrink; arrows mark each step's direction.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Gradient descent: stepping along the negative gradient towards the minimum](../../shots/math-calculus/09-gradient-descent.png)

</div>

<<< @/../corpus/examples/math-calculus/09-gradient-descent.py[Code]

:::

## Double integral: cutting the region into small squares

The rectangular region is tiled with small cells; cells inside the circle are highlighted and boundary cells count only partly.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Double integral: cutting the region into small squares](../../shots/math-calculus/10-double-integral-grid.png)

</div>

<<< @/../corpus/examples/math-calculus/10-double-integral-grid.py[Code]

:::

## Fourier series approaching a square wave

A square wave (step-shaped) overlaid with four partial-sum curves: more terms make the flat parts flatter and the jumps steeper, yet a small overshoot always remains near each jump (the Gibbs phenomenon).

::: code-group

<div class="vp-block active" data-title="Rendered">

![Fourier series approaching a square wave](../../shots/math-calculus/11-fourier-square.png)

</div>

<<< @/../corpus/examples/math-calculus/11-fourier-square.py[Code]

:::

## Partial sums: harmonic series diverges vs Σ1/n² converges

The blue line (harmonic partial sums) climbs without levelling off; the yellow line (1/n² partial sums) flattens quickly and stops.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Partial sums: harmonic series diverges vs Σ1/n² converges](../../shots/math-calculus/12-series-partial-sums.png)

</div>

<<< @/../corpus/examples/math-calculus/12-series-partial-sums.py[Code]

:::
