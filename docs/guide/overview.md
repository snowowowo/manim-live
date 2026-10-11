# 它是什么

manim-live 把 Manim 动画带进浏览器：写**标准 Manim CE 的 Python 代码**，页面内当场渲染成 WebGL 动画——无需服务器、无需本机 Python。

## 为什么需要它：与两种既有方案对比

| | 原生 Manim（CLI） | manim-web | manim-live |
| --- | --- | --- | --- |
| 写的代码 | 标准 Manim Python | 自有 API，不是 Manim 写法 | **标准 Manim Python** |
| 执行位置 | 本机 Python（装 manim + LaTeX + ffmpeg） | 浏览器 | **浏览器（Pyodide 真 CPython）** |
| 输出 | mp4 视频文件 | WebGL 实时画面 | **WebGL 实时画面** |
| 网页里按需渲染 | 做不到（环境重，离不开本机或服务器） | 可以，但代码要按它的 API 重写 | **可以，标准代码原样跑** |

两条路各有一个硬伤。原生 Manim 能执行真 Python，但环境太重——想在一个网页里按需渲染一段动画，不可能要求每个用户装 Python 环境，架服务器又贵又慢。manim-web 进了浏览器，但 API 是它自己的一套，标准 Manim 代码跑不了——而 **AI 生成的恰恰是标准 Manim 写法**：训练语料里全是它，让 AI 按 manim-web 的私有 API 写代码既不稳定也不现实。

manim-live 把两者的优点拼在一起：**Pyodide 在浏览器里跑真 CPython**（代码是真的 Python，语言特性原样可用），**适配层把标准 Manim CE 写法翻译成 manim-web 调用**（渲染是浏览器原生的 WebGL）。于是一段 AI 生成的标准 Manim 代码，贴进页面就能动。

## 它在外形上是什么

一个 npm 包，对外只暴露一个工厂 `createManimRenderer()`：传入一个容器元素，拿到 `run(code)` 与 `dispose()`。对框架零依赖——React、Vue、原生 JS 只是挂载时机不同。第三方库（pandas / matplotlib 等）按 `pyodide-lock.json` 的 sha256 按需获取，取数地址可换成自托管，完全离线也能跑（见[第三方包从哪来](/guide/packages)）。

## 适用与不适用

**适用**：AI 对话 UI 里渲染模型生成的动画（这正是它的出身）；教学页面、交互式笔记按需画数学动画；`check()` 干跑预检把坏代码拦在渲染之前。

**不适用**：服务器端批量渲染视频（用 manim CLI 原生管线）；Manim 全量能力（本包覆盖 Manim CE 常用子集，见[公开接口](/api/)）；非 Python 的动画需求。
