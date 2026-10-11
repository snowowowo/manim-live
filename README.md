# manim-live

在浏览器里用**真 Python** 跑 Manim 代码并渲出一幅画面。

> 📖 文档（安装 / 各框架用法 / 示例画廊 / API）：`docs/` 目录，`pnpm docs:dev` 本地预览；
> 线上地址 <https://snowowowo.github.io/manim-live/>（待 Pages 开通后生效）。

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

### 第三方包从哪来、缓存在哪

语料里有几条要 `import pandas` / `matplotlib` / `scipy` / `sklearn` 的（`_dev/examples/net`、`combo`）。

先记一条硬事实（读 `pyodide.asm.js` 得来，不是猜）：浏览器侧取一个按需包就是

```js
fetch(new URL(file_name, indexURL), { integrity: 'sha256-' + base16ToBase64(pkg.sha256) })
```

——地址**只有 `indexURL` 一个，不会回落官方 CDN**（那条回落只写在 Node 分支里）。于是那个地址下
没有的文件，表现是一句 `TypeError: Failed to fetch`（带 SRI 的 fetch 撞上 404 空 body），
与「网络不通」抛的是同一句话。三种环境各自把这些 wheel 弄进去的办法：

| 环境 | 谁把 wheel 放进 `indexURL` | 缓存落在哪 |
| --- | --- | --- |
| 官方 CDN（默认值） | 不用管，CDN 本身就是全的 | 浏览器 HTTP 缓存 |
| DSH 插件自托管 | Host 路由代取：随包目录 → `~/.dsh/cache/manim-live/pyodide` → jsdelivr | 两层（宿主目录 + 浏览器） |
| playground 开发期 | vite 中间件代取：`assets/pyodide` → `_dev/pyodide-cache` → jsdelivr | 两层（同上，目录在仓内且已 gitignore） |

三处是**同一条口径**：按 `pyodide-lock.json` 的 sha256 校验后才落盘；名字不在登记表里的明确 404，
不静默降级。net + combo 整条闭包 20 个 wheel / 41.3 MB，取一遍就够，之后离线也能跑。

取包失败时不必再对着 `Failed to fetch` 猜——核心包会给一句分档的实话：

```
取不到代码里 import 的库（pandas）：Failed to fetch。真因多半不是网络：/pyodide/ 下没有
pandas-2.2.3-…whl 这些文件——这个地址是静态目录，里面有什么就只能取什么……
```

分档逻辑在 `src/engine/pyodide.ts` 的 `diagnosePackageNames`（缺文件 / 连不上 / 代取那头自己报了错 /
字节与 sha256 对不上），装进来的是 `setPackageDiagnoser` 这个接缝，不装就退回一句通用建议。

## 开发

```bash
pnpm install
pnpm build          # tsdown → dist（ESM + .d.ts）
pnpm test           # 语料回归 + headless 真场景 + 支持面门禁
pnpm typecheck      # tsc --noEmit（含 playground/ 的 TS 与 TSX）
pnpm playground     # 浏览 / 演示台（vite）——真浏览器验证台
pnpm check:playground # 真机烟测：起 vite → 无头 Chromium → 断言画布非空 / 版式复用画布 / 点击响应
pnpm docs:dev       # 文档站本地预览（docs/，**独立依赖图**：那目录里只装 vitepress）
pnpm docs:build     # 文档站构建 → docs/.vitepress/dist/（GitHub Pages 用）
```

语料（`_dev/examples/`）既是回归网，也是**唯一的真机测试台输入**；
`scripts/shot-corpus.mjs` 用真 Chromium 逐条渲染落图。

### playground 是什么

`playground/` 是这一页**唯一的**消费者界面（不是库的一部分，`files` 白名单里没有它）。
三种版式——**清单**（对齐 DSH 实验场那一版）/ **平铺** / **文档**——共用一套状态与**同一块活画布**：
切版式只换摆法，跑过哪几条、标过哪几条、正在跑哪条，一个字都不变。

它用 **React 19 + Tailwind v4 + shadcn 风格组件**写。**这与「本包框架无关」不冲突**——
框架无关是本包的性质：

1. 本包的 `src/` 里**没有一行 React / Vue / 框架导入**，`exports` 也不提供任何框架绑定入口；
2. **同一套能力被两个完全不同的消费者走通**——DSH 插件（React + 宿主槽位）与这个 playground
   （React + vite，无宿主），两份 UI **各写各的**，共用的只有 `src/`。

> 有一类 bug 只在真浏览器存在（KaTeX 字形、真 WebGL、真 DOM），`pnpm test` 绿不代表没坏——
> 这类必须走 playground 真机核。**3D 尤其属这一类。**
> 那种 bug 还有一个变种：**时序类**——「点下去到看见画面花了 63 秒」「第二次渲染叠在第一幅上」
> 这类，`pnpm test` 与类型检查**全绿也照样存在**，只有真机跑一遍并**量时间 / 量墨迹**才抓得到。
> `pnpm check:playground` 就是为这一类立的。

## 这是什么，不是什么

它是**一块画布 + 一个运行时**：给「把 Manim Python 渲成一幅画」这件事。
卡片 UI、播放头、分步旁白、本机导出 mp4——都不是它的事，那些属于使用者。
