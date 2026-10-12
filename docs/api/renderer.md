# API 参考：渲染器

渲染器（`ManimRenderer`）由 [`createManimRenderer()`](/api/) 创建，一个页面通常一个。它有六个成员：五个方法加一个数组属性。本页逐个讲清。对象关系见[总览](/api/)，画布那半边见[画布](/api/surface)。

## renderer.warmup()

提前下载并初始化 Pyodide 与 manim 适配层。不预热时，第一次渲染需等待完整下载结束，期间界面没有任何画面进展。

```ts
warmup(): Promise<void>
```

**参数** 无。

**返回** `Promise<void>`，resolve 表示运行时可用。首次会取 Pyodide 核心（约 13 MB）与 numpy（约 3 MB）。它不返回运行时对象——预热只是把后续第一次 `run()` 的等待提前。

**例子**

```ts
// 界面挂载时即调用，不等到用户触发渲染
renderer.warmup().then(
  () => setStatus('运行时已就绪'),
  (error) => {
    console.error('[manim] 预热失败:', error)
    setStatus('运行时加载失败，可重试')
  },
)
```

**注意**

- 可以重复调用：运行时只初始化一次；初始化失败时那份缓存会被摘掉，下一次调用重新尝试。
- 预热与 `run()` 走同一条队列。预热期间提交的渲染排在它后面，不会两段代码同时初始化。

## renderer.check(python)

干跑预检：代码真的被解释执行一遍，只是不产出画面。拦下语法错误、未定义的名字、manim-web 实测缺失的能力三类问题。

```ts
check(python: string): Promise<CheckResult>

interface CheckResult {
  ok: boolean
  error?: string       // ok 为 false 时给出原因，带行号
  warnings?: string[]  // 不阻断渲染的提醒；没有提醒时缺席
}
```

**参数**

- `python`：待检查的 Manim Python 源码，两种形态都收，见[画布](/api/surface)的 `run()`。

**返回** `Promise<CheckResult>`：`ok` 为 `true` 表示预检通过；为 `false` 时 `error` 给出原因。

**例子**

```ts
const result = await renderer.check(python)
if (!result.ok) {
  showError(result.error)   // 直接给用户或模型看
  return
}
const surface = await renderer.createSurface(container)
await surface.run(python)
```

**注意**

- 不碰 DOM、不需要画布，因此可以在渲染之前调用。
- 源码为空（去掉首尾空白后长度为 0）时直接返回 `{ ok: true }`，不启动运行时。
- 「预检不通过」是一个结论而不是故障，核心用 `console.info` 记一条，不写 `console.error`——批量筛代码时控制台不会被红字淹掉。
- 预检不保证渲染成功：它跑的是「什么都不画」的桥，涉及真实绘制与布局的错误仍要到 `run()` 才暴露。
- 代码含 `MathTex` / `Tex` 而创建渲染器时没传 `katexBaseURL` 时，`warnings` 给一条提醒（公式将以无样式形态渲染）；它不改变 `ok` 的判定。
- 只在浏览器入口提供。Node 侧用 `manim-live/node` 的 `runPython` 加 `createDryRunBridge` 组合，见[Node 入口](/api/node)。

## renderer.createSurface(container, options?)

在给定容器里建一块画布并返回它。

```ts
createSurface(container: HTMLElement, options?: SurfaceOptions): Promise<Surface>

interface SurfaceOptions {
  fast?: boolean                              // 默认 false
  onLoading?: (names: string[]) => void       // 这块画布上所有 run 的默认回调
}
```

**参数**

- `container`：画布的容器元素，由调用方提供并管理生命周期。
- `options.fast`：极速档。动画时长一律压到 0、`wait` 只推进 updater，直接落终态。建画布时定下，之后改不了。
- `options.onLoading`：这块画布上所有 `run()` 的默认取包回调；单次 `run()` 自己传的优先。

**返回** `Promise<Surface>`。返回 Promise 是因为建画布要先加载 manim-web 并创建 WebGL 场景。`Surface` 的五个成员见[画布](/api/surface)。

**例子**

```ts
const surface = await renderer.createSurface(document.querySelector('#stage')!, {
  onLoading: (names) => console.log(names.length > 0 ? `取包：${names.join('、')}` : '取包结束'),
})
```

**注意**

- 核心不创建也不移动容器，只往里挂 canvas，并给容器加上 `manim-live-surface` 类名；换场景时（`replay()`，或代码里出现 3D 场景）会先清空容器再挂新的那块。
- 画布分辨率固定 1280×720，不随容器尺寸变化（内部关掉了自动缩放）。要改显示大小用 CSS 缩放容器；坐标系不受影响，画面高度恒为 8 个单位、16:9 下宽度约 14.22，与标准 Manim 的默认 frame 一致。
- 画布背景全透明，明暗主题由宿主页面的底色透出。
- 更换 `fast` 档位只能销毁该画布后重建，代价是整段代码重新执行一次。
- 同一页面可以建多块画布，但它们共享一个解释器与一条执行队列，渲染是串行的：不存在两块画布同时处于播放中。

## renderer.exporters

可用的导出接入者列表，属性而非方法。自带的浏览器录屏（`id: 'browser-recorder'`）始终在列表最前，创建渲染器时传入的接在它后面。

```ts
readonly exporters: Exporter[]
```

**例子**

```ts
for (const exporter of renderer.exporters) {
  const probe = await exporter.probe()
  console.log(exporter.label, probe.ready ? '可用' : `缺：${(probe.missing ?? []).map((m) => m.label).join('、')}`)
}
```

接入者的形状与用法见[导出](/api/export)。

## renderer.pyodideIndexURL()

当前生效的 Pyodide 取数根，诊断用。

```ts
pyodideIndexURL(): string
```

**返回** 实际生效的地址：装好的加载器地址优先，其次创建渲染器时传的 `pyodideIndexURL`，最后是官方 CDN 默认值。

## renderer.dispose()

释放本实例造过的所有画布，并摘掉自己注入的 KaTeX 样式表。

```ts
dispose(): void
```

**注意**

- 是真实释放：销毁 WASM 与 WebGL 上下文。SPA 路由切换不调用就是泄漏，反复几次页面会不可用。
- 只摘自己注入的样式，不动使用者自己加的。
- 页面卸载时它和每块画布的 `dispose()` 调一个即可；两者都调也安全。
