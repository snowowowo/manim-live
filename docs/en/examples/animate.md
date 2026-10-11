<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# Animations

m.animate chains, rate functions, the Transform family, entrance and highlight animations, motion along a path, and draw-border-then-fill.

This page lists 17 examples. The code is imported from `corpus/examples/animate/`; the screenshots are end states rendered on real machines.

## m.animate chain

The square moves right, then changes colour, then scales (several changes on one chain land together); the motion is smooth.

::: code-group

<div class="vp-block active" data-title="Rendered">

![m.animate chain](../../shots/animate/01-chain.png)

</div>

<<< @/../corpus/examples/animate/01-chain.py[Code]

:::

## Changing the fill inside an animate chain

At the end the fill is the target colour, reached by a gradient rather than an instant jump.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Changing the fill inside an animate chain](../../shots/animate/02-chain-fill.png)

</div>

<<< @/../corpus/examples/animate/02-chain-fill.py[Code]

:::

## Rate and duration (rate_func comparison)

Two mobjects travel the same distance left to right in the same run_time, one with rate_func=linear and one with rate_func=smooth, each labelled with its rate name; the frame keeps the start and end marks of both paths. The pacing difference (smooth is slow at both ends, fast in the middle) is processual — observe it in real time; the final frame testifies through the path + endpoint marks + rate-name labels.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Rate and duration (rate_func comparison)](../../shots/animate/03-rate-func.png)

</div>

<<< @/../corpus/examples/animate/03-rate-func.py[Code]

:::

## there_and_back rate

The mobject reaches the target and returns along the same path to the start (the signature behaviour of there_and_back). The return is processual — observe it in real time; in the final frame the circle is back at the start while the target dot and the dashed path stay as evidence, with there_and_back labelled beside the circle.

::: code-group

<div class="vp-block active" data-title="Rendered">

![there_and_back rate](../../shots/animate/04-rate-variants.png)

</div>

<<< @/../corpus/examples/animate/04-rate-variants.py[Code]

:::

## Transform

Mobject A morphs continuously into mobject B (shape and position interpolated together); throughout, both are the same mobject.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Transform](../../shots/animate/05-transform.png)

</div>

<<< @/../corpus/examples/animate/05-transform.py[Code]

:::

## ReplacementTransform replaces the old mobject

After the morph the scene holds B and A is gone — moving A afterwards never brings it back.

::: code-group

<div class="vp-block active" data-title="Rendered">

![ReplacementTransform replaces the old mobject](../../shots/animate/06-replacement-transform.png)

</div>

<<< @/../corpus/examples/animate/06-replacement-transform.py[Code]

:::

## TransformMatchingTex formula morph

Identical fragments of the formula stay in place while different fragments move into position, instead of shuffling the whole string (yellow = unchanged from a = b to x = y, with a→x and b→y filling the gaps).

::: code-group

<div class="vp-block active" data-title="Rendered">

![TransformMatchingTex formula morph](../../shots/animate/07-transform-matching-tex.png)

</div>

<<< @/../corpus/examples/animate/07-transform-matching-tex.py[Code]

:::

## LaggedStart staggered entrance

Several mobjects enter one after another with a stagger; lag_ratio sets how much they overlap.

::: code-group

<div class="vp-block active" data-title="Rendered">

![LaggedStart staggered entrance](../../shots/animate/08-lagged-start.png)

</div>

<<< @/../corpus/examples/animate/08-lagged-start.py[Code]

:::

## AnimationGroup in parallel

The animations in the group run at the same time and finish together, not one by one.

::: code-group

<div class="vp-block active" data-title="Rendered">

![AnimationGroup in parallel](../../shots/animate/09-animation-group.png)

</div>

<<< @/../corpus/examples/animate/09-animation-group.py[Code]

:::

## Indicate / Flash / Circumscribe

Indicate is a scale flash in place, Flash is a burst of light at a point, Circumscribe draws a ring around the mobject — three distinct shapes. All three highlights are processual — observe them in real time; the final frame distinguishes them by name labels and keeps a ring for Circumscribe (a hand-computed Rectangle added explicitly after the animation) as evidence.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Indicate / Flash / Circumscribe](../../shots/animate/10-indicate-family.png)

</div>

<<< @/../corpus/examples/animate/10-indicate-family.py[Code]

:::

## MoveAlongPath follows a path

The dot travels along the given path curve, not along a straight line.

::: code-group

<div class="vp-block active" data-title="Rendered">

![MoveAlongPath follows a path](../../shots/animate/11-move-along-path.png)

</div>

<<< @/../corpus/examples/animate/11-move-along-path.py[Code]

:::

## Rotating about an axis

The mobject turns continuously about the given axis (several turns or a given angle), not snapping into place.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Rotating about an axis](../../shots/animate/12-rotating.png)

</div>

<<< @/../corpus/examples/animate/12-rotating.py[Code]

:::

## ScaleInPlace

The mobject scales up or down in place; its centre does not move.

::: code-group

<div class="vp-block active" data-title="Rendered">

![ScaleInPlace](../../shots/animate/13-scale-in-place.png)

</div>

<<< @/../corpus/examples/animate/13-scale-in-place.py[Code]

:::

## DrawBorderThenFill

The outline is drawn first and only then does the fill arrive — two visible phases. Border-first, fill-later is processual — observe it in real time; the adapter does not settle the fill at the animation's end state, so a set_fill animation is appended afterwards and the final frame shows a fully yellow-filled square.

::: code-group

<div class="vp-block active" data-title="Rendered">

![DrawBorderThenFill](../../shots/animate/14-draw-border.png)

</div>

<<< @/../corpus/examples/animate/14-draw-border.py[Code]

:::

## ApplyMatrix

The mobject is skewed or rotated by the matrix — a shear or rotation deformation, not a translation or uniform scale.

::: code-group

<div class="vp-block active" data-title="Rendered">

![ApplyMatrix](../../shots/animate/15-apply-matrix.png)

</div>

<<< @/../corpus/examples/animate/15-apply-matrix.py[Code]

:::

## FadeIn / FadeOut

FadeIn fades in from transparent and FadeOut fades out to nothing; everything else is unchanged. Fading is processual — observe it in real time; readable evidence in the final frame: the top title stays throughout as a reference, the FadeIn triangle remains visible, and the FadeOut circle is gone.

::: code-group

<div class="vp-block active" data-title="Rendered">

![FadeIn / FadeOut](../../shots/animate/16-fade-family.png)

</div>

<<< @/../corpus/examples/animate/16-fade-family.py[Code]

:::

## GrowFromEdge / GrowFromCenter

GrowFromCenter grows out of the centre while GrowFromEdge grows along the given edge — different directions.

::: code-group

<div class="vp-block active" data-title="Rendered">

![GrowFromEdge / GrowFromCenter](../../shots/animate/17-grow-family.png)

</div>

<<< @/../corpus/examples/animate/17-grow-family.py[Code]

:::
