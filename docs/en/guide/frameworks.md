# Framework Integration

This page gives mounting recipes for vanilla JS, React, Vue, and Next.js, plus the lifecycle points that matter. The package has no awareness of frameworks: externally it involves only two DOM primitives — pass in a container element, get `run` and `dispose`. Any framework that can insert a `<div>` into the page works; the only differences are **when to create** and **whether cleanup calls dispose**. The core API is in [Quick Start](/en/guide/quick-start).

| Framework | Create | Dispose |
| --- | --- | --- |
| Vanilla JS | Call directly | Call yourself |
| React | `useEffect` (runs twice under StrictMode, see below) | The effect's cleanup |
| Vue | `onMounted` | `onUnmounted` |
| Next.js (App Router) | `useEffect` in a `'use client'` component | The effect's cleanup |

::: info Every recipe here is verified on a real machine
Under `examples/` in this repository there are four minimal integration projects — `vanilla` / `react` / `vue` / `next` (each starts with `pnpm install && pnpm dev`) — verified one by one against the current latest versions (React 19 + TypeScript 7, Vue 3.5, Vite 8, Next.js 16) on 2026-10-11: all three canvas mountings render correctly, and the React and Vue projects also pass strict-mode type checking (this package's `.d.ts` resolves for real consumers). The Next.js and SSR findings have their own section below.
:::

::: info Where these recipes come from
The API has exactly one external entry (`createManimRenderer`), already validated by two independent React consumers: the DSH plugin and this repository's own development playground `playground/` (started with `pnpm playground`). The React recipe below is isomorphic with the playground; vanilla JS is the same call sequence minus the framework layer; Vue is a reference implementation over the same API.
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
      if (cancelled) { s.dispose(); return } // component already unmounted: keep no canvas
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
In development React deliberately performs mount → unmount → remount. This is exactly why the cleanup above must **perform a real release**: the first canvas is destroyed by `dispose()`. The WASM runtime is a page-level singleton (see [Behavioural Contracts](/en/guide/contracts)), so the two mounts do not start two Pyodide runtimes — but canvases and cleanups must correspond one to one.
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

## Next.js and server-side rendering

Measured findings (`examples/next`, Next.js 16):

- **Top-level `import` is safe on the server** — this package's module top level touches no browser globals. The example's server component page does `import { DEFAULT_PYODIDE_INDEX_URL } from 'manim-live'` at top level and reads the constant; both `next build` static prerender and dev SSR pass.
- **Canvas creation must happen on the client**: `createSurface()` needs a real DOM. Mark the canvas component `'use client'` and build the canvas in `useEffect` — during SSR only the placeholder `<div>` renders, and `useEffect` does not run on the server, so `dynamic(..., { ssr: false })` is not needed either.
- No changes to `next.config` are required.

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
      renderer.dispose() // destroys every canvas it created
    }
  }, [python])

  return <div ref={host} />
}
```

## Other frameworks

Any framework that can mount a `<div>` into the page and run cleanup on unmount works. There are only two things to find: the mount hook (create the surface there) and the unmount hook (dispose there). Integration is identical to the recipes above; examples are not built for each:

| Framework | Create | Dispose |
| --- | --- | --- |
| Svelte | `onMount` | The cleanup function returned by `onMount` |
| Solid | `createEffect` | `onCleanup` |
| Angular | `ngAfterViewInit` | `ngOnDestroy` |
| Preact | `useEffect` (same as React) | Effect cleanup |
| Astro | A client island in any UI framework, or the vanilla JS recipe directly | Same as the chosen framework |
| Web Components | `connectedCallback` | `disconnectedCallback` |

Frameworks with server-side rendering (Nuxt, SvelteKit, Remix, and friends) follow the same principle as the Next.js section: top-level `import` is safe on the server, and canvas creation stays in client-side lifecycle hooks.

## Lifecycle points

1. **Do not reuse a canvas when re-rendering after a parameter change.** Call `surface.replay()` (new canvas, previous code from the top), or dispose the old canvas and `createSurface` a new one. Continuing to `run()` on the old canvas stacks the two pictures on top of each other; the reason is in [known issues with reusing a canvas](/en/guide/contracts#known-issues-with-reusing-a-canvas).
2. **Multiple instances are supported, but rendering is serial.** Mounting two `<ManimStage>`s on one page does not start two WASM runtimes; their `run()` calls execute one after another in the same queue — this is by design, not a defect.
