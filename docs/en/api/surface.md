# API Reference: Canvas

A canvas (`Surface`) is created by [`renderer.createSurface()`](/en/api/renderer) — one instance per canvas; it cannot be constructed on its own. It has five members, all methods. The renderer half is on the [Renderer](/en/api/renderer) page.

## surface.run(code, handlers?)

Executes a piece of Manim Python on this canvas. Resolving means the piece finished and the animation played to its end.

```ts
run(code: string, handlers?: RunHandlers): Promise<RunResult>

interface RunHandlers {
  onLoading?: (names: string[]) => void
  context?: string        // placeholder; supplying it throws
}

interface RunResult {
  ok: boolean
  error?: string
  cancelled?: boolean
}
```

**Parameters**

- `code`: Manim Python source. Two shapes are accepted (**write a complete file by default**; see [Behavioural Contracts](/en/guide/contracts) for the rule), and error line numbers map back to the source you passed in:

```python
# Shape one: a full class shell. If `from manim import *` is missing the core adds it.
from manim import *

class CircleScene(Scene):
    def construct(self):
        circle = Circle(radius=1.2)
        self.play(Create(circle))
```

```python
# Shape two: a bare construct body. The core wraps it in a shell and handles the indentation.
circle = Circle(radius=1.2)
self.play(Create(circle))
```

- `handlers.onLoading`: package-fetch callback for this run; takes precedence over the canvas-level and factory-level ones; see [Hooks](/en/api/hooks).
- `handlers.context`: placeholder for an execution context that preserves variables across runs. Not implemented; supplying it throws.

**Returns** `Promise<RunResult>`:

- `ok`: whether the piece finished successfully.
- `error`: the failure reason — a user-code or runtime error, readable as-is, with line numbers.
- `cancelled`: `true` means the segment had not started executing and its canvas had already been disposed. Not an error; nothing should be shown to the user.

**Example**

```ts
const result = await surface.run(python)
if (result.cancelled === true) return          // the canvas was disposed; show nothing
if (!result.ok) showError(result.error)
```

**Notes**

- Every `run()` gets a fresh Python namespace — **variables do not persist across runs**. To execute several pieces that share variables, join them into one piece at the call site.
- Multiple `run()` calls are queued in submission order; the canvas has a single writer.
- A piece cannot be interrupted once it has started.
- There is no callback for `print` in user code; the core writes it to `console.info`. Capturing output requires the low-level `runPython(code, bridge, { output })`.
- When the code declares `class X(ThreeDScene)`, the core swaps the 2D canvas for a real 3D one during the run, which changes the canvas element. If you are recording or holding a reference, call `canvas()` again.

## surface.replay()

Plays the source of this canvas's **most recent `run()`** again from the top: it invalidates the current scene, creates a new canvas, then executes the same code.

```ts
replay(): Promise<void>
```

**Parameters** None.

**Returns** `Promise<void>`; resolving means that playback finished.

**Example**

```ts
await surface.run(python)      // must have run once, otherwise replay() throws
await surface.replay()         // plays from the start again
```

**Notes**

- With nothing to replay it throws rather than returning a failed result.
- **It swaps the canvas element.** Calling it after a recording has started leaves the capture stream on the discarded canvas, producing a 0-byte file and raising no error at any point; see [Export](/en/api/export).
- It reuses the previous `handlers` and the `fast` setting given at canvas creation.

## surface.canvas()

The current canvas element.

```ts
canvas(): HTMLCanvasElement | null
```

**Returns** `HTMLCanvasElement`, or `null` until a canvas exists.

**Example**

```ts
const element = surface.canvas()
if (element !== null && surface.isRendered()) {
  const url = element.toDataURL('image/png')   // grab a thumbnail of the final frame
}
```

**Notes**

- After `replay()` it returns a **new element** — the previous one has been discarded — and a 2D-to-3D scene swap changes it too. If you hold it for recording or screenshots, re-read it after either event.

## surface.isRendered()

Whether a piece of code has finished successfully on this canvas. A synchronous query; triggers no rendering.

```ts
isRendered(): boolean
```

**Returns** `boolean`.

**Notes**

- It means "executed successfully", **not** "the pixels are non-empty". Code that executes successfully but draws nothing still gives `true`; confirming that the picture has content requires reading the pixels at the call site.
- It goes back to `false` during `replay()` and to `true` when that playback finishes.

## surface.dispose()

Destroys this canvas: releases mobjects and the WebGL context, and detaches the canvas from the container.

```ts
dispose(): void
```

**Notes**

- After it, every `run()` on that canvas is void and returns `{ ok: false, cancelled: true }` without executing.
- A real release, not a flag. Cleanup functions in frameworks must actually call it; React StrictMode deliberately runs effects twice to check this.

## Drawing New Content

Two consecutive `run()` calls on the same canvas **overlay** the second picture on the first, and `Scene.clear()` removes the 3D lights as well, after which the picture is black. To draw different content, destroy the canvas and build a new one:

```ts
surface.dispose()
surface = await renderer.createSurface(container)
await surface.run(nextPython)
```

`replay()` is the ready-made form of the same semantics; the only difference is that it re-runs the previous piece of code. The reasons and the observed behaviour are in [Behavioural Contracts](/en/guide/contracts).
