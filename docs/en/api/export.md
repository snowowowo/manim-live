# API Reference: Export

Export has two independent paths:

- **Browser recording** (first half of this page): a provider model where the core defines the contract and there can be several implementations, listed on [`renderer.exporters`](/en/api/renderer) with the built-in recorder always first. It needs a **live canvas**.
- **Local CLI export** (end of this page): really runs the manim command installed on the user's machine and produces an mp4 file. It needs no live canvas (source only), so it does not go through the provider interface — it is a pair of factories instead: `createLocalExport` on the Node side and `createExportClient` on the browser side.

## Exporter (type)

The shape of one export provider. Implementing your own provider means implementing this interface.

```ts
interface Exporter {
  id: string                                    // stable identifier, e.g. 'browser-video'
  label: string                                 // name shown to users
  probe(): Promise<{ ready: boolean; missing?: Array<{ id: string; label: string }> }>
  run(request: ExportRequest, signal?: AbortSignal): Promise<ExportResult>
}
```

**Fields**

- `id`: stable identifier, used to pick an implementation from `renderer.exporters`.
- `label`: UI text.
- `probe()`: whether it can run right now; see below.
- `run(request, signal)`: performs one export; see below.

## exporter.probe()

Asks whether this provider can run right now. No side effects.

```ts
probe(): Promise<{ ready: boolean; missing?: Array<{ id: string; label: string }> }>
```

**Returns** `ready` is `true` when usable; when `false`, `missing` lists the absent capabilities, each with an `id` and a `label` (e.g. `MediaRecorder`, a usable video codec, `canvas.captureStream`).

**Example**

```ts
const probe = await recorder.probe()
if (!probe.ready) {
  showMissing((probe.missing ?? []).map((item) => item.label))
  return
}
```

## exporter.run(request, signal?)

Performs one export.

```ts
run(request: ExportRequest, signal?: AbortSignal): Promise<ExportResult>

interface ExportRequest {
  python: string                 // source code: used by local-CLI implementations
  controller: RenderController   // render control: used by the browser exporter
  onProgress?: (note: string) => void
}

interface RenderController {
  canvas(): HTMLCanvasElement | null
  isRendered(): boolean
  collect(python: string): Promise<unknown | null>   // collect-run the source; hands back the scene with its timeline
}

type ExportResult =
  | { ok: true; kind: 'blob'; blob: Blob; name: string; mime: string }   // browser frame-by-frame export
  | { ok: true; kind: 'file'; path: string }                            // local CLI
  | { ok: false; reason: 'environment' | 'error'; error?: string }
```

**Parameters**

- `request.python`: the source. Browser implementations hand it to `controller.collect`; local-CLI implementations consume it directly.
- `request.controller`: render control. Browser implementations use only this; its three methods are in the type definition above.
- `request.onProgress`: stage updates; see [Hooks](/en/api/hooks).
- `signal`: cancellation; see [Hooks](/en/api/hooks).

**Returns** `ExportResult`, branching by implementation: `kind: 'blob'` is bytes downloadable in the browser (with a file name and mime); `kind: 'file'` is a disk path; on failure `reason` distinguishes "environment unavailable" from "execution error", with `error` giving the reason.

**Example**

```ts
// Collection really executes the code, so do it on a fresh blank canvas — the one the user was looking at stays untouched
const fresh = await renderer.createSurface(exportContainer)
const result = await recorder.run(
  {
    python,
    controller: {
      canvas: () => fresh.canvas(),
      isRendered: () => fresh.isRendered(),
      collect: (src) => fresh.collect(src),
    },
    onProgress: (note) => setStatus(note),
  },
  abortController.signal,
)

if (result.ok && result.kind === 'blob') {
  download(result.blob, result.name)   // derive the extension from result.mime; never hardcode .mp4
} else if (!result.ok) {
  showError(result.error)
}
fresh.dispose()
```

**Notes**

- `RenderController.collect()` **really executes the source** (animations are queued on the timeline rather than played live), so the on-screen picture ends up in its "collected" state. Do this on a fresh blank canvas so the picture the user was looking at stays untouched. If the source declares a 3D scene, the canvas is swapped for the 3D one and the returned scene is the swapped-in one — the canvas actually on screen.

## browserVideo (built-in provider)

The core's first provider, `id: 'browser-video'`: it collect-runs the source to obtain a scene with a timeline, then hands that scene to manim-web's own exporters for **frame-by-frame** output (WebCodecs first, falling back to real-time MediaRecorder sampling). Strategy selection, encoding, per-frame seeking, and scene-audio mixing all happen upstream; this package only wires up options and progress.

Three limits, plus one thing it fixes on upstream's behalf:

1. Frame-by-frame and reproducible: 60 fps (matching the on-screen rate; at 30 fps a dot travelling along a curve or text floating up shows visible stepping) and unaffected by dropped frames during playback.
2. The format depends on the browser and codec. The WebCodecs path can produce `mp4` / `webm` depending on the codec; the MediaRecorder path usually produces `webm`. The result carries `mime` and the extension is derived from it — never hard-code `.mp4`.
3. Audio exists only when the scene itself has audio attached (Manim has no audio of its own).

During an export it **temporarily resizes the scene to 1080p** (same aspect, camera frame untouched) and restores it afterwards: upstream's `width/height` only configure the encoder, while frames are captured straight from the canvas with `new VideoFrame(canvas)` — a 720p canvas stays soft no matter what size you ask for.

