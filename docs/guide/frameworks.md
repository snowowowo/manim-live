# 框架集成

本页给出原生 JS、React、Vue、Next.js 四种挂载写法与生命周期要点。包对框架零感知：对外只涉及两个 DOM 原语——传入一个容器元素，拿到 `run` 与 `dispose`。任何能向 DOM 插入 `<div>` 的框架都适用，差别只有两点：**何时创建**、**卸载时执行 dispose**。核心 API 见[快速开始](/guide/quick-start)。

| 框架 | 创建 | 卸载 |
| --- | --- | --- |
| 原生 JS | 直接调用 | 自行调用 |
| React | `useEffect`（StrictMode 下会执行两遍，见下） | effect 的 cleanup |
| Vue | `onMounted` | `onUnmounted` |
| Next.js（App Router） | `'use client'` 组件的 `useEffect` | effect 的 cleanup |

::: info 每种写法都有真机验证
本仓 `examples/` 下有四个最小集成项目——`vanilla` / `react` / `vue` / `next`（各自 `pnpm install && pnpm dev` 即起）——用当前最新版本（React 19 + TypeScript 7、Vue 3.5、Vite 8、Next.js 16）逐一真机验证通过（2026-10-11）：三种画布接法的渲染全部正常，React 与 Vue 项目还通过了严格模式的类型检查（本包的 `.d.ts` 对真实消费者可解析）。Next.js 与服务端渲染的结论见下文专门一节。
:::

::: info 这些写法的出处
API 只有一个对外入口（`createManimRenderer`），已被两个相互独立的 React 消费者验证：DSH 插件与本仓自带的开发演示台 `playground/`（`pnpm playground` 启动）。下面的 React 写法与 playground 同构；原生 JS 是同一套调用去掉框架层；Vue 按同一 API 给出参考实现。
:::

## 原生 JS

```ts
import { createManimRenderer } from 'manim-live'

const renderer = createManimRenderer()
const surface = await renderer.createSurface(document.querySelector('#stage')!)
await surface.run(python)

// 页面卸载时：
window.addEventListener('beforeunload', () => {
  surface.dispose()
  renderer.dispose()
})
```

## React

```tsx
import { useEffect, useRef } from 'react'
import { createManimRenderer, type Surface } from 'manim-live'

export function ManimStage({ python }: { python: string }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const renderer = createManimRenderer()
    let surface: Surface | null = null
    let cancelled = false

    void renderer.createSurface(host.current!).then(async (s) => {
      if (cancelled) { s.dispose(); return } // 组件已卸载：该画布不应保留
      surface = s
      const result = await s.run(python)
      if (!result.ok && result.cancelled !== true) console.error(result.error)
    })

    return () => {
      cancelled = true
      surface?.dispose()
      renderer.dispose()
    }
  }, [python])

  return <div ref={host} />
}
```

::: warning StrictMode 会把 effect 执行两遍
开发模式下 React 会刻意执行挂载 → 卸载 → 再挂载一次。这正是上面清理函数必须**执行实际释放**的原因：第一块画布依靠 `dispose()` 销毁。WASM 运行时是页面级单例（见[行为契约](/guide/contracts)），两次挂载不会启动两份 Pyodide 运行时，但画布与清理必须一一对应。
:::

## Vue

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { createManimRenderer, type Surface } from 'manim-live'

const host = ref<HTMLDivElement>()
const python = `
from manim import *
class Demo(Scene):
    def construct(self):
        self.play(Create(Circle()))
`

let renderer: ReturnType<typeof createManimRenderer> | null = null
let surface: Surface | null = null

onMounted(async () => {
  renderer = createManimRenderer()
  surface = await renderer.createSurface(host.value!)
  await surface.run(python)
})

onUnmounted(() => {
  surface?.dispose()
  renderer?.dispose()
})
</script>

<template>
  <div ref="host" />
</template>
```

## Next.js 与服务端渲染

实测结论（`examples/next`，Next.js 16）：

- **顶层 `import` 在服务端是安全的**——本包模块顶层不碰任何浏览器全局。示例的服务器组件页在顶层 `import { DEFAULT_PYODIDE_INDEX_URL } from 'manim-live'` 并读取该常量，`next build` 的静态预渲染与 dev SSR 均通过。
- **画布创建必须在客户端**：`createSurface()` 需要真实 DOM。给画布组件标 `'use client'`，在 `useEffect` 里建画布——SSR 阶段只渲染占位 `<div>`，`useEffect` 不在服务端执行，因此也不需要 `dynamic(..., { ssr: false })`。
- 无需改动 `next.config`。

```tsx
// app/ClientCanvas.tsx
'use client'
import { useEffect, useRef } from 'react'
import { createManimRenderer } from 'manim-live'

export function ClientCanvas({ python }: { python: string }) {
  const host = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const renderer = createManimRenderer()
    void renderer.createSurface(host.current!).then(async (s) => {
      await s.run(python)
    })
    return () => {
      renderer.dispose() // 会销毁它创建过的所有画布
    }
  }, [python])

  return <div ref={host} />
}
```

## 更多框架

任何能把一个 `<div>` 挂进页面、并在卸载时执行清理的框架都适用。要找的只有两件事：挂载钩子（在那里 `createSurface`）与卸载钩子（在那里 `dispose`）。接入方式与上面完全相同，未逐一建例：

| 框架 | 创建 | 卸载 |
| --- | --- | --- |
| Svelte | `onMount` | `onMount` 返回的清理函数 |
| Solid | `createEffect` | `onCleanup` |
| Angular | `ngAfterViewInit` | `ngOnDestroy` |
| Preact | `useEffect`（与 React 相同） | effect cleanup |
| Astro | 任选 UI 框架做客户端 island，或直接用原生 JS 写法 | 同所选框架 |
| Web Components | `connectedCallback` | `disconnectedCallback` |

带服务端渲染的框架（Nuxt、SvelteKit、Remix 等）原则与 Next.js 一节相同：顶层 `import` 在服务端安全，画布创建留在客户端生命周期钩子里。

## 生命周期要点

1. **参数变化后重播，不要复用画布**。调用 `surface.replay()`（换新画布重播上一段），或销毁旧画布后重新 `createSurface`。在旧画布上继续 `run()` 会把两幅画面叠在一起，原因见[复用画布的已知问题](/guide/contracts#复用画布的已知问题)。
2. **支持多实例，但渲染是串行的**。同一页面挂两个 `<ManimStage>` 不会启动两份 WASM，两者的 `run()` 在同一条队列里依次执行——这是设计行为，不是缺陷。
