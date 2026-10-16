<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->

# Engine extensions (`manim_live_extra`)

**These are not standard Manim mobjects.** They live on the engine-extension lane: the code must say `from manim_live_extra import …`, they render only in this engine, and a local CLI export is refused up front by the export gate (see [Support Surface](/en/guide/support)). The 34 shapes on this page group by purpose: charts and statistics 14, maths visualisation 2, biology 3, chemistry 1, machine learning 5, probability 1, network and flow 1, 3D 5, fractals 2.

This page lists 34 examples. The code is imported from `corpus/examples/extras/`; the screenshots are end states rendered on real machines.

## Histogram

A four-bar histogram whose bar heights are the bucket counts (rising to the right), with axes drawn automatically.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Histogram](../../shots/extras/01-histogram.png)

</div>

<<< @/../corpus/examples/extras/01-histogram.py[Code]

:::

## Box plot (BoxPlot)

Two box plots side by side (box, whiskers, outliers); the left group sits overall higher than the right.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Box plot (BoxPlot)](../../shots/extras/02-boxplot.png)

</div>

<<< @/../corpus/examples/extras/02-boxplot.py[Code]

:::

## Violin plot (ViolinPlot)

Two violins (kernel-density outlines) side by side, each swelling where the data is densest.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Violin plot (ViolinPlot)](../../shots/extras/03-violinplot.png)

</div>

<<< @/../corpus/examples/extras/03-violinplot.py[Code]

:::

## Scatter plot (ScatterPlot)

A cloud of positively correlated points (larger x, larger y) with axes drawn automatically.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Scatter plot (ScatterPlot)](../../shots/extras/04-scatterplot.png)

</div>

<<< @/../corpus/examples/extras/04-scatterplot.py[Code]

:::

## Stacked bar chart (StackedBarChart)

Three bars, each stacked from two colour segments (blue below, green above), with a legend.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Stacked bar chart (StackedBarChart)](../../shots/extras/05-stacked-bar.png)

</div>

<<< @/../corpus/examples/extras/05-stacked-bar.py[Code]

:::

## Area chart (AreaChart)

Two bands filled down to the baseline in different colours, partially overlapping and rippling with x.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Area chart (AreaChart)](../../shots/extras/06-area-chart.png)

</div>

<<< @/../corpus/examples/extras/06-area-chart.py[Code]

:::

## Step chart (StepChart)

A staircase polyline that jumps horizontally then vertically between data points, each point marked with a dot.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Step chart (StepChart)](../../shots/extras/07-step-chart.png)

</div>

<<< @/../corpus/examples/extras/07-step-chart.py[Code]

:::

## Calendar heatmap (CalendarHeatmap)

A row of week-aligned cells (a calendar) whose shading follows each day’s value.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Calendar heatmap (CalendarHeatmap)](../../shots/extras/08-calendar-heatmap.png)

</div>

<<< @/../corpus/examples/extras/08-calendar-heatmap.py[Code]

:::

## Pie chart (PieChart)

A pie in three slices (2:1:1) with a text label on each.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Pie chart (PieChart)](../../shots/extras/09-pie-chart.png)

</div>

<<< @/../corpus/examples/extras/09-pie-chart.py[Code]

:::

## Donut chart (DonutChart)

A hollow three-colour ring (3:2:1) with the canvas showing through the middle.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Donut chart (DonutChart)](../../shots/extras/10-donut-chart.png)

</div>

<<< @/../corpus/examples/extras/10-donut-chart.py[Code]

:::

## Radar chart (RadarChart)

A pentagonal grid with a data polygon laid over it (five uneven dimensions), each axis labelled.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Radar chart (RadarChart)](../../shots/extras/11-radar-chart.png)

</div>

<<< @/../corpus/examples/extras/11-radar-chart.py[Code]

:::

## Gantt chart (GanttChart)

Two timeline bars (research first, development after and overlapping) with time on the horizontal axis and task names per row.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Gantt chart (GanttChart)](../../shots/extras/12-gantt-chart.png)

</div>

<<< @/../corpus/examples/extras/12-gantt-chart.py[Code]

:::

## Scalar-field heat map (HeatMap)

A field of cells coloured by a function’s value, bright at the centre and fading outward, in a continuous colour ramp with no grid lines.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Scalar-field heat map (HeatMap)](../../shots/extras/13-heatmap.png)

</div>

<<< @/../corpus/examples/extras/13-heatmap.py[Code]

:::

## Contour plot (ContourPlot)

Nested closed contour lines (a few rings on a saddle surface); where the lines crowd, the gradient is steep.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Contour plot (ContourPlot)](../../shots/extras/14-contour-plot.png)

</div>

<<< @/../corpus/examples/extras/14-contour-plot.py[Code]

:::

## Candlestick chart (CandlestickChart)

Three candlesticks with bodies and both wicks; gains are red and losses green (the Chinese convention, passed explicitly).

::: code-group

<div class="vp-block active" data-title="Rendered">

![Candlestick chart (CandlestickChart)](../../shots/extras/15-candlestick.png)

</div>

<<< @/../corpus/examples/extras/15-candlestick.py[Code]

:::

## Waterfall chart (WaterfallChart)

Four rise-and-fall segments plus a total bar, joined by connector lines, walking from 3 up to 6.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Waterfall chart (WaterfallChart)](../../shots/extras/16-waterfall.png)

</div>

