# manim-live

在浏览器里用**真 Python** 跑 Manim 代码并渲出一幅画面。

纯逻辑：零 UI、零框架、零宿主、零本地 Manim。可以在 React / Vue / 原生 JS 里直接用；
DSH 插件 `dsh-manim-live` 只是它的消费者之一。

```
AI 写 Manim Python
      │
      ▼
  Pyodide（真 CPython + 真 numpy）
      │
      ▼
  manim 适配层（shim：把 Manim CE 写法翻译成 manim-web 调用）
      │
      ▼
  桥（bridge：JS 句柄与 Python 对象互指）
      │
      ▼
  manim-web 场景（WebGL / three.js）
```

## 安装

```bash
pnpm add manim-live
```

`manim-web` 会随包一起装上（它在 `dependencies` 里），但**不会被打进本包产物**——
留给使用者自己的 bundler 解析，便于 tree-shaking 与缓存。

## 快速开始

```ts
import { createManimRenderer } from 'manim-live'
import 'manim-live/style.css' // 可选：只修 canvas 的基线间隙

const renderer = createManimRenderer({
  pyodideIndexURL: '/pyodide/', // 不给则用官方 CDN
  katexBaseURL: '/katex/',      // MathTex 的样式与字体
})

await renderer.warmup()               // 可选：提前拉 Pyodide（约 20 MB），别等第一次点渲染才卡

const check = await renderer.check(python)      // 干跑预检：语法 / 未定义名 / 不支持项
if (!check.ok) throw new Error(check.error)

const surface = await renderer.createSurface(document.querySelector('#stage')!)
const result = await surface.run(python)        // 一次一段，独立执行
surface.dispose()                                // 真的释放 WASM / WebGL
```

### Node（无 DOM）

```ts
import { runPython, createDryRunBridge } from 'manim-live/node'

await runPython(python, createDryRunBridge()) // 干跑预检，不碰 DOM
```

## 契约（要知道的三条）

1. **多实例**：WASM 运行时与串行执行队列是**页面级单例**——同时挂两个组件不会启两份 20 MB 的 WASM，但它们的渲染是串行的。
2. **销毁**：`surface.dispose()` / `renderer.dispose()` 会真的释放 WASM 与 WebGL 上下文；SPA 路由切换不销毁就是内存泄漏。
3. **执行上下文**：`surface.run(code)` 是**单段独立执行**，变量不跨次保留。同一块画布要连续跑多段共享变量，需自己在调用方拼成一段。

## 资源与许可

本包只含逻辑（MIT）。它**不含**运行所需的静态资源：

- **Pyodide**（约 20 MB，含 numpy / sympy）——由 `pyodideIndexURL` 指向，官方 CDN 或自托管皆可。
  Pyodide 依 **MPL-2.0** 授权：走 CDN 时我们不是分发方；自托管时须随附其 LICENSE 并告知源码位置。
- **KaTeX** 的 CSS 与字体——由 `katexBaseURL` 指向。

## 开发

```bash
pnpm install
pnpm build          # tsdown → dist（ESM + .d.ts）
pnpm test           # 语料回归 + headless 真场景 + 支持面门禁
pnpm playground     # 零框架 playground（vite）——真浏览器验证台
```

语料（`_dev/examples/`）既是回归网，也是**唯一的真机测试台输入**；
`scripts/shot-corpus.mjs` 用真 Chromium 逐条渲染落图。

> 有一类 bug 只在真浏览器存在（KaTeX 字形、真 WebGL、真 DOM），`pnpm test` 绿不代表没坏——
> 这类必须走 playground 真机核。**3D 尤其属这一类。**

## 这是什么，不是什么

它是**一块画布 + 一个运行时**：给「把 Manim Python 渲成一幅画」这件事。
卡片 UI、播放头、分步旁白、本机导出 mp4——都不是它的事，那些属于使用者。
