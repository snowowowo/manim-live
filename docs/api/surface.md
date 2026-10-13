# API 参考：画布

画布（`Surface`）由 [`renderer.createSurface()`](/api/renderer) 创建，一块画布一个实例，不能单独构造。它有五个成员，全是方法。渲染器那半边见[渲染器](/api/renderer)。

## surface.run(code, handlers?)

在这块画布上执行一段 Manim Python。resolve 表示这一段跑完、动画播完。

```ts
run(code: string, handlers?: RunHandlers): Promise<RunResult>

interface RunHandlers {
  onLoading?: (names: string[]) => void
  context?: string        // 占位参数，传了会抛错
}

interface RunResult {
  ok: boolean
  error?: string
  cancelled?: boolean
}
```

**参数**

- `code`：Manim Python 源码，收两种形态（**默认写完整文件**；形态口径见[行为契约](/guide/contracts)），报错行号都会还原成你传入源码的行号：

```python
# 形态一：完整 class 外壳。漏写 from manim import * 时核心自动补一行。
from manim import *

class CircleScene(Scene):
    def construct(self):
        circle = Circle(radius=1.2)
        self.play(Create(circle))
```

```python
# 形态二：裸 construct 体。核心自动套上外壳，缩进由它处理。
circle = Circle(radius=1.2)
self.play(Create(circle))
```

- `handlers.onLoading`：本次运行的取包回调，优先于建画布与工厂那两层，见[钩子](/api/hooks)。
- `handlers.context`：给「跨次保留变量的执行上下文」留的占位，尚未实现，传入会抛错。

**返回** `Promise<RunResult>`：

- `ok`：这一段是否成功跑完。
- `error`：失败原因，用户代码或运行时的错，原样可读，带行号。
- `cancelled`：为 `true` 表示该段代码尚未开始执行、其画布已被 `dispose()`。这不是错误，不应向用户显示任何内容。

**例子**

```ts
const result = await surface.run(python)
if (result.cancelled === true) return          // 画布已被销毁，什么都不显示
if (!result.ok) showError(result.error)
```

**注意**

- 每次 `run()` 都是新的 Python 命名空间，**变量不跨次保留**。要连续执行多段共享变量的代码，在调用方拼成一段。
- 多次 `run()` 按提交顺序排队，画布是单写入方。
- 一段代码开始执行后不能中断。
- 用户代码里的 `print` 没有回调，核心把它写到 `console.info`。需要接收输出时使用低层的 `runPython(code, bridge, { output })`。
- 代码里写了 `class X(ThreeDScene)` 时，核心会在运行中把 2D 画布换成真 3D 画布，canvas 元素随之改变——持有旧元素引用时需重新调用 `canvas()`（导出不受影响：导出器拿的是收集结束后的那块场景）。

## surface.replay()

把这块画布上**最后一次 `run()` 的源码**从头完整播放一遍：先作废当前场景、创建一块新画布，再执行同一段代码。

```ts
replay(): Promise<void>
```

**参数** 无。

**返回** `Promise<void>`，resolve 表示这一遍播完。

**例子**

```ts
await surface.run(python)      // 必须先执行过一次，否则 replay() 抛错
await surface.replay()         // 画面回到起点重新播放
```

**注意**

- 没有可重播的代码时它抛错，不是返回失败结果。
- **它会更换 canvas 元素**，且会把上一段代码**从头真播一遍**（副作用：画面停在终态）。导出走的是另一条路（收集模式 + 逐帧出图），见[导出](/api/export)。
- 沿用上一次的 `handlers`，也沿用建画布时的 `fast` 档位。

## surface.canvas()

当前画布元素。

```ts
canvas(): HTMLCanvasElement | null
```

**返回** `HTMLCanvasElement`，画布还没建出来时是 `null`。

**例子**

```ts
const element = surface.canvas()
if (element !== null && surface.isRendered()) {
  const url = element.toDataURL('image/png')   // 取终帧缩略图
}
```

**注意**

- `replay()` 之后返回的是**新元素**，旧的已被丢弃；2D 换 3D 场景时同样会换元素。持有它做截图之类的事，要在这两件事之后重新取。

## surface.isRendered()

这块画布上是否有一段代码成功跑完过。同步查询，不触发渲染。

```ts
isRendered(): boolean
```

**返回** `boolean`。

**注意**

- 它的含义是「执行成功过」，**不是**「像素非空」。代码执行成功但没有绘制任何内容时它同样为 `true`；需要确认画面确有内容时，由调用方自行读取像素。
- `replay()` 期间回到 `false`，播完再变 `true`。

## surface.dispose()

销毁这块画布：释放 mobject 与 WebGL 上下文，并从容器摘掉 canvas。

```ts
dispose(): void
```

**注意**

- 之后这块画布上的 `run()` 一律作废，返回 `{ ok: false, cancelled: true }`，不会真的执行。
- 是真实释放，不是标记。框架里的清理函数必须真的调它，React StrictMode 会故意把 effect 跑两遍来检查这件事。

## 重画一幅新内容

同一块画布上连续两次 `run()`，第二幅画面会**叠加**在第一幅之上；而 `Scene.clear()` 会连 3D 灯光一起清掉，之后画面全黑。要换内容，正确做法是销毁画布重建：

```ts
surface.dispose()
surface = await renderer.createSurface(container)
await surface.run(nextPython)
```

`replay()` 是这个语义的现成封装，区别只在于它重跑的是上一段代码。原因与实测行为见[行为契约](/guide/contracts)。
