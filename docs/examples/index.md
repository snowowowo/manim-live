# 渲染成品画廊

下面所有截图都出自本仓语料（`_dev/examples/`，239 条），由 `scripts/shot-corpus.mjs`
用**真 Chromium 逐条渲染**落图——不是设计稿，每一张背后都有一段能跑的 Python。
想看动画过程，`pnpm playground` 在本地起演示台，逐条实播。

::: info 为什么是终态截图
截图抓的是动画播完后的那一帧。动画**过程**（物体怎么动、怎么变形）静态图呈现不了；
个别强动画语料的终态还很平淡（比如「物体飞出去了」）。这类请以 playground 实播为准。
:::

## 基础图形与函数

<figure>
  <img src="../images/axes-plot.png" alt="坐标系与函数曲线" loading="lazy" />
  <figcaption>坐标系 + 函数曲线 —— <code>basic/09-axes-plot.py</code></figcaption>
</figure>

<figure>
  <img src="../images/bar-chart.png" alt="三色柱状图" loading="lazy" />
  <figcaption>柱状图（红 / 蓝 / 绿，高度与数据一致）—— <code>graph/08-bar-chart.py</code></figcaption>
</figure>

## 文字与公式

<figure>
  <img src="../images/mathtex-frac.png" alt="MathTex 分式与根号" loading="lazy" />
  <figcaption>MathTex：分式有横线、根号盖住被开方数（KaTeX 排版）—— <code>text/02-mathtex-frac.py</code></figcaption>
</figure>

## 数学课堂

<figure>
  <img src="../images/unit-circle.png" alt="单位圆与三角函数线" loading="lazy" />
  <figcaption>单位圆上一点转动，sin / cos 线随角度伸缩 —— <code>lesson/01-unit-circle.py</code></figcaption>
</figure>

<figure>
  <img src="../images/polar-rose.png" alt="极坐标玫瑰线" loading="lazy" />
  <figcaption>极坐标玫瑰线：k 奇数 k 瓣、k 偶数 2k 瓣 —— <code>lesson/04-polar-rose.py</code></figcaption>
</figure>

<figure>
  <img src="../images/space-cube.png" alt="空间直角坐标系与立方体" loading="lazy" />
  <figcaption>真 3D：三个面同时可见、明暗各不同（ThreeDScene）—— <code>lesson/13-space-cube-camera.py</code></figcaption>
</figure>

## 线性代数 · 概率 · 离散

<figure>
  <img src="../images/determinant-area.png" alt="行列式的几何意义" loading="lazy" />
  <figcaption>行列式：单位正方形面积被放大 |det| 倍 —— <code>math-linear/02-determinant-area.py</code></figcaption>
</figure>

<figure>
  <img src="../images/monte-carlo-pi.png" alt="蒙特卡洛估算 π" loading="lazy" />
  <figcaption>蒙特卡洛估算 π：1200 个点撒出 3.140 —— <code>math-prob/10-monte-carlo-pi.py</code></figcaption>
</figure>

<figure>
  <img src="../images/power-set-lattice.png" alt="幂集格" loading="lazy" />
  <figcaption>幂集格：8 个子集按包含关系排成立方体投影 —— <code>math-discrete/02-power-set-lattice.py</code></figcaption>
</figure>

## 支持面（API 覆盖）

<figure>
  <img src="../images/colors.png" alt="全部 76 个可用色" loading="lazy" />
  <figcaption>76 个颜色常量逐一上色（各不相同，不是一片黑）—— <code>api/01-colors.py</code></figcaption>
</figure>

这只是一瞥。**239 条语料、17 个组**的完整清单与截图在 `_dev/shots/`
（每张图在 `index.json` 里都有一条「应该看见什么」的断言），分组从基础图形、
动画、更新器、场景操作，一直到微积分、线性代数、概率、群论、离散数学。

## 附：上面第一条的完整源码

就是「快速开始」里跑的那段——`_dev/examples/basic/09-axes-plot.py` 原文：

```python
from manim import *


class AxesPlotScene(Scene):
    def construct(self):
        ax = Axes(x_range=[-3, 3, 1], y_range=[-1, 3, 1])
        graph = ax.plot(lambda x: x * x / 3, color=GREEN)
        self.play(Create(ax), Create(graph))
        self.wait(0.3)
```

Manim CE 的常规写法，没有本包特有的咒语。适配层负责把它翻译成 manim-web 的调用；
CE 语法与本包实测支持面的差异，`renderer.check()` 会在预检时点名。

<style>
img { width: 100%; max-width: 720px; display: block; margin: 0 auto; border-radius: 8px; border: 1px solid var(--vp-c-divider); }
figure { margin: 8px 0 28px; }
figcaption { font-size: 13px; color: var(--vp-c-text-2); text-align: center; margin-top: 6px; }
</style>
