# Dry-Run Precheck in Node

This page is for prechecking Manim code in CI: how to use the Node entry, and what precheck can and cannot catch.

The browser entry needs a DOM, which Node doesn't have. `manim-live/node` provides two
pure-Node entry points for **DOM-free dry-run prechecks** — the typical scenario is CI:
precheck AI-generated code in CI first, and whatever fails never needs to reach the browser.

## Two Entry Points

```ts
import { runPython, createDryRunBridge } from 'manim-live/node'

// Dry run: syntax errors / undefined names / empirically missing manim-web capabilities throw PyRuntimeError.
try {
  await runPython(python, createDryRunBridge())
  console.log('Precheck passed')
} catch (error) {
  console.error('Precheck failed:', error instanceof Error ? error.message : error)
}
```

### createDryRunBridge provides a "draw nothing" bridge

The Manim code is genuinely executed by the Python interpreter (type errors, misspelled
class names, and unfetchable packages are all caught) — it just produces no picture.

### warmup is also available on the Node side

Use it to warm up the Pyodide download in your process, so the first CI step doesn't burn
its time on the 13 MB download.

## Capability Boundary

::: warning The precheck cannot catch "wrong pictures"
The precheck catches "broken code", not "correct code rendering the wrong picture" — glyph
issues, WebGL behavior, 3D lighting, and anything else only a real browser can expose still
need real-machine verification (this repository's approach is `pnpm playground` +
`pnpm check:playground` smoke tests).
:::
