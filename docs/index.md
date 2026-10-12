---
# 首页 = 简介落地页。layout: home 是默认主题的 landing 布局：
# 按设计**不带左侧目录、也不带右侧大纲**，只有顶部导航——
# 与 VitePress 官网首页一致。进入文档页之后才有左右两栏。
layout: home

hero:
  name: manim-live
  text: 标准 Manim 代码，浏览器里实时渲染
  tagline: 把标准 Manim（Python）代码变成网页里的实时动画：无需服务器，无需本地 Python。
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: API 参考
      link: /api/
    - theme: alt
      text: GitHub
      link: https://github.com/snowowowo/manim-live

features:
  - icon: 🐍
    title: 标准 Manim，原样可跑
    details: 写的就是 Manim CE 的 Python：437 项公开 API 实测可用 385 项（约 88%），缺的 52 项报错时直接给替代写法。
  - icon: 🧠
    title: 真 Python，真渲染
    details: Pyodide 在浏览器里跑真 CPython（核心约 13 MB），manim-web 出画面；239 条语料逐条真机回归加截图。
  - icon: 🧩
    title: 一个容器元素即可嵌入
    details: 入口只有 createManimRenderer()：传入容器、拿到 run 与 dispose。React、Vue、原生 JS 只是挂载时机不同。
  - icon: 🛡
    title: 有问题的代码拦在渲染之前
    details: check() 干跑预检：语法错、未定义名、实测缺失的能力当场返回原因，不等到渲染阶段才失败。
---

## 一段代码，一幅实时动画

左边是一段**标准 Manim CE 代码**，没有任何本包特有的写法；把它交给 `surface.run()`，网页里**当场实时渲染**出右边的画面——不是预渲染的视频，而是执行这段 Python 绘制的结果。（截图为动画终态；播放过程见本地演示台。）

<div class="hero-demo">

```python
from manim import *


class AxesPlotScene(Scene):
    def construct(self):
        ax = Axes(x_range=[-3, 3, 1], y_range=[-1, 3, 1])
        graph = ax.plot(lambda x: x * x / 3, color=GREEN)
        self.play(Create(ax), Create(graph))
        self.wait(0.3)
```

<figure>

![上段代码实时渲染的结果](./shots/basic/09-axes-plot.png)

<figcaption>上段代码的实时渲染结果（终态）—— <code>corpus/examples/basic/09-axes-plot.py</code></figcaption>

</figure>

</div>

## 与原生 Manim 对比

代码是同一份标准 Manim Python，差别只在**在哪里执行、如何产出画面**：

| | 原生 Manim（CLI） | manim-live |
| --- | --- | --- |
| 写的代码 | 标准 Manim Python | 同一份代码，**原样可跑** |
| 运行环境 | 本机装 Python + manim + ffmpeg（公式还要 LaTeX） | **浏览器即可，零安装** |
| 出画面方式 | 命令行离线渲染成 mp4，播放与嵌入需自行解决 | **网页内实时渲染，代码贴入即播放** |
| 嵌入网页 / 产品 | 做不到，只能事后嵌视频文件 | **任意位置嵌入，一个容器元素即可** |
| AI 边讲边画 | 单次渲染需等待整条管线完成，无法配合讲解节奏 | **即写即演；check() 先把有问题的代码拦在渲染之前** |
| 部署成本 | 每台机器装一遍环境，或架渲染服务器 | **一个 npm 包；资源可自托管，完全离线也能跑** |

唯一的取舍：公开 API 437 项实测可用约 88%，主力场景（基础图形、坐标系、文本公式、动画、updater、3D）全部覆盖——逐项清单见[支持面](/guide/support)。

## 快速开始

```bash
pnpm add manim-live
```

最小流程三步：`createManimRenderer()` 建渲染器 → `createSurface(容器)` 建画布 → `surface.run(python)` 执行一段 Manim 代码。完整示例见[快速开始](/guide/quick-start)，各框架的挂载写法见[框架集成](/guide/frameworks)。

## 渲染成品

以下均为**真机渲染的终态**：由 `scripts/shot-corpus.mjs` 使用真实 Chromium 逐条运行语料生成，非设计稿。源码与图片的对应关系见[示例画廊](/examples/)。

<div class="gallery">
  <figure>

    ![行列式的几何意义](./shots/math-linear/02-determinant-area.png)

    <figcaption>线性变换：单位正方形面积被放大 |det| 倍</figcaption>

  </figure>
  <figure>

    ![蒙特卡洛估算 π](./shots/math-prob/10-monte-carlo-pi.png)

    <figcaption>向正方形内撒点，估算出 π ≈ 3.140</figcaption>

  </figure>
  <figure>

    ![真 3D 场景](./shots/lesson/13-space-cube-camera.png)

    <figcaption>ThreeDScene：带光照与深度的真实 3D</figcaption>

  </figure>
</div>

::: warning 截图为终态，不含动画过程
截图截取的是一段动画播放完毕后的那一帧。**动画过程本身**（物体如何运动、变形）静态图无法呈现——本仓库附带一个本地演示台，`pnpm playground` 启动后 239 条语料均可逐条播放。该演示台仅用于本地开发，不随文档上线。
:::
