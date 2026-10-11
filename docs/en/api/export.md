# API Reference: Export

Export follows a provider model: the core defines the contract, and there can be several implementations. The provider list lives on [`renderer.exporters`](/en/api/renderer), with the built-in browser recorder always first.

## Exporter (type)

The shape of one export provider. Implementing your own provider (e.g. a local manim CLI rendering mp4) means implementing this interface.

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

1. Real time only. A 60-second animation records for 60 seconds, with no fast-forward — manim-web animations are driven by rAF time and expose no offline frame-by-frame API.
2. The format depends on the browser. Usually `webm`, possibly `mp4` in Safari; the result carries `mime` and the extension is derived from it.
3. No audio track.
