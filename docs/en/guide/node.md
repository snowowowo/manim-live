# Node Precheck

This page is for prechecking Manim code in CI: how to use the Node entry, and where the precheck's ability ends. The browser entry needs a DOM, which Node does not have; `manim-live/node` provides a DOM-free dry run — precheck AI-generated code in CI first, and what fails never reaches a browser.

## Usage

```ts
import { runPython, createDryRunBridge } from 'manim-live/node'

// Dry run: syntax errors / undefined names / empirically missing manim-web capabilities throw PyRuntimeError.
try {
  await runPython(python, createDryRunBridge())
  console.log('precheck passed')
} catch (error) {
  console.error('precheck failed:', error instanceof Error ? error.message : error)
}
```

`createDryRunBridge()` supplies a "draw nothing" bridge: the Manim code is genuinely executed by the Python interpreter — type errors, misspelled class names, and unfetchable packages are all caught — it just produces no picture.

The Node entry has no separate warmup function: the first `runPython()` performs the Pyodide and adapter download and initialization along the way (~13 MB of core), which is why the first piece of code in a process is noticeably slower.

The full member list and type definitions are in [API Reference: Node Entry](/en/api/node).

## Limits

::: warning The precheck cannot catch "picture errors"
The precheck catches "code errors", not "correct code with a wrong picture" — glyphs, WebGL, and 3D lighting are problems only a real browser exposes, and still need real-machine verification (this repository's approach is `pnpm playground` plus the `pnpm check:playground` smoke test).
:::
