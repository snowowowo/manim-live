# 必须知道的三条契约

以下三条契约也写在源码 `src/index.ts` 的文件头。在 SPA 中集成本包前应先了解，否则极易遇到相关问题。

## 一、多实例是页面级单例

WASM 运行时与串行执行队列是**页面级单例**。同一页面挂载两个组件**不会**启动两份 20 MB 的
WASM；但它们的渲染**排入同一队列、串行执行**——这是设计使然：单个 WASM 解释器无法并发执行
两段 Python。

对 UI 的含义：不存在两个画布同时处于「播放中」状态，后发起的会等待先前的执行完毕。

## 二、dispose() 是真实释放

`surface.dispose()` / `renderer.dispose()` 会销毁 WASM 与 WebGL 上下文。SPA 路由切换
不会自动销毁；不调用即泄漏整个解释器与一个 WebGL context，反复数次后页面将不可用。

因此框架集成中**清理函数必须执行实际释放**（React StrictMode 会故意将 effect 执行两遍
以检查此事，见[各框架一页](/guide/frameworks#strictmode-会把-effect-跑两遍)）。

`renderer.dispose()` 会同时销毁它创建过的**所有**画布，并移除自己注入的 KaTeX 样式表。

## 三、run() 是单段独立执行

`surface.run(code)` 一次执行一段，**变量不跨次保留**（每次都是新的 Python 命名空间）。
如需连续执行多段共享变量的代码，应在调用方将其拼接为一段再 `run()`。

`RunResult` 共三个字段，其一专用于「作废」：

```ts
interface RunResult {
  ok: boolean
  error?: string
  /** 该段运行已作废（画布在轮到它之前被销毁）：不是错误，调用方不应显示任何内容。 */
  cancelled?: boolean
}
```

`cancelled === true` 时**不要**向用户展示 `error`——那不是错误，而是该段代码尚未轮到执行、
其所属画布已被销毁（快速连续点击、切换页面均属此场景）。

## 复用画布的已知问题

「同一块画布，先画一个圆、再画一个方块」——直觉做法是调用两次 `run()`，或先 `self.clear()`。
**两种做法均存在问题**，且只有真机才能观察到：

- 调用两次 `run()`：第二次的画面**叠加**在第一次之上（场景未清场，`self.add()` 继续追加）；
- `self.clear()`：manim 的 `clear()` 会**连同 3D 灯光一并移除**，此后的画面为黑色。

以上均为实测行为。正确做法是**每次重绘都更换一块新画布**：

```ts
surface.dispose()
surface = await renderer.createSurface(container)
await surface.run(code)
```

`surface.replay()` 即是该语义的现成封装：作废当前画布 → 创建一块新的 → 将上一段代码
从头完整播放一遍。

::: warning 录屏与 replay 的次序
`replay()` 会更换 canvas 元素。若先 `captureStream()` 再 `replay()`，录制流仍挂在
已被丢弃的旧画布上——录制结果为空文件，且**全程不报错**。应先创建好新画布再开始录制；
内置的 `browserRecorder` 已正确处理此事。
:::
