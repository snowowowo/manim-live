# Gallery

Every screenshot below comes from this repository's corpus (`corpus/examples/`, 239 entries / 19 groups), rendered entry by entry in **a real Chromium** by `scripts/shot-corpus.mjs` — not mockups; each image corresponds to a piece of executable Python.

Sections follow domains and APIs, from basic shapes through linear algebra, analysis, probability, discrete math, and group theory, to third-party library combos. The animation process requires the local playground: after `pnpm playground`, entries can be played one by one.

::: info Why these are end-state screenshots
A screenshot captures the frame after an animation finishes playing. The **process** (how objects move and morph) cannot be shown statically; a few animation-focused entries end in a simple frame (for example, the object has already moved out of frame). For these, playback in the playground is authoritative.
:::

## Basic shapes and functions

<figure>
  <img src="../../images/axes-plot.png" alt="Axes with a function curve" loading="lazy" />
  <figcaption>Axes + function curve —— <code>basic/09-axes-plot.py</code></figcaption>
</figure>

<figure>
  <img src="../../images/bar-chart.png" alt="Three-color bar chart" loading="lazy" />
  <figcaption>Bar chart (red / blue / green; heights match the data) —— <code>graph/08-bar-chart.py</code></figcaption>
</figure>

<figure>
  <img src="../../images/area.png" alt="Area under a curve" loading="lazy" />
  <figcaption>Semi-transparent fill between the curve and the x-axis, bounded by the curve —— <code>graph/06-area.py</code></figcaption>
</figure>

## Text and formulas

<figure>
  <img src="../../images/mathtex-frac.png" alt="MathTex fractions and radicals" loading="lazy" />
  <figcaption>MathTex: fractions get their bar, radicals cover the radicand —— <code>text/02-mathtex-frac.py</code></figcaption>
</figure>

<figure>
  <img src="../../images/markup.png" alt="MarkupText rich text" loading="lazy" />
  <figcaption>MarkupText: local bold / color changes take effect, the rest is untouched —— <code>text/04-markup.py</code></figcaption>
</figure>

## Animations and updaters

<figure>
  <img src="../../images/rate-variants.png" alt="there_and_back rate function" loading="lazy" />
  <figcaption>Rate functions: the object reaches the target then returns along the same path (the signature of there_and_back) —— <code>animate/04-rate-variants.py</code></figcaption>
</figure>

<figure>
  <img src="../../images/traced-path.png" alt="TracedPath following a dot" loading="lazy" />
  <figcaption>TracedPath: a trail is drawn behind the moving dot, matching the path traveled —— <code>updater/01-traced-path.py</code></figcaption>
</figure>

## Linear algebra

<figure>
  <img src="../../images/determinant-area.png" alt="Geometric meaning of the determinant" loading="lazy" />
  <figcaption>Determinant: the unit square's area scales by |det| —— <code>math-linear/02-determinant-area.py</code></figcaption>
</figure>

<figure>
  <img src="../../images/matrix-vector-product.png" alt="Matrix times vector" loading="lazy" />
  <figcaption>Matrix × vector = linear combination of columns: two column vectors scale and form a parallelogram; its diagonal is A·x —— <code>math-linear/01-matrix-vector-product.py</code></figcaption>
</figure>

<figure>
  <img src="../../images/gram-schmidt.png" alt="Gram–Schmidt orthogonalization" loading="lazy" />
  <figcaption>Gram–Schmidt: the second vector minus its projection onto the first ends up perpendicular to it —— <code>math-linear/05-gram-schmidt.py</code></figcaption>
</figure>

<figure>
  <img src="../../images/eigen-decomposition.png" alt="Eigendirections" loading="lazy" />
  <figcaption>Eigendecomposition: along the dashed directions, vectors keep their direction (only stretched); the third vector visibly rotates —— <code>math-linear/06-eigen-decomposition.py</code></figcaption>
</figure>

## Mathematical analysis

<figure>
  <img src="../../images/taylor-sin.png" alt="Taylor polynomials approaching sin" loading="lazy" />
  <figcaption>Taylor expansion: degree 1 / 3 / 5 / 7 polynomials approach sin x, fitting near the origin first —— <code>math-calculus/03-taylor-sin.py</code></figcaption>
</figure>

<figure>
  <img src="../../images/e-definition.png" alt="Definition of e" loading="lazy" />
  <figcaption>Definition of e: the (1+1/n)ⁿ points rise monotonically, always below the y=e dashed line —— <code>math-calculus/04-e-definition.py</code></figcaption>
</figure>

<figure>
  <img src="../../images/mean-value-theorem.png" alt="Mean value theorem" loading="lazy" />
  <figcaption>Mean value theorem: the secant (blue) is parallel to the tangent at the midpoint (yellow) —— <code>math-calculus/05-mean-value-theorem.py</code></figcaption>
</figure>

<figure>
  <img src="../../images/upper-lower-sum.png" alt="Upper and lower Darboux sums" loading="lazy" />
  <figcaption>Darboux sums: on the same partition, left-endpoint (low) and right-endpoint (high) rectangles sandwich the true value —— <code>math-calculus/06-upper-lower-sum.py</code></figcaption>
</figure>

## Probability and statistics

<figure>
  <img src="../../images/monte-carlo-pi.png" alt="Monte Carlo estimate of π" loading="lazy" />
  <figcaption>Monte Carlo estimate of π: 1200 points yield 3.140 —— <code>math-prob/10-monte-carlo-pi.py</code></figcaption>
