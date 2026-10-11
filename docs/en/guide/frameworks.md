# Using in Frameworks

This page shows how to mount in vanilla JS / React / Vue, plus two canvas-lifecycle points. The core API is in [Quick Start](/en/guide/quick-start).

**This package is completely framework-agnostic.** Only two DOM primitives are involved —
you pass in a container element and get `run` / `dispose`. Any framework that can insert a
`<div>` into the DOM works; the differences come down to two points: **when to create**,
and **calling dispose on unmount**.

| Framework | Creation | Unmounting |
| --- | --- | --- |
| Vanilla JS | Direct call | Call it yourself |
| React | `useEffect` (runs twice under StrictMode, see below) | The effect's cleanup |
| Vue | `onMounted` | `onUnmounted` |

::: info Where these snippets come from
The API has exactly **one public entry** (`createManimRenderer`), validated by two mutually
independent React consumers: the DSH plugin and the development playground `playground/`
(shipped in this repository, started with `pnpm playground`). The React snippet below is
isomorphic to the playground; the vanilla JS one is the same calls minus the framework layer;
Vue is a reference implementation against the same API.
:::

## Vanilla JS

```ts
import { createManimRenderer } from 'manim-live'

const renderer = createManimRenderer()
const surface = await renderer.createSurface(document.querySelector('#stage')!)
await surface.run(python)

// On page unload:
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
      if (cancelled) { s.dispose(); return } // Component already unmounted: this canvas must not be kept
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

::: warning StrictMode runs the effect twice
In development mode React deliberately performs mount → unmount → remount. This is exactly
why the cleanup above must **perform a real release**: the first canvas is destroyed by
`dispose()`. The WASM runtime is a page-level singleton (see
[contract one](/en/guide/contracts)), so the two mounts do not start two 20 MB WASM
instances — but canvases and cleanups must correspond one to one.
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

## Two Points About Canvas Lifecycle

1. **Do not reuse a canvas to "replay after parameters changed"**. Call `surface.replay()`
   (which swaps in a new canvas and replays the previous segment), or destroy the old canvas
   and `createSurface` a new one. Continuing to `run()` on the old canvas stacks two scenes
   on top of each other (see
   [known issues with reusing a canvas](/en/guide/contracts#known-issues-with-reusing-a-canvas)).
2. **Multiple instances are supported, but rendering is serialized**. Mounting two
   `<ManimStage>`s on the same page does not start two WASM instances; their `run()`s execute
   one after another in the same queue — this is by design, not a defect.
