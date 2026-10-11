---
# 首页 = 简介落地页。layout: home 是默认主题的 landing 布局：
# 按设计**不带左侧目录、也不带右侧大纲**，只有顶部导航——
# 与 VitePress 官网首页一致。进入文档页之后才有左右两栏。
layout: home

hero:
  name: manim-live
  text: Manim 代码，实时渲染
  tagline: 把标准 Manim（Python）代码变成网页里的实时动画。AI 讲解时直接生成、网站里随处渲染——无需服务器，无需本地环境。
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
    title: 标准 Manim，原样可跑
    details: 写的就是标准 Manim CE Python——不用学新 API，不用改写代码；贴进页面，动画当场渲染出来。
  - icon: 🤖
    title: 为 AI 生成而生
    details: AI 写的正是标准 Manim；check() 先干跑预检，坏代码拦在渲染之前。边讲解边生成动画，即写即演。
  - icon: 🧩
    title: 网站里随处渲染
    details: 一个容器元素 + run / dispose 两个原语；React、Vue、原生 JS 只是挂载时机不同。
  - icon: 📦
    title: 零环境依赖
    details: 无需服务器，无需本地 Python 与 manim；运行资源可自托管，完全离线也能跑。
---

## 快速开始

```bash
pnpm add manim-live
```

最小流程三步：`createManimRenderer()` 建渲染器 → `createSurface(容器)` 建画布 → `surface.run(python)` 执行一段 Manim 代码。它与原生 Manim 的逐项对比见[它是什么](/guide/overview)；完整示例见[快速开始](/guide/quick-start)。

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
| [它是什么](/guide/overview) | 解决的问题、方案与适用场景 |
| [安装](/guide/installation) | 安装命令、两项外部资源、浏览器要求 |
| [快速开始](/guide/quick-start) | 约二十行代码渲染出第一幅画面，逐步说明每一步不调用的后果 |
| [在各框架里用](/guide/frameworks) | 原生 JS / React / Vue，以及画布生命周期的两个要点 |
| [必须知道的三条契约](/guide/contracts) | 多实例单例、`dispose()` 真实释放、单段独立执行；以及「复用画布的已知问题」 |
| [第三方包从哪来、缓存在哪](/guide/packages) | `import pandas` 取不到包时的原因，两种部署环境的获取方式与缓存 |
| [在 Node 里干跑预检](/guide/node) | 不碰 DOM 的 CI 预检 |
| [渲染成品画廊](/examples/) | 10 张真机渲染的成品与对应语料源码 |
| [支持面](/guide/support) | 437 项公开 API 逐项实测：支持什么、不支持什么（52 项全列，附替代写法） |
| [公开接口](/api/) | `createManimRenderer` / `Surface` / 导出接入者 / 低层入口 |
| [开发与调试](/dev/) | 面向本仓库开发者：构建、测试、演示台、产物自检 |
