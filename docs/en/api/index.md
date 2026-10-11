# Public API

Everything is exported from `manim-live` (browser entry) and `manim-live/node`
(no-DOM entry). This page follows the semantics of the built `.d.ts`; the source location
is noted per item.

## createManimRenderer(options?)

The core package's **single** public entry (a factory):

```ts
function createManimRenderer(options?: ManimRendererOptions): ManimRenderer
```

```ts
interface ManimRendererOptions {
  /** The fetch root for Pyodide (the core and on-demand packages share one address).
      Omitted = official CDN. */
  pyodideIndexURL?: string
  /** The fetch root for KaTeX (the directory holding katex.min.css and the fonts).
      Given → injects a <link>; omitted → never touches the DOM. */
  katexBaseURL?: string
  /** Progress callback while fetching packages on import (package names when starting,
      an empty array when done). */
  onLoading?: (names: string[]) => void
  /** Extra exporters. The built-in browserRecorder is always present, first in the list. */
  exporters?: Exporter[]
}
```

```ts
interface ManimRenderer {
  /** Starts Pyodide (~13 MB) ahead of time — without warming up, the user's first render
      looks like a hang. */
  warmup(): Promise<void>
  /** Dry-run precheck: syntax errors / undefined names / empirically missing manim-web
      capabilities return ok:false on the spot. */
  check(python: string): Promise<CheckResult>
  /** Creates a canvas inside the given container; the container is caller-provided and
      its lifecycle is caller-managed. */
  createSurface(container: HTMLElement, options?: SurfaceOptions): Promise<Surface>
  /** Available exporters (the built-in recorder + whatever the consumer passed in). */
  exporters: readonly Exporter[]
  /** The currently active Pyodide fetch root (for diagnostics). */
  pyodideIndexURL(): string
  /** Tears down every canvas this instance created and removes the injected style and
      script tags. */
  dispose(): void
}

interface CheckResult {
  ok: boolean
  error?: string
}
```

## Surface

One canvas. `run()` is queued internally and executes serially (multiple instances on a
page share one queue):

```ts
interface Surface {
  /** Runs one segment of Manim Python. */
  run(code: string, handlers?: RunHandlers): Promise<RunResult>
  /** Cancels the current canvas → creates a new one → genuinely replays the previous
      code segment from the beginning. ⚠️ Swaps out the canvas element. */
  replay(): Promise<void>
  /** The current canvas element; null when not yet created. */
  canvas(): HTMLCanvasElement | null
  /** Does the canvas have a picture yet (recording is only worth it when non-empty). */
  isRendered(): boolean
  /** Tears down this canvas; every run after that is cancelled, never actually executed. */
  dispose(): void
}

interface SurfaceOptions {
  /** Fast mode: skip time and land directly on the final state (for screenshots /
      full renders). */
  fast?: boolean
  /** Progress callback while fetching packages on import (for consumers that skipped
      the factory; run()'s handlers take precedence). */
  onLoading?: (names: string[]) => void
}

interface RunResult {
  ok: boolean
  error?: string
  /** This run was cancelled (the canvas was torn down before its turn came): not an
      error — the caller should not display a single word of it. */
  cancelled?: boolean
}

interface RunHandlers {
  /** Same as onLoading; private to this run, takes precedence over the factory and
      SurfaceOptions. */
  onLoading?: (names: string[]) => void
  /**
   * Execution context. ⚠️ **Reserved signature, not yet implemented**: the semantics are
   * settled (the same context keeps variables across runs, a new context starts from
   * zero), but every run currently gets a fresh namespace — see contract three of
   * "Three Contracts".
   */
  context?: string
}
```

## Exporters

Exporting follows a **provider** pattern: the core defines the interface, implementations
are pluggable.

```ts
interface Exporter {
  id: string
  label: string
  /** Whether this implementation is usable right now: the recorder checks MediaRecorder,
      the local CLI probes for ffmpeg / manim. */
  probe(): Promise<{ ready: boolean; missing?: Array<{ id: string; label: string }> }>
  run(request: ExportRequest, signal?: AbortSignal): Promise<ExportResult>
}

interface ExportRequest {
  /** The source code. Only the local CLI implementation uses this. */
  python: string
  /** Render control. Only the browser recorder implementation uses this (it has no source
      code — it needs that living canvas). */
  controller: RenderController
  /** Progress notes, for the UI to display. */
  onProgress?: (note: string) => void
}

/** The control the browser recorder needs to "genuinely replay from the beginning";
    the canvas element must not change during replay. */
interface RenderController {
  canvas(): HTMLCanvasElement | null
  isRendered(): boolean
  replay(): Promise<void>
}

type ExportResult =
  | { ok: true; kind: 'blob'; blob: Blob; name: string; mime: string }  // browser recording (.webm)
  | { ok: true; kind: 'file'; path: string }                            // local CLI (disk path)
  | { ok: false; reason: 'environment' | 'error'; error?: string }
```

The built-in `browserRecorder` is also exported separately (`id: 'browser-recorder'`) and
can be passed into `createManimRenderer({ exporters })` together with other providers. Why
the recorder needs "render control" instead of source code, and why the canvas must not be
swapped mid-replay, are covered in
[the contracts](/en/guide/contracts#known-issues-with-reusing-a-canvas).

## Node Entry (manim-live/node)

```ts
/** Dry-runs a piece of Python: syntax / undefined names / empirically missing manim-web
    capabilities throw PyRuntimeError. */
function runPython(python: string, bridge: Bridge): Promise<void>

/** A "draw nothing" bridge — the code is genuinely interpreted, it just produces no picture. */
function createDryRunBridge(): Bridge

function warmupRuntime(): Promise<void>

class PyRuntimeError extends Error
```

## Corpus Helpers (Optional)

If you manage a batch of Manim corpus entries like this repository does (grouping, ids,
screenshot paths, file-header assertions), these exports share one implementation with the
Node-side `collectCorpus()` — one vocabulary for both browser and Node:

```ts
function parseCorpus(value: unknown): Corpus          // boundary validation of untrusted input
function buildCorpus(source: CorpusSource): Corpus
const GROUPS: readonly string[]                       // 17 group names
function exampleId(group: string, file: string): string
function parseExampleHeader(source: string): ExampleHeader   // @expect / @note in the file header
function shotPath(group: string, file: string): string
```

## Other Low-Level Exports

For consumers who want to drive the runtime directly / manage the canvas themselves (the
upstream screenshot and API-probe scripts use the build output exactly this way):
`runPython`, `setPyodideLoader`, `warmupRuntime`, `createManimWebBridge`,
`createRecordingBridge`, `createDryRunBridge`, `planMethod / planAnimate / planCreate`,
`resolveSceneKind / SCENE_FAMILY`, `canonicalPackageName`, `loadManim`,
`createScene / createSceneSlot`, `injectKatexStyles`, `DEFAULT_PYODIDE_INDEX_URL`,
`PY_API_MAP`. The exact semantics of each are governed by the `.d.ts` and the source
comments.