</figure>

<figure>
  <img src="../../images/bayes-tree.png" alt="Bayes' formula as a tree" loading="lazy" />
  <figcaption>Bayes' formula: a two-level tree lays out "diseased 1% × detected 99%" vs "healthy 99% × false alarm 5%" and combines them into the posterior —— <code>math-prob/03-bayes-tree.py</code></figcaption>
</figure>

<figure>
  <img src="../../images/variance-spread.png" alt="Variance as spread" loading="lazy" />
  <figcaption>Variance: two datasets share a mean and axis; one bunches up, one spreads wide, with lines marking each spread —— <code>math-prob/05-variance-spread.py</code></figcaption>
</figure>

<figure>
  <img src="../../images/law-of-large-numbers.png" alt="Law of large numbers" loading="lazy" />
  <figcaption>Law of large numbers: the frequency line oscillates wildly at first, then settles onto the y=0.5 theoretical dashed line —— <code>math-prob/06-law-of-large-numbers.py</code></figcaption>
</figure>

## Discrete mathematics

<figure>
  <img src="../../images/power-set-lattice.png" alt="Power-set lattice" loading="lazy" />
  <figcaption>Power-set lattice: 8 subsets arranged by inclusion as a cube projection —— <code>math-discrete/02-power-set-lattice.py</code></figcaption>
</figure>

<figure>
  <img src="../../images/truth-table.png" alt="Truth table" loading="lazy" />
  <figcaption>Truth table: p→q vs ¬p∨q row by row; the last two columns share a green box — an identity —— <code>math-discrete/01-truth-table.py</code></figcaption>
</figure>

<figure>
  <img src="../../images/hasse-diagram.png" alt="Hasse diagram" loading="lazy" />
  <figcaption>Hasse diagram: {1,2,3,6} by divisibility forms a diamond; 2 and 3 sit side by side, incomparable, with no line —— <code>math-discrete/05-hasse-diagram.py</code></figcaption>
</figure>

## Group theory

<figure>
  <img src="../../images/dihedral-symmetry.png" alt="Dihedral group D4" loading="lazy" />
  <figcaption>Dihedral group D₄: the 8 symmetries of a square — 4 rotations on top, 4 mirrors below —— <code>math-group/03-dihedral-symmetry.py</code></figcaption>
</figure>

<figure>
  <img src="../../images/cayley-table.png" alt="Cayley table" loading="lazy" />
  <figcaption>Cayley table: the 4×4 (Z/4, +) table; the identity row matches the header, the axioms read straight off —— <code>math-group/02-cayley-table.py</code></figcaption>
</figure>

<figure>
  <img src="../../images/lagrange-theorem.png" alt="Lagrange's theorem" loading="lazy" />
  <figcaption>Lagrange's theorem: 12 elements colored by coset — number of blocks × block size = group size —— <code>math-group/06-lagrange-theorem.py</code></figcaption>
</figure>

## 3D and composed lessons

<figure>
  <img src="../../images/unit-circle.png" alt="Unit circle and trig lines" loading="lazy" />
  <figcaption>A point rotates on the unit circle; the sin / cos lines stretch with the angle —— <code>lesson/01-unit-circle.py</code></figcaption>
</figure>

<figure>
  <img src="../../images/polar-rose.png" alt="Polar rose" loading="lazy" />
  <figcaption>Polar rose: odd k gives k petals, even k gives 2k —— <code>lesson/04-polar-rose.py</code></figcaption>
</figure>

<figure>
  <img src="../../images/space-cube.png" alt="3D axes and a cube" loading="lazy" />
  <figcaption>Real 3D: three faces visible at once with distinct shading (ThreeDScene) —— <code>lesson/13-space-cube-camera.py</code></figcaption>
</figure>

## Third-party library combos (pandas / scipy / sklearn / statsmodels)

<figure>
  <img src="../../images/sklearn-fit.png" alt="pandas + sklearn fit" loading="lazy" />
  <figcaption>pandas loads data + sklearn fits, and the result goes straight into the Manim scene —— <code>combo/01-pandas-sklearn-fit.py</code></figcaption>
</figure>

<figure>
  <img src="../../images/statsmodels-ols.png" alt="statsmodels OLS regression" loading="lazy" />
  <figcaption>statsmodels OLS regression: fitted line and sample points in one scene —— <code>combo/04-pandas-statsmodels-ols.py</code></figcaption>
</figure>

## Support surface (API coverage)

<figure>
  <img src="../../images/colors.png" alt="All 76 available colors" loading="lazy" />
  <figcaption>All 76 color constants rendered one by one (each distinct, not a black field) —— <code>api/01-colors.py</code></figcaption>
</figure>

This is a glimpse. The full list and screenshots of all **239 corpus entries in 19 groups** live in `corpus/shots/` (each image has a "what you should see" assertion in `index.json`); the item-by-item list of supported and unsupported APIs is in [Support Surface](/en/guide/support).

<style>
img { width: 100%; max-width: 720px; display: block; margin: 0 auto; border-radius: 8px; border: 1px solid var(--vp-c-divider); }
figure { margin: 8px 0 28px; }
figcaption { font-size: 13px; color: var(--vp-c-text-2); text-align: center; margin-top: 6px; }
</style>
