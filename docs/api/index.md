# API 参考：总览与入口

`manim-live` 的全部公开接口按对象分成八页：本页讲对象关系与入口工厂，其余各页讲一个对象的全部成员。每个成员给出类型定义、参数说明、返回值与可直接抄的例子。浏览器入口是 `manim-live`，不碰 DOM 的入口是 `manim-live/node`。第一次上手看[快速开始](/guide/quick-start)，集成前必须知道的行为约定看[行为契约](/guide/contracts)。

| 页 | 内容 |
| --- | --- |
| [渲染器](/api/renderer) | `warmup` / `check` / `createSurface` / `exporters` / `pyodideIndexURL` / `dispose` |
| [画布](/api/surface) | `run` / `replay` / `canvas` / `isRendered` / `dispose`，以及重画一幅新内容的正确做法 |
| [钩子](/api/hooks) | `onLoading` / `onProgress` / `signal` |
| [导出](/api/export) | `Exporter` 契约、`probe` / `run`、内置录屏的三条边界 |
| [Node 入口](/api/node) | 不碰 DOM 的那一半：干跑预检与语料装载 |
| [语料与测试台](/api/corpus) | 语料格式函数与判定 / 统计 / 报告 |
| [低层导出](/api/internals) | 实现零件，以及当前版本不提供的能力 |

## 对象关系

一切从 `createManimRenderer()` 开始。它是包唯一的入口工厂，下面这棵树就是使用者能拿到的全部：

```
createManimRenderer(options)          → ManimRenderer        一个页面通常一个
├─ warmup()                           → Promise<void>
├─ check(python)                      → Promise<CheckResult>
├─ createSurface(container, options)  → Promise<Surface>     一块画布一个
│  ├─ run(code, handlers)             → Promise<RunResult>
│  ├─ replay()                        → Promise<void>
│  ├─ canvas()                        → HTMLCanvasElement | null
│  ├─ isRendered()                    → boolean
│  └─ dispose()                       → void
├─ exporters                          → readonly Exporter[]  属性，不是方法
│  └─ 每个 Exporter
│     ├─ id                           → string
│     ├─ label                        → string
│     ├─ probe()                      → Promise<{ ready, missing? }>
│     └─ run(request, signal)         → Promise<ExportResult>
├─ pyodideIndexURL()                  → string
└─ dispose()                          → void
```

三点读图说明：

- `Surface` 只能从渲染器上拿到（`createSurface()`），不能单独构造；`Exporter` 从 `renderer.exporters` 上取，自带的那个始终在列表最前。
- 渲染器上除 `exporters` 是数组属性，其余都是方法；`Surface` 的五个成员全是方法，没有属性。
- 状态不挂在对象属性上：一次运行的结论在 `run()` 的返回值里，画布有没有画面靠 `isRendered()` 查，过程信息只有 `onLoading` 这一个回调。

## createManimRenderer(options?)

包唯一的入口工厂，创建一个渲染器。一个页面通常只需要一个实例：多个实例共享同一个页面级运行时与执行队列。

```ts
function createManimRenderer(options?: ManimRendererOptions): ManimRenderer
```

**参数** `options`，四个字段全部可选：

| 字段 | 类型 | 默认 | 作用 | 不传的后果 |
| --- | --- | --- | --- | --- |
| `pyodideIndexURL` | `string` | 官方 CDN | Pyodide 本体与按需第三方包的取数根，两者共用这一个地址，按 `pyodide-lock.json` 的 sha256 校验 | 走公网 CDN；内网或离线环境取不到运行时 |
| `katexBaseURL` | `string` | 不注入 | `katex.min.css` 与字体所在目录，给了就注入一个 `<link>`（按 URL 去重） | 完全不碰 DOM；`MathTex` 排出的公式没有样式 |
| `onLoading` | `(names: string[]) => void` | 无 | 按 `import` 取包时的进展回调，见[钩子](/api/hooks) | 界面上没有「正在取包」提示 |
| `exporters` | `Exporter[]` | 空 | 追加导出接入者，排在自带录屏之后，见[导出](/api/export) | 只有自带的浏览器录屏可用 |

**返回** `ManimRenderer`，六个成员的用法见[渲染器](/api/renderer)。

**例子**

```ts
import { createManimRenderer } from 'manim-live'
import 'manim-live/style.css'   // 可选：只修正 canvas 的基线间隙

const renderer = createManimRenderer({
  katexBaseURL: '/assets/katex/',
  onLoading: (names) => console.log(names.length > 0 ? `取包：${names.join('、')}` : '取包结束'),
})
```

**注意**

- 返回时就已经装好了 Pyodide 加载器，不等 `createSurface()`——因为 `check()` 可能在任何画布之前被调用。
- 创建不会开始下载运行时，下载发生在 `warmup()` 或第一次 `run()`。
