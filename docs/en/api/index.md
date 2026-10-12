# API Reference: Overview and Entry

The public interface of `manim-live` is split across nine pages by object: this page covers the object map and the entry factory; each other page covers every member of one object. Each member gets a type definition, parameter notes, return value, and an example you can copy as-is. The browser entry is `manim-live`; the entry that never touches the DOM is `manim-live/node`. For a first run see [Quick Start](/en/guide/quick-start); for the behavioural contracts you must know before integrating see [Behavioural Contracts](/en/guide/contracts).

| Page | Contents |
| --- | --- |
| [Renderer](/en/api/renderer) | `warmup` / `check` / `createSurface` / `exporters` / `pyodideIndexURL` / `dispose` |
| [Canvas](/en/api/surface) | `run` / `replay` / `canvas` / `isRendered` / `dispose`, plus how to redraw new content |
| [Hooks](/en/api/hooks) | `onLoading` / `onProgress` / `signal` |
| [Environment Status](/en/api/status) | `environmentStatus` / `onEnvironmentStatus`: capabilities / runtime / KaTeX / package fetching |
| [Export](/en/api/export) | The `Exporter` contract, `probe` / `run`, and the three limits of the built-in recorder |
| [Node Entry](/en/api/node) | The half that never touches the DOM: dry-run precheck and corpus loading |
| [Corpus and Test Bench](/en/api/corpus) | Corpus format functions, verdict / tally / report |
| [Low-Level Exports](/en/api/internals) | Implementation parts, and what this version does not provide |

## Object Map

Everything starts at `createManimRenderer()`. It is the package's only entry factory, and the tree below is the whole of what a consumer can hold:

```
createManimRenderer(options)          → ManimRenderer        usually one per page
├─ warmup()                           → Promise<void>
├─ check(python)                      → Promise<CheckResult>
├─ createSurface(container, options)  → Promise<Surface>     one per canvas
│  ├─ run(code, handlers)             → Promise<RunResult>
│  ├─ replay()                        → Promise<void>
│  ├─ canvas()                        → HTMLCanvasElement | null
│  ├─ isRendered()                    → boolean
│  └─ dispose()                       → void
├─ exporters                          → readonly Exporter[]  a property, not a method
│  └─ each Exporter
│     ├─ id                           → string
│     ├─ label                        → string
│     ├─ probe()                      → Promise<{ ready, missing? }>
│     └─ run(request, signal)         → Promise<ExportResult>
├─ pyodideIndexURL()                  → string
└─ dispose()                          → void
```

Three notes on reading the map:

- A `Surface` can only be obtained from the renderer (`createSurface()`); it cannot be constructed on its own. Exporters come from `renderer.exporters`, where the built-in one is always first in the list.
- On the renderer everything is a method except `exporters`, which is an array property. All five members of `Surface` are methods; it has no properties.
- State is not exposed as object properties: the outcome of a run lives in the return value of `run()`, whether the canvas holds a picture is queried with `isRendered()`, and progress information has two outlets — the per-call `onLoading`, and the module-level [Environment Status](/en/api/status).

## createManimRenderer(options?)

The package's only entry factory; creates a renderer. A page usually needs one instance: multiple instances share the same page-level runtime and execution queue.

```ts
function createManimRenderer(options?: ManimRendererOptions): ManimRenderer
```

**Parameters** `options`, all four fields optional:

| Field | Type | Default | Purpose | Consequence of omitting it |
| --- | --- | --- | --- | --- |
| `pyodideIndexURL` | `string` | Official CDN | Base URL for both the Pyodide core and on-demand third-party packages; both read this one address and are verified against the sha256 in `pyodide-lock.json` | Uses the public CDN; an intranet or offline deployment cannot fetch the runtime |
| `katexBaseURL` | `string` | Not injected | Directory holding `katex.min.css` and the fonts; when given, one `<link>` is injected (deduplicated by URL) | The DOM is left untouched; formulas laid out by `MathTex` have no styling |
| `onLoading` | `(names: string[]) => void` | None | Progress callback while packages are fetched for an `import`; see [Hooks](/en/api/hooks) | The UI has no "fetching packages" indicator |
| `exporters` | `Exporter[]` | Empty | Additional export providers, listed after the built-in recorder; see [Export](/en/api/export) | Only the built-in browser recorder is available |

**Returns** `ManimRenderer`, whose six members are documented on the [Renderer](/en/api/renderer) page.

**Example**

```ts
import { createManimRenderer } from 'manim-live'
import 'manim-live/style.css'   // optional: only fixes the canvas baseline gap

const renderer = createManimRenderer({
  katexBaseURL: '/assets/katex/',
  onLoading: (names) => console.log(names.length > 0 ? `fetching: ${names.join(', ')}` : 'fetch done'),
})
```

**Notes**

- By the time it returns, the Pyodide loader is already installed — it does not wait for `createSurface()`, because `check()` may be called before any canvas exists.
- Creating the renderer does not start the download; that happens on `warmup()` or on the first `run()`.
