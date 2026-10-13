# API Reference: Renderer

The renderer (`ManimRenderer`) is created by [`createManimRenderer()`](/en/api/) — usually one per page. It has six members: five methods and one array property. This page documents each of them. The object map is on the [overview](/en/api/); the canvas half is on the [Canvas](/en/api/surface) page.

## renderer.warmup()

Downloads and initializes Pyodide plus the manim adapter layer ahead of time. Without it, the first render waits for the full download to finish, with no visual progress in the meantime.

```ts
warmup(): Promise<void>
```

**Parameters** None.

**Returns** `Promise<void>`; resolving means the runtime is usable. The first call fetches the Pyodide core (~13 MB) and numpy (~3 MB). It returns no runtime object — warming up only moves the wait off the user's first `run()`.

**Example**

```ts
// Call it when the UI mounts, rather than when the user triggers a render
renderer.warmup().then(
  () => setStatus('Runtime ready'),
  (error) => {
    console.error('[manim] warmup failed:', error)
    setStatus('Runtime failed to load, retry available')
  },
)
```

**Notes**

- It can be called repeatedly: the runtime initializes once, and a failed initialization drops its cached Promise so the next call retries.
- Warmup and `run()` share one queue. Renders submitted during warmup line up behind it; two pieces of code never initialize concurrently.

## renderer.check(python)

Dry-run precheck: the code is genuinely interpreted, it just produces no picture. It catches syntax errors, undefined names, and capabilities empirically missing from manim-web.

```ts
check(python: string): Promise<CheckResult>

interface CheckResult {
  ok: boolean
  error?: string       // present when ok is false; carries line numbers
  warnings?: string[]  // non-blocking notices; absent when there is nothing to notice
}
```

**Parameters**

- `python`: the Manim Python source to check; both input shapes are accepted, see `run()` on the [Canvas](/en/api/surface) page.

**Returns** `Promise<CheckResult>`: `ok` is `true` when the precheck passes; when it is `false`, `error` gives the reason.

**Example**

```ts
const result = await renderer.check(python)
if (!result.ok) {
  showError(result.error)   // hand it to the user or the model as-is
  return
}
const surface = await renderer.createSurface(container)
await surface.run(python)
```

**Notes**

- It touches no DOM and needs no canvas, so it can run before rendering.
- Empty source (zero length after trimming) returns `{ ok: true }` immediately, without starting the runtime.
- A failed precheck is a conclusion rather than a fault, so the core logs it with `console.info` and not `console.error` — filtering a batch of code will not flood the console.
- Passing the precheck does not guarantee a successful render: it runs against a "draw nothing" bridge, so errors that involve real drawing or layout only surface in `run()`.
- When the code contains `MathTex` / `Tex` but the renderer was created without `katexBaseURL`, `warnings` carries one notice (formulas will render unstyled); it does not change the `ok` verdict.
- Available on the browser entry only. On the Node side, combine `runPython` with `createDryRunBridge` from `manim-live/node`; see [Node Entry](/en/api/node).

## renderer.createSurface(container, options?)

Builds a canvas inside the given container and returns it.

```ts
createSurface(container: HTMLElement, options?: SurfaceOptions): Promise<Surface>

interface SurfaceOptions {
  fast?: boolean                              // default false
  onLoading?: (names: string[]) => void       // default callback for every run on this canvas
}
```

**Parameters**

- `container`: the canvas container element, provided by the caller, who also owns its lifecycle.
- `options.fast`: turbo mode. Animation durations are compressed to 0 and `wait` only advances updaters, landing straight on the final state. Fixed at canvas creation and immutable afterwards.
- `options.onLoading`: default package-fetch callback for every `run()` on this canvas; a per-run `onLoading` takes precedence.

**Returns** `Promise<Surface>`. It is a Promise because building a canvas first loads manim-web and creates a WebGL scene. The five members of `Surface` are on the [Canvas](/en/api/surface) page.

**Example**

```ts
const surface = await renderer.createSurface(document.querySelector('#stage')!, {
  onLoading: (names) => console.log(names.length > 0 ? `fetching: ${names.join(', ')}` : 'fetch done'),
})
```

**Notes**

- The core neither creates nor moves the container; it appends a canvas into it and adds the `manim-live-surface` class. When the scene is replaced (`replay()`, or 3D code) the container is emptied first and the new canvas is appended.
- Canvas resolution is fixed at 1280×720 and does not follow the container size (auto-resize is off internally). To change the displayed size, scale the container with CSS; the coordinate system is unaffected — the frame is always 8 units high and about 14.22 wide at 16:9, matching standard Manim's default frame.
- The canvas background is fully transparent, so the host page's background and theme show through.
- Changing the `fast` setting means destroying and recreating the canvas, which costs a full re-run of the code.
- A page may hold several canvases, but they share one interpreter and one execution queue, so rendering is serial: two canvases are never playing at the same time.

## renderer.exporters

The list of available export providers. A property, not a method. The built-in browser frame-by-frame exporter (`id: 'browser-video'`) is always first; providers passed at creation follow it.

```ts
readonly exporters: Exporter[]
```

**Example**

```ts
for (const exporter of renderer.exporters) {
  const probe = await exporter.probe()
  console.log(exporter.label, probe.ready ? 'ready' : `missing: ${(probe.missing ?? []).map((m) => m.label).join(', ')}`)
}
```

The shape and usage of a provider are on the [Export](/en/api/export) page.

## renderer.pyodideIndexURL()

The Pyodide base URL in effect. For diagnostics.

```ts
pyodideIndexURL(): string
```

**Returns** The address actually in effect: the installed loader's address first, then the `pyodideIndexURL` given at creation, then the official CDN default.

## renderer.dispose()

Releases every canvas this instance created and removes the KaTeX stylesheet it injected.

```ts
dispose(): void
```

**Notes**

- A real release: it destroys the WASM and WebGL contexts. Skipping it on an SPA route change leaks; after a few times the page becomes unusable.
- It removes only the styles it injected itself, never styles the consumer added.
- On page unload, calling it or each canvas's `dispose()` is enough; calling both is safe.
