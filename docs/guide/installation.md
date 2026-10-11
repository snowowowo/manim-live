# 安装

```bash
pnpm add manim-live
```

纯 ESM（`exports` 里只有 `import`），要有能解析 `node_modules` 的 bundler（vite / webpack /
rspack 都行）。`manim-web` 会随包一起装上（它在 `dependencies` 里），但**不会被打进本包产物**——
留给使用者自己的 bundler 解析，便于 tree-shaking 与缓存。

::: tip 本包只含逻辑
`files` 白名单是 `dist`、`style.css`、`README.md`、`LICENSE`。运行所需的**静态资源一概不随包**，
见下面两小节。
:::

## 两样外部资源

### Pyodide（约 13 MB 核心，含 numpy / sympy）

由 `createManimRenderer` 的 `pyodideIndexURL` 指向。**不给就用官方 CDN**（默认值）；
要离线 / 自托管就传自己的地址，同时注意：

- Pyodide 的「本体」与「按需第三方包」（pandas / matplotlib 这些）读的是**同一个地址**，
  而且按 `pyodide-lock.json` 的 sha256 做 SRI 校验——地址下缺哪个文件，对应 import 就取不到。
  自托管的完整做法见[第三方包从哪来](/guide/packages)。
- Pyodide 依 **MPL-2.0** 授权：走 CDN 时我们不是分发方；自托管时须随附其 LICENSE 并告知源码位置。

### KaTeX 的 CSS 与字体

由 `katexBaseURL` 指向（`MathTex` 渲成 KaTeX HTML 后要有样式才看得对）。
不给就不碰 DOM——如果你的代码不用公式文字，可以完全不配。

## 浏览器要求

需要支持 **WebAssembly 与 WebGL** 的现代浏览器（Pyodide 跑 WASM，manim-web 用 three.js 渲染）。
没有 DOM 的环境（Node）走 `manim-live/node` 入口，只能干跑预检，见[专门一页](/guide/node)。

## 下一步

- [快速开始](/guide/quick-start)——二十行跑出第一幅画面
- [在各框架里用](/guide/frameworks)——原生 JS / React / Vue
- [必须知道的三条契约](/guide/contracts)——多实例、销毁、单段执行
