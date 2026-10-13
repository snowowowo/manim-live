# API Reference: Node Entry

`manim-live/node` is the half that does not depend on the DOM, for servers, CI, and scripts. Importing any module that depends on the DOM or WebGL from this entry fails — that is its contract. Concepts and deployment are in [Node Precheck](/en/guide/node).

## runPython(python, bridge, options?)

Genuinely interprets a piece of Python in Pyodide, sending every drawing action to the bridge supplied by the caller.

```ts
function runPython(python: string, bridge: ManimBridge, options?: RunOptions): Promise<void>

interface RunOptions {
  output?: (text: string) => void        // where print goes; discarded if omitted
  drive?: boolean                        // whether to run the Scene subclass's construct afterwards; default true
  onLoading?: (names: string[]) => void  // package-fetch progress
  active?: () => boolean                 // asked again when this piece reaches the front; false voids it entirely
}
```

**Parameters**

- `python`: the source; both input shapes are accepted (full class shell or bare construct body).
- `bridge`: the receiver of drawing actions. Use `createDryRunBridge()` for prechecks, `createRecordingBridge()` for recording, and the browser entry's `createManimWebBridge()` for real rendering.
- `options.active`: when it returns `false`, `PyRunCancelled` is thrown without touching the interpreter — for "the caller is already gone by the time this piece reaches the front".

**Returns** `Promise<void>`. Syntax errors, undefined names, and empirically missing capabilities all throw `PyRuntimeError`, whose message carries restored line numbers.

**Example**

```ts
import { createDryRunBridge, runPython } from 'manim-live/node'

try {
  await runPython(python, createDryRunBridge())
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
}
```

## createDryRunBridge()

A "draw nothing" bridge: the code is genuinely interpreted, it just produces no picture. Used for prechecks.

```ts
function createDryRunBridge(): ManimBridge
```

## Warmup

The Node entry has **no** separate warmup function: the first `runPython()` brings up Pyodide and the manim adapter along the way (~13 MB of core), so the first piece of code in a process is noticeably slower. The warmup primitive `warmupRuntime()` is exported only from the browser entry's low-level exports — see [Low-Level Exports](/en/api/internals).

## PyRuntimeError and PyRunCancelled

```ts
class PyRuntimeError extends Error      // user-code or runtime error, with restored line numbers
class PyRunCancelled extends Error      // the caller was already voided when its turn came: not an error, not shown to users
```

Handle the two differently: report the former verbatim, and show nothing for the latter.

## Corpus Loading

Node entry only, because it reads the disk. The corpus lives in `corpus/` of the core package repository and is not part of the published package, so a regular installation cannot read it.

```ts
function collectCorpus(): Corpus          // read the disk into a Corpus; empty tables when the corpus is absent
function corpusRoot(): string             // MANIM_CORPUS wins, otherwise <package root>/corpus/examples
function corpusAvailable(): boolean       // whether this checkout has a corpus
function shotsRoot(): string              // screenshot root
function shotPath(group: string, file: string): string
const PACKAGE_ROOT: string                // the core package's own root directory
```

**Example**

```ts
import { collectCorpus, corpusAvailable } from 'manim-live/node'

if (!corpusAvailable()) {
  console.warn('no corpus in this checkout, skipping')
} else {
  const { groups, examples } = collectCorpus()
  console.log(`${groups.length} groups / ${examples.length} entries`)
}
```

## Other exports

`manim-live/node` also exports the following groups; full references live on their own pages:

| Exports | Page |
| --- | --- |
| `probePlan` / `probeCheck` / `resolveExecutable` / `pythonBesideExecutable` | [Machine Probe](/en/api/machine) |
| `createPyodideSupply` | [Packages](/en/api/packages) |
| `createLocalExport` / `sceneClassName` / `wrapConstructBody` / `buildRenderArgs` | [Export](/en/api/export) |
