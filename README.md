# manim-live

在浏览器里用**真实 Python** 执行 Manim 代码并渲染出画面。

> 📖 文档（安装 / 各框架用法 / 示例画廊 / API）：仓根 `pnpm docs` 本地预览；
> 线上地址 <https://snowowowo.github.io/manim-live/>。

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
import 'manim-live/style.css' // 可选：仅修正 canvas 的基线间隙

const renderer = createManimRenderer({
  pyodideIndexURL: '/pyodide/', // 不给则用官方 CDN
  katexBaseURL: '/katex/',      // MathTex 的样式与字体
})

await renderer.warmup()               // 可选：提前拉取 Pyodide（核心约 13 MB），避免第一次渲染时才开始下载

const check = await renderer.check(python)      // 干跑预检：语法 / 未定义名 / 不支持项
if (!check.ok) throw new Error(check.error)

const surface = await renderer.createSurface(document.querySelector('#stage')!)
const result = await surface.run(python)        // 一次一段，独立执行
surface.dispose()                                // 真实释放 WASM / WebGL
```

### Node（无 DOM）

```ts
import { runPython, createDryRunBridge } from 'manim-live/node'

await runPython(python, createDryRunBridge()) // 干跑预检，不依赖 DOM
```

## 行为契约（三条）

1. **多实例**：WASM 运行时与串行执行队列是**页面级单例**——同时挂两个组件不会启两份 Pyodide 运行时（核心约 13 MB），但它们的渲染是串行的。
2. **销毁**：`surface.dispose()` / `renderer.dispose()` 会真实释放 WASM 与 WebGL 上下文；SPA 路由切换时不销毁即内存泄漏。
3. **执行上下文**：`surface.run(code)` 是**单段独立执行**，变量不跨次保留。同一块画布需连续执行多段共享变量的代码时，由调用方拼成一段。

## 资源与许可

本包只含逻辑（MIT）。它**不含**运行所需的静态资源：

- **Pyodide**（核心约 13 MB，另含 numpy 与 sympy 约 7 MB）——由 `pyodideIndexURL` 指向，官方 CDN 或自托管皆可。
  Pyodide 依 **MPL-2.0** 授权：经由 CDN 时本包不是分发方；自托管时须随附其 LICENSE 并注明源码位置。
- **KaTeX** 的 CSS 与字体——由 `katexBaseURL` 指向。

### 第三方包的来源与缓存位置

语料中有若干条需要 `import pandas` / `matplotlib` / `scipy` / `sklearn`（`corpus/examples/net`、`combo`）。

以下事实取自 `pyodide.asm.js` 源码：浏览器侧获取一个按需包的过程是

```js
fetch(new URL(file_name, indexURL), { integrity: 'sha256-' + base16ToBase64(pkg.sha256) })
```

——地址**只有 `indexURL` 一个，不会回落到官方 CDN**（该回落只写在 Node 分支里）。因此该地址下
不存在的文件，表现为一句 `TypeError: Failed to fetch`（带 SRI 的 fetch 遇到 404 空 body），
与「网络不通」抛出的是同一句信息。三种环境各自把 wheel 放进该地址的方式：

| 环境 | 谁把 wheel 放进 `indexURL` | 缓存落在哪 |
| --- | --- | --- |
| 官方 CDN（默认值） | 无需处理，CDN 本身即完整 | 浏览器 HTTP 缓存 |
| DSH 插件自托管 | Host 路由代取：随包目录 → `~/.dsh/cache/manim-live/pyodide` → jsdelivr | 两层（宿主目录 + 浏览器） |
| playground 开发期 | vite 中间件代取：`assets/pyodide` → `corpus/pyodide-cache` → jsdelivr | 两层（同上，目录在仓内且已 gitignore） |

三处是**同一条口径**：按 `pyodide-lock.json` 的 sha256 校验后才落盘；名字不在登记表里的明确 404，
不静默降级。net + combo 整条闭包 19 个 wheel 加 1 个 openblas 压缩包、合计约 73 MB，获取一次即可，之后离线也能运行。

取包失败时核心包会给出分档的明确原因，而不只是一句 `Failed to fetch`：

```
取不到代码里 import 的库（pandas）：Failed to fetch。真因多半不是网络：/pyodide/ 下没有
pandas-2.2.3-…whl 这些文件——这个地址是静态目录，里面有什么就只能取什么……
```

分档逻辑位于 `src/engine/pyodide.ts` 的 `diagnosePackageNames`（缺文件 / 无法连接 / 代取的一端自身报错 /
字节与 sha256 不符），接入点是 `setPackageDiagnoser`；未接入时退回一句通用建议。

## 开发

```bash
pnpm install
pnpm build          # tsdown → dist（ESM + .d.ts）
pnpm test           # 语料回归 + headless 真场景 + 支持面门禁
pnpm typecheck      # tsc --noEmit（含 playground/ 的 TS 与 TSX）
pnpm playground     # 本地演示台（vite）——真浏览器验证台
pnpm check:playground # 真机烟测：启动 vite → 无头 Chromium → 断言画布非空 / 版式复用画布 / 点击响应
pnpm docs:dev       # 文档站本地预览（docs/，**独立依赖图**：那目录里只装 vitepress）
pnpm docs:build     # 文档站构建 → docs/.vitepress/dist/（GitHub Pages 用）
```

语料（`corpus/examples/`）既是回归网，也是**唯一的真机测试台输入**；
`scripts/shot-corpus.mjs` 用真 Chromium 逐条渲染落图。

### 演示台（playground）

`playground/` 是本仓**唯一的**消费者界面（不属于库，`files` 白名单里没有它）。
三种版式——**清单**（对齐 DSH 实验场那一版）/ **平铺** / **文档**——共用一套状态与**同一块活动画布**：
切换版式只改变排列方式，已执行、已标记与正在执行的条目完全不变。

它使用 **React 19 + Tailwind v4 + shadcn 风格组件**编写。**这与「本包框架无关」不冲突**——
框架无关指的是本包的性质：

1. 本包的 `src/` 里**没有一行 React / Vue / 框架导入**，`exports` 也不提供任何框架绑定入口；
2. **同一套能力被两个完全不同的消费者走通**——DSH 插件（React + 宿主槽位）与这个 playground
   （React + vite，无宿主），两份 UI 各自实现，共用的只有 `src/`。

> 有一类缺陷只在真实浏览器中出现（KaTeX 字形、WebGL、DOM），`pnpm test` 通过不代表没有这类问题——
> 它们必须在演示台上真机核对，**3D 尤其属于这一类**。
> 另一类是**时序问题**——例如「从点击到出现画面耗时 63 秒」「第二次渲染叠加在第一幅之上」，
> `pnpm test` 与类型检查**全绿时依然存在**，只有在真机执行并**测量时间与画面墨迹**才能发现。
> `pnpm check:playground` 即为这两类设立。

## 职责边界

它是**一块画布 + 一个运行时**，职责是「把 Manim Python 渲染成一幅画面」。
卡片 UI、播放头、分步旁白、本机导出 mp4 均不在其职责内，由使用者实现。
