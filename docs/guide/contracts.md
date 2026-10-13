# 行为契约

本页列出集成前必须知道的四条行为约定与一个已知问题，五者都直接决定集成写法。前两条同样写在源码 `src/index.ts` 的文件头；各方法的参数与例子见 [API 参考](/api/)。

## 页面级单例

WASM 运行时与串行执行队列是**页面级单例**。同一页面挂载两个组件**不会**启动两份 Pyodide 运行时（核心约 13 MB）；但它们的渲染**排入同一队列、串行执行**——这是设计使然：单个 WASM 解释器无法并发执行两段 Python。

对 UI 的含义：不存在两个画布同时处于「播放中」状态，后发起的会等待先前的执行完毕。

## 真实释放

`surface.dispose()` 与 `renderer.dispose()` 会销毁 WASM 与 WebGL 上下文。SPA 路由切换不会自动销毁；不调用即泄漏整个解释器与一个 WebGL context，反复数次后页面将不可用。

因此框架集成中**清理函数必须执行实际释放**（React StrictMode 会故意将 effect 执行两遍以检查此事，见[框架集成](/guide/frameworks)）。

`renderer.dispose()` 会同时销毁它创建过的**所有**画布，并移除自己注入的 KaTeX 样式表。

## 单段独立执行

`surface.run(code)` 一次执行一段，**变量不跨次保留**（每次都是新的 Python 命名空间）。如需连续执行多段共享变量的代码，应在调用方将其拼接为一段再 `run()`。

`RunResult` 共三个字段，其一专用于「作废」：

```ts
interface RunResult {
  ok: boolean
  error?: string
  /** 该段运行已作废（画布在轮到它之前被销毁）：不是错误，调用方不应显示任何内容。 */
  cancelled?: boolean
}
```

`cancelled === true` 时**不要**向用户展示 `error`——那不是错误，而是该段代码尚未轮到执行、其所属画布已被销毁（快速连续点击、切换页面均属此场景）。

## 代码形态：完整文件、裸 construct 体、会话分段

传给核心的 Python 有三种形态，落在**两个入口**上——先记住这张表：

| 形态 | 长什么样 | 传给谁 | 核心怎么处理 |
| --- | --- | --- | --- |
| **完整 Manim 文件**（默认） | `from manim import *` + `class X(Scene): def construct(self): …` | `surface.run(code)`、`surface.createPlayback(code)`、`runPython(code, bridge)`（含 Node 干跑预检） | 原样执行；漏了 `from manim import *` 会自动补一行 |
| **裸 construct 体**（简写） | 直接写构造体里的语句：`ax = Axes(…)`、`self.play(…)` | 同上——**同一个参数、同一个入口** | 自动缩进并套进 `class _ManimScene(Scene): def construct(self):` 外壳；报错行号按外壳行数还原 |
| **分段（一段一段）** | 顶层语句，一段一次调用 | **只有会话**：`session.append(code)` / `session.check(code)` | 不套 class 外壳：命名空间跨段保留、`self` 绑定常驻场景、顶层 `play` 自动补 await；每段必须**语法完整** |

两条口径，记住就够：

1. **默认写完整文件。** 裸 construct 体是合法简写（核心按「源码里有没有 `class X(` 定义」自动分辨；只认有没有类定义，不猜基类名），但公开示例、文档、给别人看的代码一律用完整文件。
2. **一段一段只属于会话。** 会话是黑板那种「边讲边加」的形态（见[会话](/api/session)）；`run` / `createPlayback` 每次都收**一整段**、一次跑完。不用会话却要跨段共享变量，就得自己拼成一整段再传（见[单段独立执行](#单段独立执行)）。

纯 Python 片段（不驱动场景，例如只做一次干跑校验）另有一条窄路：`runPython(code, bridge, { drive: false })`——不做上面那套包装。

## 复用画布的已知问题

「同一块画布，先画一个圆、再画一个方块」——直觉做法是调用两次 `run()`，或先 `self.clear()`。**两种做法均存在问题**，且只有真机才能观察到：

- 调用两次 `run()`：第二次的画面**叠加**在第一次之上（场景未清场，`self.add()` 继续追加）；
- `self.clear()`：manim 的 `clear()` 会**连同 3D 灯光一并移除**，此后的画面为黑色。

以上均为实测行为。正确做法是**每次重绘都更换一块新画布**：

```ts
surface.dispose()
surface = await renderer.createSurface(container)
await surface.run(code)
```

`surface.replay()` 即是该语义的现成封装：作废当前画布 → 创建一块新的 → 将上一段代码从头完整播放一遍。

::: warning 录屏与 replay 的次序
`replay()` 会更换 canvas 元素。若先 `captureStream()` 再 `replay()`，录制流仍留在已被丢弃的旧画布上——录制结果为空文件，且**整个过程不抛出任何错误**。应先创建新画布再开始录制；内置的 `browserRecorder` 已按此顺序处理。
:::
