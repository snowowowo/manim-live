# manim-live

[中文](./README.md) | English

Turn standard Manim (Python) code into real-time animation in a web page: no server, no local Python. The package is pure logic — no UI, no framework, no host — and embeds with a single container element.

> Full documentation (installation, framework integration, example gallery, API reference; Chinese and English): <https://snowowowo.github.io/manim-live/>

## Highlights

- **Standard Manim, unmodified**: The code is Manim CE Python as-is; 385 of 437 public API items (about 88%) are verified by real-browser measurement, and the 52 missing ones report an error with an alternative spelling.
- **Real Python, real rendering**: Pyodide runs real CPython in the browser (core about 13 MB) and manim-web produces the WebGL scene; 239 corpus examples are regression-tested in a real browser with screenshots.
- **One container element to embed**: The only entry point is `createManimRenderer()`; React, Vue and plain JS differ solely in mount timing.
- **Dry-run preflight via check()**: syntax errors, undefined names and capabilities missing per measurement return a reason immediately, instead of failing at render time.

## Quick start

```bash
pnpm add manim-live
```

```ts
import { createManimRenderer } from 'manim-live'
import 'manim-live/style.css' // optional: only fixes the canvas baseline gap

const renderer = createManimRenderer() // without pyodideIndexURL the official CDN is used
await renderer.warmup() // optional: fetch Pyodide ahead of the first render

const check = await renderer.check(python) // dry-run preflight
if (!check.ok) throw new Error(check.error)

const surface = await renderer.createSurface(document.querySelector('#stage')!)
const result = await surface.run(python) // one snippet at a time, isolated execution
surface.dispose() // really releases WASM / WebGL
```

Preflight on Node (no DOM, CI-friendly):

```ts
import { runPython, createDryRunBridge } from 'manim-live/node'

await runPython(python, createDryRunBridge())
```

What each skipped step costs, plus per-framework mounting and cleanup, are in the documentation's [Quick Start](https://snowowowo.github.io/manim-live/en/guide/quick-start) and [Framework Integration](https://snowowowo.github.io/manim-live/en/guide/frameworks).

## Behavioural contracts

1. **Page-level singleton**: the WASM runtime and the serial execution queue are shared per page; two mounted components do not start two Pyodide runtimes, but their rendering is serialized.
2. **Real disposal**: `dispose()` destroys the WASM and WebGL contexts; skipping it on SPA route changes leaks memory.
3. **Single-segment execution**: `surface.run(code)` keeps no variables between calls; concatenate segments that must share variables into one.

## Runtime assets

The package contains only logic. The assets it needs at runtime — Pyodide (CPython compiled to WASM), KaTeX styles and fonts, and on-demand Python packages such as `pandas` — are not shipped: by default they are fetched from the official CDN; for intranet or offline use, serve them from your own static path and point `pyodideIndexURL` / `katexBaseURL` at them. Self-hosting steps and the tiered diagnosis of failed fetches are in the documentation's [Installation](https://snowowowo.github.io/manim-live/en/guide/installation) and [Third-Party Packages](https://snowowowo.github.io/manim-live/en/guide/packages).

## Development

```bash
pnpm install
pnpm build             # tsdown → dist (ESM + .d.ts)
pnpm test              # corpus regression + headless real scenes + support-surface gate
pnpm typecheck
pnpm playground        # local demo bench (real-browser verification)
pnpm docs              # docs site local preview (docs/ has its own dependency graph)
```

The corpus (`corpus/examples/`) is both the regression net and the only input of the real-browser test bench; `node scripts/shot-corpus.mjs` renders every example in real Chromium and saves the screenshots.

## Scope

It is **one canvas plus one runtime**: "render Manim Python into one frame". Card UI, playback head, step-by-step narration and local mp4 export are the consumer's responsibility. The DSH plugin `dsh-manim-live` is one of its consumers.

## Licence

- The package itself is MIT licensed.
- Runtime assets keep their own licences: Pyodide is MPL-2.0 — when fetched from the official CDN this package is not the distributor; self-hosting it requires shipping its LICENSE and stating the source location.
