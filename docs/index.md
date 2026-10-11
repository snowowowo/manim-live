---
layout: home

hero:
  name: manim-live
  text: 在浏览器里用真 Python 跑 Manim
  tagline: 一块画布 + 一个运行时。Pyodide（真 CPython + 真 numpy）执行 Manim Community 的代码，WebGL 出画面。零 UI、零框架、零宿主、零本地 Manim。
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: 看渲染成品
      link: /examples/
    - theme: alt
      text: GitHub
      link: https://github.com/snowowowo/manim-live

features:
  - icon: 🐍
    title: 真 Python，不是转译
    details: Pyodide 跑的是真 CPython：推导式、闭包、dataclass、itertools 原样可用；Manim CE 的写法由适配层翻译成 manim-web 调用。
  - icon: 🧩
    title: 零框架
    details: 对外只碰两个 DOM 原语——给一个容器元素，拿到 run / dispose。React、Vue、原生 JS 的差别只是挂载时机。
  - icon: 🩺
    title: 先预检再上台
    details: check() 干跑一遍，语法错、未定义名、取不到的第三方包当场回 ok:false，不必等用户点了播放才炸。
  - icon: 🎬
    title: 能录屏
    details: 内置浏览器录屏导出（webm）；也可以接入自己的导出器，比如本机 manim CLI 渲 mp4。
---

## 它渲出来的东西长这样

下面每一张都是**真机渲染的终态**：由 `scripts/shot-corpus.mjs` 用真 Chromium 逐条跑语料落图，
不是设计稿。源码与这张图的对应关系见[示例画廊](/examples/)。

<div class="gallery">
  <figure>
    <img src="./images/determinant-area.png" alt="行列式的几何意义" loading="lazy" />
    <figcaption>线性变换：单位正方形面积被放大 |det| 倍</figcaption>
  </figure>
  <figure>
    <img src="./images/monte-carlo-pi.png" alt="蒙特卡洛估算 π" loading="lazy" />
    <figcaption>往正方形里撒点，数出 π ≈ 3.140</figcaption>
  </figure>
  <figure>
    <img src="./images/space-cube.png" alt="真 3D 场景" loading="lazy" />
    <figcaption>ThreeDScene：有光有深度的真 3D</figcaption>
  </figure>
</div>

<style>
.gallery { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 12px; }
.gallery figure { margin: 0; }
.gallery img { width: 100%; border-radius: 8px; border: 1px solid var(--vp-c-divider); }
.gallery figcaption { font-size: 13px; color: var(--vp-c-text-2); text-align: center; margin-top: 4px; }
</style>

::: warning 截图是终态，动画不是
截图抓的是一段动画播完后的那一帧。**动画过程本身**（物体怎么动、怎么变形）静态图呈现不了——
本仓自带一个本地演示台，`pnpm playground` 起来后 239 条语料都能点开实播。它只留在本地开发用，
不随文档上线。
:::
