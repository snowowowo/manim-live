# 快速开始

本页用约二十行代码跑出第一幅画面，并说明每一步省掉会怎样。装包与环境要求见[安装](/guide/installation)。

## 最小流程

```ts
import { createManimRenderer } from 'manim-live'
import 'manim-live/style.css' // 可选：仅修正 canvas 的基线间隙

// ① 创建渲染器。不传 pyodideIndexURL 则使用官方 CDN（核心约 13 MB，首次访问需要下载）。
const renderer = createManimRenderer({
  // 如需显示「正在获取 pandas / matplotlib…」，传入该回调：
  onLoading: (names) => console.log(names.length ? `获取包：${names.join('、')}` : '获取完成'),
})

// ② 预热（可选但强烈建议）：提前拉起 Pyodide，避免用户第一次渲染时长时间等待。
await renderer.warmup()

// ③ 干跑预检：语法错 / 未定义名 / 取不到的包，立即返回 ok:false。
const python = `
from manim import *

class AxesPlotScene(Scene):
    def construct(self):
        ax = Axes(x_range=[-3, 3, 1], y_range=[-1, 3, 1])
        graph = ax.plot(lambda x: x * x / 3, color=GREEN)
        self.play(Create(ax), Create(graph))
        self.wait(0.3)
`
const check = await renderer.check(python)
if (!check.ok) throw new Error(check.error)

// ④ 创建画布并执行代码。一次一段，独立执行。
const surface = await renderer.createSurface(document.querySelector('#stage')!)
const result = await surface.run(python)
if (!result.ok) console.error(result.error)

// ⑤ 使用完毕执行真实释放（WASM 与 WebGL 均被销毁）。SPA 路由切换时不释放即内存泄漏。
surface.dispose()
renderer.dispose()
```

容器由调用方提供、生命周期由调用方管理，这是「零框架」的具体含义：

```html
<div id="stage"></div>
```

## 每一步的作用

| 步骤 | 作用 | 不调用的后果 |
| --- | --- | --- |
| `warmup()` | 提前拉取 Pyodide 本体 | 用户第一次渲染需等待十余秒 |
| `check()` | 干跑预检（不碰 DOM） | 有问题的代码到 `run()` 才失败，用户看到的是不完整画面 |
| `createSurface(el)` | 在容器里创建一块 WebGL 画布 | —— |
| `surface.run(code)` | 执行一段 Manim Python | —— |
| `surface.dispose()` | 真实释放 WASM / WebGL | 内存泄漏 |

每个方法的参数、返回值与更多例子见 [API 参考](/api/)。

## 重播

`replay()` 会更换一块新画布，把上一段代码从头完整播放一遍。不要复用旧画布继续绘制：`Scene.clear()` 会连同 3D 灯光一并移除，复用画布只会使两幅画面叠加，详见[行为契约](/guide/contracts)。

```ts
await surface.replay()
```

## 导出视频

渲染器的 `exporters` 自带浏览器逐帧导出（`id: 'browser-video'`）：它把源码按收集模式跑一遍拿到时间轴，再交给 manim-web 自带的导出器逐帧出图。因为要执行一遍源码，所以需要向它传递**渲染控制权**，并在**一块新建的空白画布**上做这件事：

```ts
const exporter = renderer.exporters.find((e) => e.id === 'browser-video')!
if (!(await exporter.probe()).ready) throw new Error('当前浏览器不支持逐帧导出')

const fresh = await renderer.createSurface(container) // ← 收集会真的跑一遍代码，放新画布上做
const result = await exporter.run({
  python,
  controller: {
    canvas: () => fresh.canvas(),
    isRendered: () => fresh.isRendered(),
    collect: (src) => fresh.collect(src),
  },
  onProgress: (note) => console.log(note),
})
if (result.ok && result.kind === 'blob') {
  const url = URL.createObjectURL(result.blob)
  // <a download={result.name} href={url}> → 点击下载；扩展名从 result.mime 推，别写死
}
```

::: tip 为什么先在**新画布**上收集
收集模式会真的执行一遍源码（物体建出来、动画排进时间轴），留在屏幕上的画面因此会停在「收集完」的样子。在新建的空白画布上做，等于把这次副作用关在一块马上要被丢弃的画布上，用户原本那块不受影响。详见[行为契约](/guide/contracts)。
:::

导出契约的完整定义见 [API 参考：导出](/api/export)。

## 下一步

- 每个方法、属性、钩子的类型定义与例子 → [API 参考](/api/)
- 原生 JS / React / Vue 的挂载与清理 → [框架集成](/guide/frameworks)
- 代码中 `import pandas` 取不到包 → [第三方包](/guide/packages)
