# Behavioural Contracts

This page lists three behavioural contracts and one known issue you must know before integrating; all four determine how lifecycle code is written in an SPA. The first two are also written in the header of `src/index.ts`. Parameters and examples for each method are in the [API Reference](/en/api/).

## Page-level singleton

The WASM runtime and the serial execution queue are **page-level singletons**. Mounting two components on the same page does **not** start two Pyodide runtimes (~13 MB core); but their renders **queue into the same queue and execute serially** — this is by design: a single WASM interpreter cannot execute two pieces of Python concurrently.

What this means for the UI: two canvases are never in a "playing" state at the same time; the later one waits for the earlier one to finish.

## Real release

`surface.dispose()` and `renderer.dispose()` destroy the WASM and WebGL contexts. SPA route changes do not dispose automatically; without the call you leak the whole interpreter plus one WebGL context, and after a few repetitions the page becomes unusable.

Therefore the cleanup function in framework integration must **perform a real release** (React StrictMode deliberately runs effects twice to check this; see [Framework Integration](/en/guide/frameworks)).

`renderer.dispose()` destroys **all** canvases it created and removes the KaTeX stylesheet it injected.

## One segment per run

`surface.run(code)` executes one segment at a time, and **variables do not persist across runs** (each run gets a fresh Python namespace). To execute several segments that share variables, join them into one segment at the call site before `run()`.

`RunResult` has three fields, one of which is dedicated to "voided":

```ts
interface RunResult {
  ok: boolean
  error?: string
  /** This run was voided (the canvas was disposed before its turn): not an error; show nothing. */
  cancelled?: boolean
}
```

When `cancelled === true`, **do not** show `error` to the user — that is not an error; it means the segment had not reached the front of the queue when its canvas was destroyed (rapid consecutive clicks and page switches both produce this).

## Known issues with reusing a canvas

"On the same canvas, draw a circle first, then a square" — the intuitive approaches are calling `run()` twice, or calling `self.clear()` first. **Both have problems**, and only a real machine reveals them:

- Calling `run()` twice: the second picture **overlays** the first (the scene is not cleared; `self.add()` keeps appending);
- `self.clear()`: manim's `clear()` removes **the 3D lights along with everything else**, so the picture afterwards is black.

Both are measured behaviours. The correct approach is to **swap in a new canvas for every redraw**:

```ts
surface.dispose()
surface = await renderer.createSurface(container)
await surface.run(code)
```

`surface.replay()` is the ready-made encapsulation of exactly this semantics: void the current canvas → create a new one → play the previous code segment from the beginning.

::: warning Ordering of recording and replay
`replay()` swaps the canvas element. If you `captureStream()` first and then `replay()`, the recording stream stays on the discarded old canvas — the recording ends up as an empty file, and **no error is raised at any point**. Create the new canvas first and then start recording; the built-in `browserRecorder` already follows this order.
:::
