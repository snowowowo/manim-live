# API 参考：时间轴回放

`surface.createPlayback(python)` 把**整段代码**收进一条时间轴：不实时播，收完返回一个控制器，可以定位到任意时刻（帧级）、播放/暂停、按帧步进。给「先有整段、再看」的形态用（实验场、将来的回放面板）；「边讲边加」的实时形态走[会话](/api/session)，两条路互不依赖。

```
surface.createPlayback(python, handlers?)  → Promise<Playback>
Playback
├─ duration()                → number              总时长（秒）
├─ time()                    → number              当前时刻
├─ fps()                     → number              帧步进的基准帧率
├─ state()                   → PlaybackState       'ready' | 'playing' | 'paused' | 'ended'
├─ seek(seconds)             → void                定位到任意时刻并渲染一帧
├─ play() / pause()          → void                播放 / 暂停
├─ step(frames?)             → void                按帧步进（默认 +1 帧；负值后退）
├─ segments()                → PlaybackSegment[]   各段时间区间（含等待段）
└─ dispose()                 → void                停表并交还场景
```

## 机制：为什么能帧级定位

manim-web 的动画本来就是**时间轴模型**：每个动画带起止时刻，画面状态是「时刻 → 状态」的函数。收集模式下，桥不走实时播放，把每个 `play` / `wait` 排进一条 MasterTimeline（manim-web 官方 Player 用的同一套）；它的 `seek` 会**全量重置**已排动画再按绝对时间重算——所以往回拖能还原（靠每个动画开始时抓的「动画前快照」），并把「还没出场的物体」按段藏起来。实现见 `src/engine/playback.ts`（收集协议在 `src/py/manim-bridge.ts` 的 `collect` 分支）。

## surface.createPlayback(python, handlers?)

执行一段 Manim Python（与 [`run`](/api/surface) 同一套解释器），但**所有动画收进时间轴而不是实时播**；执行完即返回控制器（收一段几分钟的讲解只用几百毫秒）。

```ts
function createPlayback(python: string, handlers?: RunHandlers): Promise<Playback>
```

**参数**

- `python`：源码，两种形态都收（完整 class 外壳或裸 construct 体），与 `run` 同口径。
- `handlers.onLoading`：按 `import` 取包时的进展回调，同 [`run`](/api/surface)。

**返回** `Promise<Playback>`。语法错、未定义名等抛 `PyRuntimeError`（消息带还原后的行号），与 `run` 一致；返回时画面已定位在 t=0 一帧。

**例子**

```ts
const playback = await surface.createPlayback(`
c = Circle()
self.play(Create(c), run_time=2)
self.wait(1)
self.play(c.animate.shift(RIGHT * 2))
`)

console.log(playback.duration())   // ≈ 4（2 秒动画 + 1 秒等待 + 1 秒动画）
playback.seek(2.5)                 // 定位到第 2.5 秒那一帧
playback.play()                    // 从这里继续播
```

**注意**

- **一块画布同时至多一个「活形态」**：开回放会先收掉活会话与旧回放；`run` / `replay` / `createSession` 也会收掉回放。
- **收集前会清空场景**：收集模式会真的把代码跑一遍，物体是新建的，而场景是复用的。不清的话上一趟 `run()` 留下的那套还挂在里面，画面上就是「旧终态 + 新动画」叠着——看上去像「物体出现没有动画」（旧的已经画好了）、运动「发虚」（两套叠着）。它们不在这条时间轴上，`seek` / `reset` 也救不了。清的是 mobject，**不换画布元素**（正在这块画布上取帧的导出器不受影响）。
- 收集期间**没有动画的语句**（建物体、`set_color`、`self.add`…）立即执行——它们没有时长，属于「时间轴之外」的状态改动；**往回拖跨过它们不会还原**（与 manim-web 官方录制门面同一取舍）。
- 3D 场景转换（代码中途 `class X(ThreeDScene)` 换画布）在收集模式下未处理。

## playback.duration() / time() / fps() / state()

四个读数。`duration()` 是段账总和（动画取**并行最大值** + 等待段相加）；`time()` 是当前时刻（播放中随帧推进）；`fps()` 是场景的目标帧率（帧步进的步长 = 1/fps）；`state()` 四态：

| 状态 | 含义 |
| --- | --- |
| `ready` | 刚收完，还没动过（画面停在 t=0） |
| `playing` | 正在播 |
| `paused` | 暂停（seek / step 之后也算） |
| `ended` | 播到了末尾 |

## playback.seek(seconds)

定位到任意时刻并渲染一帧。**播放中调用则从新位置继续播**（拖动条不会打断播放——是否先暂停由界面决定）。

**注意**

- 秒数会被夹到 `[0, duration]`。
- 往回 seek 的还原依赖每个动画开始时抓的快照；极少数拿不到快照的对象可能带一点残留（库内部会告警）。

## playback.play() / pause()

从当前位置继续播 / 暂停。**在末尾再点 `play()` = 从头重播**（播放器惯例）。

## playback.step(frames?)

按帧步进：`step()` 前进一帧、`step(-1)` 后退一帧；步长 = `1 / fps()`。步进前会先暂停（逐帧看的时候不该继续播）。

**注意**

- 帧是「时间轴上的 1/fps 秒」，不是视频帧——状态由时刻算出，所以前后步进都是精确的。

## playback.segments()

各段的时间区间（含等待段），界面画刻度用。

```ts
interface PlaybackSegment {
  start: number    // 段起点（秒）
  end: number      // 段终点（秒）
  isWait: boolean  // 等待段（没有动画，只有时长）
}
```

## playback.dispose()

停表并交还场景（时间轴摘除，画面留在当前帧）。之后再调任何成员都是空操作；[`surface.dispose()`](/api/surface) 会级联销毁回放。
