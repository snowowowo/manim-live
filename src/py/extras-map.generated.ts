// 由 scripts/probe-api.mjs 生成（勿手改；换版本或改 EXTRAS 清单后重跑）。
// 扩展车道（manim_live_extra 模块）的名字表：上游有、CE 没有的图形。
// **这张表就是车道的总开关**——清空它（重跑探针时把 EXTRAS 置空）即整条车道消失：
//   适配层不再生成 manim_live_extra 模块、manim 里不再有教错存根，代码回到纯 CE 面。
// 收录口径与撞名检查见 probe-api.mjs 的 EXTRAS 注释。当前 34 个。

export interface ExtraApiEntry {
  /** manim-web 里的类名（构造走同一座桥：_mb_create(kind, args, kwargs)） */
  js: string
}

export const EXTRA_API_MAP: Record<string, ExtraApiEntry> = {
  "Histogram": {
    "js": "Histogram"
  },
  "BoxPlot": {
    "js": "BoxPlot"
  },
  "ViolinPlot": {
    "js": "ViolinPlot"
  },
  "ScatterPlot": {
    "js": "ScatterPlot"
  },
  "StackedBarChart": {
    "js": "StackedBarChart"
  },
  "AreaChart": {
    "js": "AreaChart"
  },
  "StepChart": {
    "js": "StepChart"
  },
  "CalendarHeatmap": {
    "js": "CalendarHeatmap"
  },
  "CandlestickChart": {
    "js": "CandlestickChart"
  },
  "WaterfallChart": {
    "js": "WaterfallChart"
  },
  "PieChart": {
    "js": "PieChart"
  },
  "DonutChart": {
    "js": "DonutChart"
  },
  "RadarChart": {
    "js": "RadarChart"
  },
  "GanttChart": {
    "js": "GanttChart"
  },
  "HeatMap": {
    "js": "HeatMap"
  },
  "ContourPlot": {
    "js": "ContourPlot"
  },
  "DNAHelix": {
    "js": "DNAHelix"
  },
  "Cell": {
    "js": "Cell"
  },
  "AminoAcidChain": {
    "js": "AminoAcidChain"
  },
  "MoleculeMobject": {
    "js": "MoleculeMobject"
  },
  "NeuralNetwork": {
    "js": "NeuralNetwork"
  },
  "FeedForwardLayer": {
    "js": "FeedForwardLayer"
  },
  "ConvolutionalLayer": {
    "js": "ConvolutionalLayer"
  },
  "PoolingLayer": {
    "js": "PoolingLayer"
  },
  "ImageLayer": {
    "js": "ImageLayer"
  },
  "DiceFace": {
    "js": "DiceFace"
  },
  "SankeyDiagram": {
    "js": "SankeyDiagram"
  },
  "Box3D": {
    "js": "Box3D"
  },
  "Vector3D": {
    "js": "Vector3D"
  },
  "ParametricSurface": {
    "js": "ParametricSurface"
  },
  "Surface3D": {
    "js": "Surface3D"
  },
  "ImplicitSurface": {
    "js": "ImplicitSurface"
  },
  "MandelbrotSet": {
    "js": "MandelbrotSet"
  },
  "NewtonFractal": {
    "js": "NewtonFractal"
  }
}
