# API Reference: Environment Status

Two module-level functions that read the four groups of runtime conditions which decide whether a picture can be produced — browser capabilities, the Pyodide runtime, KaTeX styles, and on-demand package fetching — as a snapshot or as a subscription. The difference from [Hooks](/en/api/hooks) is the mounting point: hooks attach at **call sites** and serve a single call; environment status attaches at the **module** and serves a page-wide status UI or diagnostics panel. Available on the browser entry only.

## environmentStatus()

A snapshot of the current environment status. It initiates no loading and no probe requests; it only reads state that has already happened.

```ts
function environmentStatus(): EnvironmentStatus

interface EnvironmentStatus {
  capabilities: { wasm: boolean; webgl: boolean; videoExport: boolean }
  runtime: { phase: 'idle' | 'loading' | 'ready' | 'error'; error?: string; indexURL: string | null }
  katex: { baseURL: string | null; phase: 'unconfigured' | 'loading' | 'loaded' | 'error'; error?: string }
  packages: { fetching: string[]; lastError?: string }
  hints: string[]
}
```

**Returns** Field meanings:

| Field | Meaning |
| --- | --- |
| `capabilities.wasm` | Whether the browser supports WebAssembly (precondition for Pyodide to start) |
| `capabilities.webgl` | Whether a WebGL context can be obtained (precondition for manim-web to produce a picture) |
| `capabilities.videoExport` | Whether the browser frame-by-frame export (browser-video) is available — WebCodecs or MediaRecorder is enough; missing it affects export only, not rendering |
| `runtime.phase` | Pyodide runtime lifecycle: not loaded / loading / ready / failed |
| `runtime.error` | The original failure text when `phase` is `error` |
| `runtime.indexURL` | The currently registered Pyodide fetch root; `null` when no loader was ever installed |
| `katex.phase` | KaTeX styles: unconfigured / loading / loaded / failed |
| `packages.fetching` | Names of packages being fetched; an empty array when nothing is fetching |
| `packages.lastError` | The human-readable cause of the most recent fetch failure (including the tiered diagnosis) |
| `hints` | One actionable sentence per unmet condition; an empty array when all are met |

**Example**

```ts
import { environmentStatus } from 'manim-live'

const status = environmentStatus()
if (status.hints.length > 0) showBanner(status.hints)
```

**Notes**

- A snapshot does not replace action: pre-fetch the runtime with `warmup()`, precheck code with `check()`.
- Capability probes are computed once and cached. In Node / SSR, `document` is absent, `webgl` is always `false`, and capability hints are not emitted — that is not a rendering environment.
- `hints` carries only hard unmet conditions (missing capability, runtime or KaTeX load failure, package fetch failure). "KaTeX not configured" is a configuration choice and speaks only through `check()`'s `warnings`.

## onEnvironmentStatus(cb)

Subscribes to environment status changes: any transition of the runtime phase, any KaTeX load result, any package-fetching progress broadcasts the latest snapshot once. Returns an unsubscribe function.

```ts
function onEnvironmentStatus(cb: (status: EnvironmentStatus) => void): () => void
```

**Parameters** `cb`: receives the latest snapshot. If the callback itself throws, the core logs it with `console.error` and the other subscribers are unaffected.

**Returns** `() => void`: unsubscribe. Remember to call it on SPA route changes.

**Example**

```ts
const unsubscribe = onEnvironmentStatus((status) => {
  setChips(status) // the status UI is the consumer's own
  if (status.packages.fetching.length > 0) showLoading(status.packages.fetching)
})

unsubscribe()
```

**Notes**

- Broadcasts are synchronous: the callback runs within the same synchronous flow as the state transition; do no heavy work inside it.
- It coexists with the per-call `onLoading` without conflict: that one attaches at call sites and serves a single card; this one attaches at the module and serves the whole page.
