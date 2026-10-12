# 安装

本页覆盖三件事：安装命令、两项外部资源、浏览器要求。包本身是什么、适合什么场景，见[概述](/guide/overview)。

```bash
pnpm add manim-live
```

包是纯 ESM（`exports` 里只有 `import`），需要一个能解析 `node_modules` 的 bundler，vite、webpack、rspack 均可。`manim-web` 在 `dependencies` 里、会随包安装，但**不会被打进本包产物**——留给使用者的 bundler 解析，便于 tree-shaking 与缓存。

::: tip 包内只有逻辑
`files` 白名单是 `dist`、`style.css`、`README.md`、`LICENSE`。运行所需的静态资源一律不随包分发，见下面两节。
:::

## 外部资源

### Pyodide

核心约 13 MB，随包的 numpy 与 sympy 另约 7 MB。由 `createManimRenderer` 的 `pyodideIndexURL` 指向，不传则用官方 CDN。离线或自托管时传自己的地址，两点注意：

- Pyodide 本体与按需第三方包（pandas、matplotlib 等）读**同一个地址**，并按 `pyodide-lock.json` 的 sha256 做 SRI 校验——地址下缺哪个文件，对应的 `import` 就取不到。自托管的完整做法见[第三方包](/guide/packages)。
- Pyodide 依 **MPL-2.0** 授权：走 CDN 时本包不是分发方；自托管时须随附其 LICENSE 并注明源码位置。

### KaTeX

`MathTex` 渲染成 KaTeX HTML 之后需要样式才看得对，CSS 与字体由 `katexBaseURL` 指向。不传则不碰 DOM；代码里不用公式文字时可以完全不配置。

## 浏览器要求

需要支持 WebAssembly 与 WebGL 的现代浏览器：Pyodide 跑 WASM，manim-web 用 three.js 渲染。没有 DOM 的环境（Node）走 `manim-live/node` 入口，只支持干跑预检，见 [Node 预检](/guide/node)。

能力、运行时、KaTeX、取包四组条件的就绪状态与可订阅的变化，见[环境状态](/api/status)。

## 下一步

- 约二十行代码渲染出第一幅画面 → [快速开始](/guide/quick-start)
- 原生 JS / React / Vue 的挂载与清理 → [框架集成](/guide/frameworks)
- 多实例、释放、单段执行三条约定 → [行为契约](/guide/contracts)
