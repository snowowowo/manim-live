# API Reference: Low-Level Exports

These are public exports too, but they are implementation parts: a normal integration uses none of them. You reach for them when writing a screenshot script, an API probe, or an adapter for some host — that is, when you take over the canvas or the interpreter yourself. The `.d.ts` files and the source comments govern their exact semantics.

## Driving the Runtime Directly

- `runPython(python, bridge, options?)`: genuinely interprets a piece of Python in Pyodide, sending every drawing action to the given bridge. Exported from both entries.
- `setPyodideLoader(loader)`: injects the fetch loader. `createManimRenderer()` already calls it internally; only needed when you bypass the factory and take over the runtime yourself.
- `warmupRuntime()`: the warmup primitive; `renderer.warmup()` is exactly this.
- `PyRuntimeError`: user-code or runtime error, message carries restored line numbers.
- `PyRunCancelled`: the caller was already voided when its turn came. Not an error; not shown to users.
- `DEFAULT_PYODIDE_INDEX_URL`: the official CDN default, as a constant.

## Bridges and the Support Surface

- `createManimWebBridge(options)`: the real bridge, sending drawing actions to manim-web scenes. Its options take `fast` (turbo) and `sceneFor` (how 3D scenes are built).
- `createRecordingBridge()`: the recording bridge, capturing every drawing action as an op without drawing. Used by screenshot scripts and API probes.
- `createDryRunBridge()`: the empty bridge; the code is genuinely interpreted but produces no picture. Used for prechecks.
- `planMethod` / `planAnimate` / `planCreate`: planning functions of the support-surface SSOT — how one Manim CE call lands on manim-web, what is missing, and how it is compensated.
- `PY_API_MAP` / `PY_ANIMATE_METHODS`: the support-surface tables themselves (generated): which constructs are supported and how they land.
- `resolveSceneKind` / `SCENE_FAMILY`: scene-family resolution — `class X(ThreeDScene)` needs a real 3D scene.
- `THREE_D_CAMERA_DEFAULTS` / `FRAME_HEIGHT`: 3D camera defaults and the standard frame height (the picture is always 8 units high).
- `canonicalPackageName(name)`: package-name normalization, one implementation shared by browser and Node.
- `HANDLE_KEY` / `GROUP_KEY` / `ANIMATE_KIND`: key-name constants of the bridge protocol.

## Canvas Internals

- `loadManim()`: loads the manim-web runtime.
- `createScene(container, manim, width, height, options?)`: builds one scene (including the upstream patch and frame normalization).
- `createSceneSlot(container, manim, width, height, options?)`: builds a scene slot that **swaps**: 2D to start, replaced by a real 3D scene when 3D code runs.
- `SURFACE_CLASS`: the class-name constant the core adds to the container.
- `injectKatexStyles(baseURL)`: injects KaTeX styles; idempotent, deduplicated by URL.

## Not Available in This Version

Listed item by item so you can judge whether a given UI is buildable. These are known gaps in the current version, not design intent:

| Requirement | Today's workaround |
| --- | --- |
| A "playing / paused" state and a subscription | Track a boolean at the call site: set it before `run()`, clear it after the `await` |
| Progress: step N of M, elapsed time | None; the UI can only show "rendering" |
| Fast-forward to the final state mid-playback | Create the canvas with `fast: true`, destroy and rebuild it, and re-run the whole piece |
| Jump to step N, previous step, next step | None |
| Cancel the run in flight and keep the canvas | None; `dispose()` destroys the canvas too. A Stop button usually just stops awaiting the Promise, while the Python still runs to completion in the queue |
| Queue depth, or your position in it | None; multi-canvas scenes need their own scheduler |
| Capturing `print` from user code | Use the low-level `runPython(code, bridge, { output })` |
| Dry-run precheck in Node | Combine `runPython` with `createDryRunBridge` from `manim-live/node` |
