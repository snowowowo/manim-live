# Three Contracts You Must Know

The three contracts below are also written in the header of the source file `src/index.ts`.
Read them before integrating this package into an SPA, otherwise you are very likely to run
into the problems they describe.

## 1. Multiple instances are a page-level singleton

The WASM runtime and the serial execution queue are **page-level singletons**. Mounting two
components on the same page does **not** start two 20 MB WASM instances; but their renders
**queue into the same queue and execute serially** — this is by design: a single WASM
interpreter cannot execute two pieces of Python concurrently.

What this means for the UI: two canvases are never in a "playing" state at the same time;
the later one waits for the earlier execution to finish.

## 2. dispose() is a real release

`surface.dispose()` / `renderer.dispose()` destroys the WASM runtime and the WebGL context.
SPA route switches do not destroy anything automatically; skipping the call leaks the entire
interpreter plus one WebGL context, and after a few rounds the page becomes unusable.

That is why, in framework integrations, **the cleanup function must perform a real release**
(React StrictMode deliberately runs the effect twice to check exactly this — see
[Using in Frameworks](/en/guide/frameworks#strictmode-runs-the-effect-twice)).

`renderer.dispose()` also destroys **every** canvas it ever created and removes the KaTeX
stylesheet it injected.

## 3. run() is one independent segment per call

`surface.run(code)` executes one segment at a time; **variables do not persist across runs**
(each run gets a fresh Python namespace). If you need several segments sharing variables,
concatenate them into one segment on the caller's side before calling `run()`.

`RunResult` has three fields, one dedicated to "cancellation":

```ts
interface RunResult {
  ok: boolean
  error?: string
  /** This run was cancelled (its canvas was destroyed before its turn came): not an error,
      and the caller should not display anything. */
  cancelled?: boolean
}
```

When `cancelled === true`, do **not** show `error` to the user — it is not an error, it means
the code segment never got its turn because its canvas was already destroyed (rapid repeated
clicks and page switches are both examples).

## Known Issues with Reusing a Canvas

"Same canvas, first draw a circle, then a square" — the intuitive approach is to call
`run()` twice, or to call `self.clear()` first. **Both are broken**, and only real-machine
testing reveals it:

- Calling `run()` twice: the second scene is **stacked** on top of the first (the scene was
  never cleared; `self.add()` keeps appending);
- `self.clear()`: manim's `clear()` **removes the 3D lights along with everything else**,
  so everything after that renders black.

Both are observed behavior. The correct approach is to **swap in a fresh canvas for every
redraw**:

```ts
surface.dispose()
surface = await renderer.createSurface(container)
await surface.run(code)
```

`surface.replay()` is the ready-made wrapper for exactly this semantics: cancel the current
canvas → create a new one → play the previous code segment from the beginning, in full.

::: warning Order matters between recording and replay
`replay()` swaps out the canvas element. If you `captureStream()` first and `replay()` after,
the recording stream stays attached to the discarded old canvas — the recording ends up as
an empty file, and it **fails silently the whole way through**. Create the fresh canvas
before starting to record; the built-in `browserRecorder` already handles this correctly.
:::
