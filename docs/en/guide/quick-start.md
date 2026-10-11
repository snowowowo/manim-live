# Quick Start

This page renders your first frame in about twenty lines and explains what happens if you skip a step. Installation and environment requirements are in [Installation](/en/guide/installation).

## Minimal flow

```ts
import { createManimRenderer } from 'manim-live'
import 'manim-live/style.css' // Optional: only fixes the canvas baseline gap

// ① Create the renderer. Omit pyodideIndexURL to use the official CDN (~13 MB core, downloaded on first visit).
const renderer = createManimRenderer({
  // To show "fetching pandas / matplotlib…", pass this callback:
  onLoading: (names) => console.log(names.length ? `Fetching packages: ${names.join(', ')}` : 'Done'),
})

// ② Warm up (optional but strongly recommended): start Pyodide early so the user
//    doesn't wait a long time on the first render.
await renderer.warmup()

// ③ Dry-run precheck: syntax errors / undefined names / unfetchable packages return ok:false immediately.
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

// ④ Create the canvas and execute the code. One segment at a time, independent.
const surface = await renderer.createSurface(document.querySelector('#stage')!)
const result = await surface.run(python)
if (!result.ok) console.error(result.error)

// ⑤ When done, perform a real release (both WASM and WebGL are destroyed).
//    Not releasing on SPA route switches is a memory leak.
surface.dispose()
renderer.dispose()
```

The container is provided by the caller and its lifecycle is managed by the caller — that is the entire meaning of "zero frameworks":

```html
<div id="stage"></div>
```

## What each step does

| Step | Purpose | Cost of skipping |
| --- | --- | --- |
| `warmup()` | Fetches the Pyodide core ahead of time | The user waits ten-plus seconds on the first render |
| `check()` | Dry-run precheck (touches no DOM) | Bad code only fails at `run()`, and the user sees an incomplete scene |
| `createSurface(el)` | Creates a WebGL canvas inside the container | — |
| `surface.run(code)` | Executes one segment of Manim Python | — |
| `surface.dispose()` | Really releases WASM / WebGL | Memory leak |

Parameters, return values, and more examples for every method are in the [API Reference](/en/api/).

## Replay

`replay()` swaps in a new canvas and plays the previous code segment from the beginning. Do not keep drawing on the old canvas: `Scene.clear()` removes the 3D lights along with everything else, so reusing a canvas only stacks two scenes on top of each other. See [Behavioural Contracts](/en/guide/contracts).

```ts
await surface.replay()
```

## Export video

The renderer's `exporters` include the browser recorder (`id: 'browser-recorder'`). It has no access to the source code and can only record a live canvas, so the caller must hand it **rendering control**. The correct approach is to create a fresh canvas first and let the recorder play from the beginning on it:

```ts
const recorder = renderer.exporters.find((e) => e.id === 'browser-recorder')!
if (!(await recorder.probe()).ready) throw new Error('Screen recording is not supported in this browser')

const fresh = await renderer.createSurface(container) // ← the recorder needs a freshly created canvas
const result = await recorder.run({
  python,
  controller: {
    canvas: () => fresh.canvas(),
    isRendered: () => fresh.isRendered(),
    replay: async () => { await fresh.run(python) },
  },
  onProgress: (note) => console.log(note),
})
if (result.ok && result.kind === 'blob') {
  const url = URL.createObjectURL(result.blob)
  // <a download={result.name} href={url}> → click to download the .webm
}
```

::: warning Why the old canvas cannot be recorded directly
The recorder binds its canvas **before** playback starts; if you then call `surface.replay()` (which swaps in a new canvas), the recording stream stays on the discarded old canvas — the recording ends up as an empty file, and **no error is raised at any point**. That is why the example above creates a fresh canvas first and replays on it. See [Behavioural Contracts](/en/guide/contracts).
:::

The full export contract is in [API Reference: Export](/en/api/export).

## Next steps

- Type definitions and examples for every method, property, and hook → [API Reference](/en/api/)
- Mounting and cleanup in vanilla JS / React / Vue → [Framework Integration](/en/guide/frameworks)
- `import pandas` in your code cannot fetch the package → [Third-Party Packages](/en/guide/packages)
