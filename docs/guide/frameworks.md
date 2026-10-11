# 在各框架里用

**本包对框架没有任何感知**。对外只涉及两个 DOM 原语——传入一个容器元素，
获得 `run` / `dispose`。任何能向 DOM 插入 `<div>` 的框架均可使用，
差别仅在于两点：**何时创建**、**卸载时执行 dispose**。

| 框架 | 创建 | 卸载 |
| --- | --- | --- |
| 原生 JS | 直接调用 | 自行调用 |
| React | `useEffect`（StrictMode 下会执行两遍，见下） | effect 的 cleanup |
| Vue | `onMounted` | `onUnmounted` |

::: info 这些写法的出处
API 只有**一个对外入口**（`createManimRenderer`），已被两个相互独立的 React 消费者验证：
DSH 插件与开发演示台 `playground/`（本仓自带，`pnpm playground` 启动）。下面的 React 写法
与 playground 同构；原生 JS 是同一套调用去掉框架层；Vue 按同一 API 给出参考实现。
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
开发模式下 React 会刻意执行挂载 → 卸载 → 再挂载一次。这正是上面清理函数必须
**执行实际释放**的原因：第一块画布依靠 `dispose()` 销毁。WASM 运行时是页面级单例
（见[契约一](/guide/contracts)），两次挂载不会启动两份 20 MB 的 WASM，但画布与清理
必须一一对应。
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

## 画布生命周期的两个要点

1. **「参数变化后重播」不要复用画布**。调用 `surface.replay()`（更换新画布重播上一段），
   或销毁旧画布后 `createSurface` 创建新的。在旧画布上继续 `run()` 会将两幅画面叠加
   （原因见[复用画布的已知问题](/guide/contracts#复用画布的已知问题)）。
2. **支持多实例，但渲染是串行的**。同一页面挂载两个 `<ManimStage>` 不会启动两份 WASM，
   二者的 `run()` 在同一队列中依次执行——这是设计行为，不是缺陷。
