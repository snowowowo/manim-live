# API Reference: Hooks

Three callbacks and signals. They are all attached at **call sites**, not on objects: there is no "subscribe to an object" API, and progress information can only come in through these parameters.

## onLoading(names)

Progress callback while third-party packages are fetched for an `import`. Three mounting points, in increasing precedence:

1. `createManimRenderer({ onLoading })`
2. `createSurface(container, { onLoading })`
3. `run(code, { onLoading })`

```ts
onLoading?: (names: string[]) => void
```

**Parameters** `names`: the package names being fetched; called once more with an empty array when done.

**Example**

```ts
const surface = await renderer.createSurface(container, {
  onLoading: (names) => {
    if (names.length === 0) return hideLoading()
    // Bundled packages and cache hits are fast; showing it immediately makes it flash. Delay ~300 ms.
    window.setTimeout(() => showLoading(names), 300)
  },
})
```

**Notes**

- Covers package fetching only, not render progress. "Rendering now" has to be tracked at the call site around `run()`.
- `print` from user code does not come through here; the core writes it to `console.info`.

## onProgress(note)

Stage updates during an export; attached on the request passed to [`exporter.run()`](/en/api/export).

```ts
onProgress?: (note: string) => void
```

**Parameters** `note`: one line of progress text, e.g. "playing from the top and recording…" or "recorded 32 KB".

**Example**

```ts
await recorder.run({ python, controller, onProgress: (note) => setStatus(note) })
```

## signal

Cancels one export. Only `exporter.run()` accepts it; `surface.run()` does not.

```ts
run(request: ExportRequest, signal?: AbortSignal): Promise<ExportResult>
```

**Example**

```ts
const abort = new AbortController()
stopButton.onclick = () => abort.abort()
await recorder.run({ python, controller }, abort.signal)
```

After an abort the recorder stops and returns `{ ok: false, reason: 'error', error: 'cancelled' }`.

**Notes**

- It cancels the export action, not the render in flight. Cancelling "the piece that is running right now" has no corresponding capability in this version; see the gap table at the end of [Low-Level Exports](/en/api/internals).
