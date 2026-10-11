---
# 首页 = 简介落地页。layout: home 是默认主题的 landing 布局：
# 按设计**不带左侧目录、也不带右侧大纲**，只有顶部导航——
# 与 VitePress 官网首页一致。进入文档页之后才有左右两栏。
layout: home

hero:
  name: manim-live
  text: 在浏览器里用真 Python 跑 Manim
  tagline: 一块画布 + 一个运行时。Pyodide（真 CPython + 真 numpy）执行 Manim Community 的代码，WebGL 渲染画面。零 UI、零框架、零宿主、零本地 Manim。
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: 渲染成品
      link: /examples/
    - theme: alt
      text: GitHub
      link: https://github.com/snowowowo/manim-live

features:
  - icon: 🐍
    title: 真 Python，不是转译
    details: Pyodide 运行真 CPython：推导式、闭包、dataclass、itertools 原样可用；Manim CE 的写法由适配层翻译为 manim-web 调用。
  - icon: 🧩
    title: 零框架
    details: 对外只涉及两个 DOM 原语——传入一个容器元素，获得 run / dispose。React、Vue、原生 JS 的差别仅是挂载时机。
  - icon: 🩺
    title: 先预检再呈现
    details: check() 先干跑一遍，语法错、未定义名、取不到的第三方包立即返回 ok:false，无需等到用户播放时才失败。
  - icon: 🎬
    title: 支持录屏
    details: 内置浏览器录屏导出（webm）；也可接入自定义导出器，例如本机 manim CLI 渲染 mp4。
---

## 快速开始

```bash
pnpm add manim-live
```

安装后，传入一个容器元素、执行一段 Python，即完成全部流程；安装、执行与各框架挂载的完整写法见[快速开始](/guide/quick-start)与[在各框架里用](/guide/frameworks)。

## 渲染效果

以下每张图均为**真机渲染的终态**：由 `scripts/shot-corpus.mjs` 使用真实 Chromium 逐条运行语料生成，非设计稿。源码与图片的对应关系见[示例画廊](/examples/)。

<div class="gallery">
  <figure>
    <img src="./images/determinant-area.png" alt="行列式的几何意义" loading="lazy" />
    <figcaption>线性变换：单位正方形面积被放大 |det| 倍</figcaption>
  </figure>
  <figure>
    <img src="./images/monte-carlo-pi.png" alt="蒙特卡洛估算 π" loading="lazy" />
    <figcaption>向正方形内撒点，估算出 π ≈ 3.140</figcaption>
  </figure>
  <figure>
    <img src="./images/space-cube.png" alt="真 3D 场景" loading="lazy" />
    <figcaption>ThreeDScene：带光照与深度的真实 3D</figcaption>
  </figure>
</div>

::: warning 截图是终态，动画不是
截图截取的是一段动画播放完毕后的那一帧。**动画过程本身**（物体如何运动、变形）静态图无法呈现——本仓库附带一个本地演示台，`pnpm playground` 启动后 239 条语料均可点开实播。该演示台仅用于本地开发，不随文档上线。
:::

## 全部章节

| 章节 | 内容 |
| --- | --- |
| [安装](/guide/installation) | 安装包、两项外部资源（Pyodide / KaTeX）、浏览器要求 |
| [快速开始](/guide/quick-start) | 约二十行代码渲染出第一幅画面，逐步说明每一步不调用的后果 |
| [在各框架里用](/guide/frameworks) | 原生 JS / React / Vue，以及画布生命周期的两个要点 |
| [必须知道的三条契约](/guide/contracts) | 多实例单例、`dispose()` 真实释放、单段独立执行；以及「复用画布的已知问题」 |
| [第三方包从哪来、缓存在哪](/guide/packages) | `import pandas` 取不到包时的原因，两种部署环境的获取方式与缓存 |
| [在 Node 里干跑预检](/guide/node) | 不碰 DOM 的 CI 预检 |
| [渲染成品画廊](/examples/) | 10 张真机渲染的成品与对应语料源码 |
| [公开接口](/api/) | `createManimRenderer` / `Surface` / 导出接入者 / 低层入口 |
| [开发与调试](/dev/) | 面向本仓库开发者：构建、测试、演示台、产物自检 |
