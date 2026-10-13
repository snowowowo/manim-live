# API Reference: Export

Export has two independent paths:

- **Browser recording** (first half of this page): a provider model where the core defines the contract and there can be several implementations, listed on [`renderer.exporters`](/en/api/renderer) with the built-in recorder always first. It needs a **live canvas**.
- **Local CLI export** (end of this page): really runs the manim command installed on the user's machine and produces an mp4 file. It needs no live canvas (source only), so it does not go through the provider interface — it is a pair of factories instead: `createLocalExport` on the Node side and `createExportClient` on the browser side.

## Exporter (type)

The shape of one export provider. Implementing your own provider means implementing this interface.

```ts
interface Exporter {
  id: string                                    // stable identifier, e.g. 'browser-recorder'
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
  controller: RenderController   // render control: used by the browser recorder
  onProgress?: (note: string) => void
}

interface RenderController {
  canvas(): HTMLCanvasElement | null
  isRendered(): boolean
  replay(): Promise<void>        // must keep the canvas element unchanged
}

type ExportResult =
  | { ok: true; kind: 'blob'; blob: Blob; name: string; mime: string }   // browser recorder
  | { ok: true; kind: 'file'; path: string }                            // local CLI
  | { ok: false; reason: 'environment' | 'error'; error?: string }
```

**Parameters**

- `request.python`: the source. Recorder implementations ignore it; local-CLI implementations use only this.
- `request.controller`: render control. Recorder implementations use only this; its three methods are in the type definition above.
- `request.onProgress`: stage updates; see [Hooks](/en/api/hooks).
- `signal`: cancellation; see [Hooks](/en/api/hooks).

**Returns** `ExportResult`, branching by implementation: `kind: 'blob'` is bytes downloadable in the browser (with a file name and mime); `kind: 'file'` is a disk path; on failure `reason` distinguishes "environment unavailable" from "execution error", with `error` giving the reason.

**Example**

```ts
// Recording needs a freshly created canvas, played from the top on it
const fresh = await renderer.createSurface(exportContainer)
const result = await recorder.run(
  {
    python,
    controller: {
      canvas: () => fresh.canvas(),
      isRendered: () => fresh.isRendered(),
      replay: async () => {
        await fresh.run(python)
      },
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

- `RenderController.replay()` has one hard requirement: **the canvas element itself must not change while it runs**, because the recorder already called `captureStream()` on whatever `controller.canvas()` returned before invoking it. [`surface.replay()`](/en/api/surface) does exactly that, so it cannot serve as the controller directly — create a fresh canvas first and let the controller's `replay` execute the source on it. Violating this requirement fails silently: a 0-byte file, with no error raised at any point.

## browserRecorder (built-in provider)

The core's first provider, `id: 'browser-recorder'`: real-time recording via `canvas.captureStream()` plus `MediaRecorder`, with no external dependency at all.

Three limits:

1. Real time only. A 60-second animation records for 60 seconds — recording samples the live canvas stream. The library itself ships timeline control (`Scene.seek(t)` / `pause()` / `resume()`, plus `PlaybackControls`), but the recorder does not use it.
2. The format depends on the browser. Usually `webm`, possibly `mp4` in Safari; the result carries `mime` and the extension is derived from it.
3. No audio track.

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