<<< @/../corpus/examples/extras/16-waterfall.py[Code]

:::

## DNA double helix (DNAHelix)

Two backbone strands winding in opposite directions with base-pair rungs between them, coloured by base.

::: code-group

<div class="vp-block active" data-title="Rendered">

![DNA double helix (DNAHelix)](../../shots/extras/17-dna-helix.png)

</div>

<<< @/../corpus/examples/extras/17-dna-helix.py[Code]

:::

## Cell diagram (Cell)

A round membrane, a nucleus, and several organelles, each labelled.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Cell diagram (Cell)](../../shots/extras/18-cell.png)

</div>

<<< @/../corpus/examples/extras/18-cell.py[Code]

:::

## Amino-acid chain (AminoAcidChain)

A string of beads coloured by residue with peptide-bond links between them.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Amino-acid chain (AminoAcidChain)](../../shots/extras/19-amino-acid.png)

</div>

<<< @/../corpus/examples/extras/19-amino-acid.py[Code]

:::

## Molecular structure (MoleculeMobject)

A water molecule in skeletal form: the oxygen labelled O, two hydrogens labelled H, bonds drawn as lines.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Molecular structure (MoleculeMobject)](../../shots/extras/20-molecule.png)

</div>

<<< @/../corpus/examples/extras/20-molecule.py[Code]

:::

## Neural network (NeuralNetwork)

Three layers of nodes spread left to right with every adjacent pair fully connected, centred in the frame.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Neural network (NeuralNetwork)](../../shots/extras/21-neural-network.png)

</div>

<<< @/../corpus/examples/extras/21-neural-network.py[Code]

:::

## Fully connected layer (FeedForwardLayer)

A column of four evenly spaced dots.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Fully connected layer (FeedForwardLayer)](../../shots/extras/22-feed-forward-layer.png)

</div>

<<< @/../corpus/examples/extras/22-feed-forward-layer.py[Code]

:::

## Convolutional layer (ConvolutionalLayer)

Three 3×3 feature-map squares side by side.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Convolutional layer (ConvolutionalLayer)](../../shots/extras/23-conv-layer.png)

</div>

<<< @/../corpus/examples/extras/23-conv-layer.py[Code]

:::

## Pooling layer (PoolingLayer)

Three 2×2 feature-map squares side by side.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Pooling layer (PoolingLayer)](../../shots/extras/24-pooling-layer.png)

</div>

<<< @/../corpus/examples/extras/24-pooling-layer.py[Code]

:::

## Image layer (ImageLayer)

A single 5×5 grid of pixel cells.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Image layer (ImageLayer)](../../shots/extras/25-image-layer.png)

</div>

<<< @/../corpus/examples/extras/25-image-layer.py[Code]

:::

## Dice face (DiceFace)

A rounded square carrying five pips laid out as the 5 face.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Dice face (DiceFace)](../../shots/extras/26-dice-face.png)

</div>

<<< @/../corpus/examples/extras/26-dice-face.py[Code]

:::

## Sankey diagram (SankeyDiagram)

Two nodes on the left feeding two on the right, with flow ribbons whose width matches the flow.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Sankey diagram (SankeyDiagram)](../../shots/extras/27-sankey.png)

</div>

<<< @/../corpus/examples/extras/27-sankey.py[Code]

:::

## Cuboid (Box3D)

A cuboid standing on an axis, its faces shaded, unmistakably 3D at a slanted angle.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Cuboid (Box3D)](../../shots/extras/28-box3d.png)

</div>

<<< @/../corpus/examples/extras/28-box3d.py[Code]

:::

## 3D vector (Vector3D)

An arrowed vector reaching out from the origin among three axes.

::: code-group

<div class="vp-block active" data-title="Rendered">

![3D vector (Vector3D)](../../shots/extras/29-vector3d.png)

</div>

<<< @/../corpus/examples/extras/29-vector3d.py[Code]

:::

## Parametric surface (ParametricSurface)

A saddle-shaped surface swept out by u and v, with three axes.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Parametric surface (ParametricSurface)](../../shots/extras/30-parametric-surface.png)

</div>

<<< @/../corpus/examples/extras/30-parametric-surface.py[Code]

:::

## Surface (Surface3D)

An upward-curving paraboloid with three axes.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Surface (Surface3D)](../../shots/extras/31-surface3d.png)

</div>

<<< @/../corpus/examples/extras/31-surface3d.py[Code]

:::

## Implicit surface (ImplicitSurface)

A sphere cut out as the level set x²+y²+z²=1.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Implicit surface (ImplicitSurface)](../../shots/extras/32-implicit-surface.png)

</div>

<<< @/../corpus/examples/extras/32-implicit-surface.py[Code]

:::

## Mandelbrot set (MandelbrotSet)

A full fractal picture: the cardioid body with small discs around it and colour bands at the boundary.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Mandelbrot set (MandelbrotSet)](../../shots/extras/33-mandelbrot.png)

</div>

<<< @/../corpus/examples/extras/33-mandelbrot.py[Code]

:::

## Newton fractal (NewtonFractal)

A three-colour fractal partitioned by the cube roots of unity, with fine texture along the boundaries.

::: code-group

<div class="vp-block active" data-title="Rendered">

![Newton fractal (NewtonFractal)](../../shots/extras/34-newton-fractal.png)

</div>

<<< @/../corpus/examples/extras/34-newton-fractal.py[Code]

:::
