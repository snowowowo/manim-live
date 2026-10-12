# API 参考：环境状态

两个模块级函数：把「决定能不能出画面」的四组运行期条件——浏览器能力、Pyodide 运行时、KaTeX 样式、按需取包——读成一个快照或订阅它的变化。与[钩子](/api/hooks)的差别在于挂载点：钩子挂在**调用**上、服务单次调用；环境状态挂在**模块**上、服务全页的状态 UI 与诊断面板。只在浏览器入口提供。

## environmentStatus()

当前环境状态的快照。不发起任何加载或探测请求，只读已经发生的状态。

```ts
function environmentStatus(): EnvironmentStatus

interface EnvironmentStatus {
  capabilities: { wasm: boolean; webgl: boolean; mediaRecorder: boolean }
  runtime: { phase: 'idle' | 'loading' | 'ready' | 'error'; error?: string; indexURL: string | null }
  katex: { baseURL: string | null; phase: 'unconfigured' | 'loading' | 'loaded' | 'error'; error?: string }
  packages: { fetching: string[]; lastError?: string }
  hints: string[]
}
```

**返回** 各字段含义：

| 字段 | 含义 |
| --- | --- |
| `capabilities.wasm` | 浏览器是否支持 WebAssembly（Pyodide 启动的前提） |
| `capabilities.webgl` | 能否取得 WebGL 上下文（manim-web 出画面的前提） |
| `capabilities.mediaRecorder` | browser-recorder 导出是否可用；缺它只影响导出，不影响渲染 |
| `runtime.phase` | Pyodide 运行时生命周期：未加载 / 加载中 / 就绪 / 失败 |
| `runtime.error` | `phase` 为 `error` 时的失败原文 |
| `runtime.indexURL` | 当前登记的 Pyodide 取数根；从未安装加载器时为 `null` |
| `katex.phase` | KaTeX 样式：未配置 / 加载中 / 已加载 / 加载失败 |
| `packages.fetching` | 正在取的包名；不在取包时是空数组 |
| `packages.lastError` | 最近一次取包失败的人话原因（含分档诊断的结论） |
| `hints` | 每个未满足项一句可执行的话；全满足时是空数组 |

**例子**

```ts
import { environmentStatus } from 'manim-live'

const status = environmentStatus()
if (status.hints.length > 0) showBanner(status.hints)
```

**注意**

- 快照不代替动作：提前拉运行时用 `warmup()`，预检代码用 `check()`。
- 能力探测只算一次并缓存。Node / SSR 里 `document` 缺席，`webgl` 恒为 `false`，且能力类 hint 不会念出——那不是渲染环境。
- `hints` 只放硬性未满足项（缺能力、运行时或 KaTeX 加载失败、取包失败）。「KaTeX 未配置」是配置选择，只在 `check()` 的 `warnings` 里出声。

## onEnvironmentStatus(cb)

订阅环境状态变化：运行时阶段、KaTeX 加载结果、取包进展任一变动都播一次最新快照。返回退订函数。

```ts
function onEnvironmentStatus(cb: (status: EnvironmentStatus) => void): () => void
```

**参数** `cb`：收到最新快照。回调自己抛错时核心用 `console.error` 记一条，不影响其余订阅者。

**返回** `() => void`：退订。SPA 路由切换时记得调用。

**例子**

```ts
const unsubscribe = onEnvironmentStatus((status) => {
  setChips(status) // 状态 UI 由使用者自备
  if (status.packages.fetching.length > 0) showLoading(status.packages.fetching)
})

unsubscribe()
```

**注意**

- 播报是同步的：回调在与状态迁移同一次同步流程里被调用，不要在回调里做重活。
- 与 per-call 的 `onLoading` 并存且不冲突：那个挂在调用上、给单张卡片用；这个挂在模块上、给全页用。