It also patches one upstream gap: upstream hard-codes the AVC codec string to `avc1.42001f` (Level 3.1, ceiling 1280×720), so a 1080p export is rejected by the browser inside `configure()`. For the duration of the export this package raises the level byte to match the pixel count (1080p → `0x28` = Level 4.0) and restores it on exit; encoding itself is still native (see `src/export/avc-level.ts`).

## createLocalExport(options) (Node side)

Hands a segment of Manim Python to the local CLI and renders it to an mp4 file. It passes the [Machine Probe](/en/api/machine) gate first: when a required item (python3 / manim / manimModule / ffmpeg) is absent, it returns what is missing instead of proceeding to render.

```ts
function createLocalExport(options?: LocalExportOptions): LocalExport

interface LocalExportOptions {
  outputDir?: string        // where the mp4 lands; default ~/Downloads (created if absent)
  probe?: ProbeFn           // probe used by the readiness gate; default: real machine probe
  resolve?: (tool: string) => string | null   // finds an executable on PATH; default: real addressing
  readinessTtlMs?: number   // readiness cache lifetime; default 30 seconds
}

interface LocalExport {
  exportReadiness(options?: { maxAgeMs?: number }): Promise<ExportReadiness>
  invalidateReadiness(): void
  exportVideo(options?: { python?: string; quality?: string; timeoutMs?: number; workRoot?: string }): Promise<LocalExportResult>
  revealExportedFile(target: string, options?: { run?: CommandRunner; checkOnly?: boolean }): Promise<RevealResult>
  outputDir(): string
}
```

**Parameters** (`createLocalExport` options)

| Field | Type | Default | Purpose | Consequence if omitted |
| --- | --- | --- | --- | --- |
| `outputDir` | `string` | `~/Downloads` | Where the mp4 lands (also the boundary of reveal checks) | writes into the user's Downloads folder |
| `probe` | `(id) => Promise<EnvResult \| null>` | real machine probe | How the readiness gate asks "is it installed" | runs real commands (first call may take seconds) |
| `resolve` | `(tool) => string \| null` | real addressing | Finds the manim command | searches the augmented PATH |
| `readinessTtlMs` | `number` | `30000` | Readiness cache lifetime | every call re-probes |

**`exportVideo` options**: `python` (source; a full file or a bare construct body), `quality` (`l`/`m`/`h`/`p`/`k`, default `h`), `timeoutMs` (default 10 minutes), `workRoot` (staging root, default the system temp directory).

**Returns**

```ts
type LocalExportResult =
  | { ok: true; file: string; quality: string }
  | { ok: false; reason: 'input' | 'environment' | 'render'; error?: string; missing?: ExportMissing[] }

interface ExportReadiness { ready: boolean; missing: ExportMissing[] }   // missing: { id, detail }[]
interface RevealResult { ok: boolean; code: '' | 'missing' | 'outside' | 'failed'; error: string }
```

The `missing` list of `ready:false` is directly usable for hints (grey out the button, explain what is missing on hover). LaTeX / dvisvgm are **not required items**: only formula-heavy code needs them, plain animations render without; to hint "formulas also need LaTeX", read the full readiness result.

**Example**

```ts
import { createLocalExport } from 'manim-live/node'

const local = createLocalExport()   // defaults: ~/Downloads, real machine probe

const result = await local.exportVideo({ python, quality: 'h' })
if (result.ok) {
  console.log('exported to', result.file)
} else if (result.reason === 'environment') {
  console.log('missing locally:', result.missing?.map((item) => item.detail).join(', '))
} else {
  console.log('render failed:', result.error)
}
```

**Notes**

- `exportVideo` deletes its temporary work directory when done; the final cut is **copied** out, and partial fragments (manim's `partial_movie_files`) are never passed off as the video.
- `revealExportedFile` only accepts files inside `outputDir` (it acts on the OS on the user's behalf with a path coming from the UI; anything beyond the boundary is refused); with `checkOnly: true` it merely answers whether the file is still there — not a single system command runs.
- Readiness results are TTL-cached: many cards asking the same question do not each run `manim --version`.

## createExportClient(options) (browser side)

The fetch client for the above: in the browser no commands run; the host routes are asked instead.

```ts
function createExportClient(options: { exportUrl: string }): ExportClient

interface ExportClient {
  loadExportReadiness(): Promise<ExportReadiness>              // GET  exportUrl/ready
  requestExport(python: string): Promise<LocalExportResult>    // POST exportUrl
  revealExport(path: string, options?: { checkOnly?: boolean }): Promise<RevealResult>   // POST exportUrl/reveal
}
```

**Parameters** `exportUrl`: the export route (the caller plugin's own namespace). The three endpoints share the shapes above — `LocalExportResult` / `ExportReadiness` / `RevealResult` — between host and browser.

**Returns** `ExportClient`. `requestExport` throws on transport failures and reports business failures as `ok:false`; `loadExportReadiness` and `revealExport` fall to the conservative side when unreadable (readiness = unusable, reveal = failed): a greyed-out button or an honest "cannot open" beats letting an unclear action through.

**Example**

```ts
import { createExportClient } from 'manim-live'

const client = createExportClient({ exportUrl: '/dsh-plugins/example/export' })

const readiness = await client.loadExportReadiness()
if (readiness.ready) {
  const result = await client.requestExport(python)
  if (result.ok) await client.revealExport(result.file)
}
```

**Notes**

- The `parseReadiness` / `parseReveal` parsers are exported too: responses are untrusted input (version skew, error pages from a middle layer); every field is checked and bad entries are dropped.
