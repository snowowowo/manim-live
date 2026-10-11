# 必须知道的三条契约

这三条写在源码 `src/index.ts` 的文件头——不读它们，SPA 里迟早踩坑。

## 一、多实例是页面级单例

WASM 运行时与串行执行队列是**页面级单例**。同一页面挂两个组件，**不会**启两份 20 MB 的
WASM；但它们的渲染**排一个队、串行执行**——这不是缺陷：一个 WASM 解释器本来就跑不了两段
并发的 Python。

给 UI 的含义：两个画布同时「播放中」是不存在的，后点的会等先点的跑完。

## 二、dispose() 是真的释放

`surface.dispose()` / `renderer.dispose()` 会拆掉 WASM 与 WebGL 上下文。SPA 路由切换
不销毁，泄漏的就是整个解释器 + 一个 WebGL context，几次之后页面就废了。

所以框架集成里**清理函数必须真干活**（React StrictMode 会故意把 effect 跑两遍来查这件事，
见[各框架一页](/guide/frameworks#strictmode-会把-effect-跑两遍)）。

`renderer.dispose()` 会顺手拆掉它造过的**所有**画布，并摘掉自己注入的 KaTeX 样式表。

## 三、run() 是单段独立执行

`surface.run(code)` 一次一段，**变量不跨次保留**（每次都是新的 Python 命名空间）。
要连续跑多段共享变量，得在调用方把代码拼成一段再 `run()`。

`RunResult` 只有三个字段，其中有一个专门为「作废」准备的：

```ts
interface RunResult {
  ok: boolean
  error?: string
  /** 这段运行作废了（画布在轮到它之前就被拆）：不是错误，调用方一个字都不该显示。 */
  cancelled?: boolean
}
```

`cancelled === true` 时**不要**把 `error` 弹给用户——那不是错误，是这段代码还没轮到跑，
它所属的画布已经被拆了（快速连点、切换页面都是这个场景）。

## 复用画布的坑

「同一块画布，先画个圆、再画个方块」——直觉是 `run()` 两次，或者先 `self.clear()`。
**都会踩坑**，而且是真机才看得见的坑：

- `run()` 两次：第二次的画面**叠**在第一次上（场景没清场，`self.add()` 往上继续加）；
- `self.clear()`：manim 的 `clear()` 会**连 3D 灯光一起摘掉**，之后的画面是黑的。

这两个都是实测行为（本地演示台第一版就栽在这里）。所以正确姿势是**每次重画都换一块新画布**：

```ts
surface.dispose()
surface = await renderer.createSurface(container)
await surface.run(code)
```

`surface.replay()` 就是这个语义的现成封装：作废当前画布 → 建一块新的 → 把上一段代码从头
真播一遍。

::: warning 录屏与 replay 的次序
`replay()` 会换掉 canvas 元素。如果先 `captureStream()` 再 `replay()`，录制流还挂在
那块被丢弃的旧画布上——录出来是空文件，而且**全程不报错**。先建好新画布再开录制，
内置的 `browserRecorder` 已经处理好了这件事。
:::
