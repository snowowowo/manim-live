# 安装

```bash
pnpm add manim-live
```

纯 ESM（`exports` 中只有 `import`），需要能解析 `node_modules` 的 bundler（vite / webpack /
rspack 均可）。`manim-web` 会随包一起安装（位于 `dependencies` 中），但**不会被打进本包产物**——
留给使用者的 bundler 解析，便于 tree-shaking 与缓存。

::: tip 本包只含逻辑
`files` 白名单为 `dist`、`style.css`、`README.md`、`LICENSE`。运行所需的**静态资源均不随包分发**，
见以下两小节。
:::

## 两项外部资源

### Pyodide（约 13 MB 核心，含 numpy / sympy）

由 `createManimRenderer` 的 `pyodideIndexURL` 指向。**不传则使用官方 CDN**（默认值）；
离线 / 自托管场景传入自己的地址，并注意：

- Pyodide 的「本体」与「按需第三方包」（pandas / matplotlib 等）读取**同一个地址**，
  且按 `pyodide-lock.json` 的 sha256 做 SRI 校验——地址下缺少哪个文件，对应的 import 即取不到。
  自托管的完整做法见[第三方包从哪来](/guide/packages)。
- Pyodide 依 **MPL-2.0** 授权：走 CDN 时本包不是分发方；自托管时须随附其 LICENSE 并注明源码位置。

### KaTeX 的 CSS 与字体

由 `katexBaseURL` 指向（`MathTex` 渲染为 KaTeX HTML 后需要样式才能正确显示）。
不传则不操作 DOM——如代码不使用公式文字，可以完全不配置。

## 浏览器要求

需要支持 **WebAssembly 与 WebGL** 的现代浏览器（Pyodide 运行 WASM，manim-web 使用 three.js 渲染）。
没有 DOM 的环境（Node）走 `manim-live/node` 入口，仅支持干跑预检，见[专门一页](/guide/node)。

## 下一步

- [快速开始](/guide/quick-start)——约二十行代码渲染出第一幅画面
- [在各框架里用](/guide/frameworks)——原生 JS / React / Vue
- [必须知道的三条契约](/guide/contracts)——多实例、销毁、单段执行
