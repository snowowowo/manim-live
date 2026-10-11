# 快速开始

下面用一个 vite 项目当例子（任何能解析 `node_modules` 的 bundler 都一样）。
二十来行，跑出第一幅画面。

## 1. 最小流程

```ts
import { createManimRenderer } from 'manim-live'
import 'manim-live/style.css' // 可选：只修 canvas 的基线间隙

// ① 造渲染器。不给 pyodideIndexURL 就用官方 CDN（约 13 MB，首次访问要拉一会儿）。
const renderer = createManimRenderer({
  // 想显示「正在取 pandas / matplotlib…」就给这个回调：
  onLoading: (names) => console.log(names.length ? `取包：${names.join('、')}` : '取包完成'),
})

// ② 预热（可选但强烈建议）：提前拉 Pyodide，别等用户第一次点渲染才卡。
await renderer.warmup()

// ③ 干跑预检：语法错 / 未定义名 / 取不到的包，当场回 ok:false。
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

// ④ 建画布、跑代码。一次一段，独立执行。
const surface = await renderer.createSurface(document.querySelector('#stage')!)
const result = await surface.run(python)
if (!result.ok) console.error(result.error)

// ⑤ 用完真释放（WASM 与 WebGL 都会拆掉）。SPA 路由切换不销毁就是内存泄漏。
surface.dispose()
renderer.dispose()
```

容器自己给、生命周期自己管——这就是「零框架」的全部含义：

```html
<div id="stage"></div>
```

## 2. 每一步在干什么

| 步骤 | 干什么 | 不调会怎样 |
| --- | --- | --- |
| `warmup()` | 提前拉 Pyodide 本体 | 用户第一次点渲染要干等十几秒 |
| `check()` | 干跑预检（不碰 DOM） | 坏代码到 `run()` 才炸，用户看到的是半截画面 |
| `createSurface(el)` | 在容器里建一块 WebGL 画布 | —— |
| `surface.run(code)` | 跑一段 Manim Python | —— |
| `surface.dispose()` | 真释放 WASM / WebGL | 内存泄漏 |

## 3. 两个常用的后续动作

**重画一份新的**（比如「参数改了再演一遍」）——用 `replay()`，它会换一块新画布把上一段代码
从头真播一遍。不要试图复用旧画布接着画：`Scene.clear()` 连 3D 灯光一起摘掉，
复用画布只会把两幅画叠在一起（实测踩过，详见[三条契约](/guide/contracts#复用画布的坑)）。

**录屏导出**——渲染器的 `exporters` 里自带浏览器录屏（`id: 'browser-recorder'`）。
它拿不到源码，只能录「活着的画布」，所以要把**渲染控制权**递给它。正确姿势是先建一块
新画布，让录屏在这块画布上从头播：

```ts
const recorder = renderer.exporters.find((e) => e.id === 'browser-recorder')!
if (!(await recorder.probe()).ready) throw new Error('这个浏览器不支持录屏')

const fresh = await renderer.createSurface(container) // ← 录屏要的是一块新建的画布
const result = await recorder.run({
  python,
  controller: {
    canvas: () => fresh.canvas(),
    isRendered: () => fresh.isRendered(),
    replay: async () => { await fresh.run(python) }, // 从头真播一遍
  },
  onProgress: (note) => console.log(note),
})
if (result.ok && result.kind === 'blob') {
  const url = URL.createObjectURL(result.blob)
  // <a download={result.name} href={url}> → 点击下载 .webm
}
```

::: warning 为什么不能拿旧画布直接录
录屏在开播**之前**就抓住了 canvas；此时若用 `surface.replay()`（它会换一块新 canvas），
录制流就留在那块被丢弃的旧画布上——录出来是空文件，而且**全程不报错**（实测踩过）。
所以上面先 `createSurface` 一块新的，再让它在这块画布上重播。详见
[三条契约](/guide/contracts#复用画布的坑)。
:::

各导出器的完整接口见 [API](/api/#导出)。

## 下一步

- 想在 React / Vue 里挂它 → [在各框架里用](/guide/frameworks)
- 代码里 `import pandas` 取不到包 → [第三方包从哪来](/guide/packages)
