# manim-live

[中文](./README.md) | [English](./README.en.md)

把标准 Manim（Python）代码变成网页里的实时动画：无需服务器，无需本地 Python。包内只有纯逻辑——零 UI、零框架、零宿主，一个容器元素即可嵌入。

> 线上文档（安装 / 框架集成 / 示例画廊 / API 参考，中英双语）：<https://snowowowo.github.io/manim-live/>

## 特点

- **标准 Manim，原样可跑**：写的就是 Manim CE 的 Python；437 项公开 API 实测可用 385 项（约 88%），缺的 52 项报错时直接给替代写法。
- **真 Python，真渲染**：Pyodide 在浏览器里跑真 CPython（核心约 13 MB），manim-web 出 WebGL 画面；239 条语料逐条真机回归并落截图。
- **一个容器元素即可嵌入**：入口只有 `createManimRenderer()`；React、Vue、原生 JS 只是挂载时机不同。
- **check() 干跑预检**：语法错、未定义名、实测缺失的能力当场返回原因，不等到渲染阶段才失败。

## 快速开始

```bash
pnpm add manim-live
```

```ts
import { createManimRenderer } from 'manim-live'
import 'manim-live/style.css' // 可选：仅修正 canvas 的基线间隙

const renderer = createManimRenderer() // 不传 pyodideIndexURL 则用官方 CDN
await renderer.warmup() // 可选：提前拉取 Pyodide，避免首次渲染时才下载

const check = await renderer.check(python) // 干跑预检
if (!check.ok) throw new Error(check.error)

const surface = await renderer.createSurface(document.querySelector('#stage')!)
const result = await surface.run(python) // 一次一段，独立执行
surface.dispose() // 真实释放 WASM / WebGL
```

Node 侧预检（不碰 DOM，可进 CI）：

```ts
import { runPython, createDryRunBridge } from 'manim-live/node'

await runPython(python, createDryRunBridge())
```

每一步省掉会怎样、各框架的挂载与清理写法，见文档的[快速开始](https://snowowowo.github.io/manim-live/guide/quick-start)与[框架集成](https://snowowowo.github.io/manim-live/guide/frameworks)。

## 行为契约

1. **页面级单例**：WASM 运行时与串行执行队列全页共用；同时挂两个组件不会启两份 Pyodide 运行时，但渲染是串行的。
2. **真实释放**：`dispose()` 销毁 WASM 与 WebGL 上下文；SPA 路由切换时不释放即内存泄漏。
3. **单段独立执行**：`surface.run(code)` 不跨次保留变量；多段需共享变量时由调用方拼成一段。

## 资源与许可

包本体 MIT，只含逻辑；运行所需的两项静态资源不随包分发，由 URL 指定：

- **Pyodide**（核心约 13 MB，另含 numpy 与 sympy 约 7 MB）：`pyodideIndexURL`，官方 CDN 或自托管皆可；Pyodide 依 MPL-2.0 授权，自托管时须随附其 LICENSE。
- **KaTeX** 的样式与字体：`katexBaseURL`。

代码里 `import pandas` / `matplotlib` 等第三方包的按需获取与失败时的分档诊断，见文档的[第三方包](https://snowowowo.github.io/manim-live/guide/packages)。

## 开发

```bash
pnpm install
pnpm build             # tsdown → dist（ESM + .d.ts）
pnpm test              # 语料回归 + headless 真场景 + 支持面门禁
pnpm typecheck
pnpm playground        # 本地演示台（真浏览器验证台）
pnpm docs              # 文档站本地预览（docs/ 独立依赖图）
```

语料（`corpus/examples/`）既是回归网，也是真机测试台的唯一输入；`node scripts/shot-corpus.mjs` 用真 Chromium 逐条渲染落图。

## 职责边界

它是**一块画布 + 一个运行时**，职责是「把 Manim Python 渲染成一幅画面」；卡片 UI、播放头、分步旁白、本机导出 mp4 均由使用者实现。DSH 插件 `dsh-manim-live` 是它的消费者之一。

MIT licensed · Manim 与 Pyodide 各依其自身许可。
