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
| Next.js (App Router) | `useEffect` in a `'use client'` component | the effect cleanup |

::: info Every snippet is verified on a real machine
The repo's `examples/` directory holds four minimal integration projects — `vanilla` / `react` / `vue` / `next` (each runs with `pnpm install && pnpm dev`) — verified end to end on **current latest versions** (React 19 + TypeScript 7, Vue 3.5, Vite 8, Next.js 16; 2026-10-11): every integration renders correctly, and the React / Vue projects pass strict-mode TypeScript / vue-tsc type checks (the package's `.d.ts` resolves for real consumers). Next.js and server-side rendering are covered in their own section below.
:::

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

## Next.js (App Router) and server-side rendering

Findings from `examples/next` (Next.js 16), verified on a real machine:

- **Top-level `import` is safe on the server** — the package's module top level touches no browser globals. The example's server component does `import { DEFAULT_PYODIDE_INDEX_URL } from 'manim-live'` and reads the constant; both the `next build` static prerender and dev SSR pass.
- **Canvas creation must happen on the client**: `createSurface()` needs a real DOM. Mark the canvas component `'use client'` and create the surface in `useEffect` — during SSR only the placeholder `<div>` renders, `useEffect` never runs on the server, so `dynamic(..., { ssr: false })` is unnecessary too.
- No `next.config` changes are needed.

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
      renderer.dispose() // disposes every surface it created
    }
  }, [python])

  return <div ref={host} />
}
```

## More frameworks

The package has zero framework dependencies — **any framework that can put a `<div>` into the page and run cleanup on unmount works**. You only need two things: the mount hook (call `createSurface` there) and the unmount hook (call `dispose` there). The integration is identical to the examples above; these are not individually verified:

| Framework | Create | Unmount |
| --- | --- | --- |
| Svelte | `onMount` | the cleanup function returned by `onMount` |
| Solid | `createEffect` | `onCleanup` |
| Angular | `ngAfterViewInit` | `ngOnDestroy` |
| Preact | `useEffect` (same as React) | effect cleanup |
| Astro | any UI framework as a client island, or the vanilla JS approach | whichever you chose |
| Web Components | `connectedCallback` | `disconnectedCallback` |

For SSR frameworks (Nuxt / SvelteKit / Remix, etc.): the same principle as the Next.js section above — top-level `import` is server-safe; keep canvas creation inside client-side lifecycle hooks.

## Two Points About Canvas Lifecycle

1. **Do not reuse a canvas to "replay after parameters changed"**. Call `surface.replay()`
   (which swaps in a new canvas and replays the previous segment), or destroy the old canvas
   and `createSurface` a new one. Continuing to `run()` on the old canvas stacks two scenes
   on top of each other (see
   [known issues with reusing a canvas](/en/guide/contracts#known-issues-with-reusing-a-canvas)).
2. **Multiple instances are supported, but rendering is serialized**. Mounting two
   `<ManimStage>`s on the same page does not start two WASM instances; their `run()`s execute
   one after another in the same queue — this is by design, not a defect.
