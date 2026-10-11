# 在各框架里用

先说结论：**本包对框架一无所知**。对外只碰两个 DOM 原语——给一个容器元素，
拿到 `run` / `dispose`。所以任何能往 DOM 里塞一个 `<div>` 的框架都能用，
差别只在两件事：**什么时候建**、**卸载时记得 dispose**。

| 框架 | 建 | 卸载 |
| --- | --- | --- |
| 原生 JS | 直接调 | 自己记得调 |
| React | `useEffect`（StrictMode 下会跑两遍，见下） | effect 的 cleanup |
| Vue | `onMounted` | `onUnmounted` |

::: info 这些写法的出处
API 只有**一个对外入口**（`createManimRenderer`），而它已经被两个互不相干的 React 消费者走通：
DSH 插件与开发演示台 `playground/`（本仓自带，`pnpm playground` 起）。下面的 React 写法
与 playground 同构；原生 JS 是同一套调用去掉框架壳；Vue 按同一 API 给出参考实现。
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
      if (cancelled) { s.dispose(); return } // 组件已卸载：这块画布不能留
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

::: warning StrictMode 会把 effect 跑两遍
开发模式下 React 故意挂载 → 卸载 → 再挂载一次。这正是上面清理函数必须**真干活**的原因：
第一块画布靠 `dispose()` 拆掉。WASM 运行时是页面级单例（见[契约一](/guide/contracts)），
两次挂载不会启两份 20 MB 的 WASM，但画布和它的清理必须一一对应。
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

## 与画布生命周期有关的两个实务

1. **「参数变了重演」不要复用画布**。调 `surface.replay()`（换新画布重播上一段），
   或者干脆 dispose 旧画布、`createSurface` 一块新的。往旧画布上接着 `run()` 会把两幅画
   叠在一起（原因见[复用画布的坑](/guide/contracts#复用画布的坑)）。
2. **多实例可以，但渲染是串行的**。同一页面挂两个 `<ManimStage>` 不会启两份 WASM，
   它们的 `run()` 排一个队列依次执行——这是设计如此，不是 bug。
