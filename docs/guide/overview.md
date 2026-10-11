# 它是什么

本页说明 manim-live 解决的问题、给出的方案、与直接用 manim-web 的区别、适用与不适用场景。只想装上就跑，直接看[安装](/guide/installation)与[快速开始](/guide/quick-start)。

## 解决的问题

Manim 是 Python 生态里最常用的数学动画库，但它的标准用法依赖本机 Python 环境与渲染管线（manim CLI + LaTeX + ffmpeg）。想在**网页里**按需渲染一段 Manim 动画——典型场景是 AI 对话产品里，模型生成一段 Manim 代码、页面当场画出来给用户看——通常要在服务器跑 Python，或要求用户本机装环境：两者对「一个前端页面」都太重。

## 方案

把整条执行链搬进浏览器：

- **Pyodide** 提供真 CPython 解释器（带 numpy / sympy），代码在页面里执行，不碰服务器；
- **manim-web** 提供 WebGL 渲染，画面直接画在画布上，不落视频文件；
- **适配层**（本包的核心工作量）把 Manim Community Edition 的写法翻译成 manim-web 的调用——用户写的是熟悉的 `Scene` / `self.play(Create(...))`，不需要学新 API。

对外只暴露一个工厂 `createManimRenderer()` 和两个 DOM 原语（给容器元素、拿 run / dispose），因此对框架零依赖。

## 与直接用 manim-web 的区别

manim-web 是底层渲染库，API 与 Manim CE 并不相同。本包在其上做了三件事：写法兼容（Manim CE 语法 → manim-web 调用）、执行队列与画布生命周期管理、`check()` 干跑预检。直接用 manim-web 意味着自己实现这三件事。

## 适用与不适用

**适用**：

- 在自己的产品里按需渲染 Manim 动画（AI 对话 UI、教学页面、交互式笔记）；
- 需要「代码先验后演」的链路——`check()` 能在渲染前拦下坏代码；
- 要求部署简单：一个 npm 包、可选自托管静态资源，无服务器。

**不适用**：

- 服务器端批量渲染视频——用 manim CLI 的原生管线；
- 需要 Manim 全部能力（如复杂 LaTeX 排版）——本包覆盖的是 Manim CE 的常用子集，支持面见[公开接口](/api/)与示例；
- 非 Python 的动画需求——本包只做 Manim。
