# API Reference: Corpus and Test Bench

Use this group only if you manage a batch of Manim corpus entries yourself, or run a batch of cases and need a receipt. None of it touches `node:`, so both entries export it; the disk-reading loaders are on the [Node Entry](/en/api/node) page only.

## Corpus Format

```ts
function parseCorpus(value: unknown): Corpus          // boundary validation of untrusted input; bad data means "no corpus"
function buildCorpus(sources: readonly CorpusSource[], options?: {
  hasShot?: (shot: string) => boolean
  requireComplete?: boolean
}): Corpus
const GROUPS: ReadonlyArray<{ id: string; title: string; network?: boolean }>
function exampleId(group: string, file: string): string
function parseExampleHeader(source: string): ExampleHeader   // @expect / @note / @template in the file header
function shotPath(group: string, file: string): string
```

**Members**

- `parseCorpus`: when a consumer supplies a batch of corpus entries itself (own backend, static JSON, paste-import), what the browser receives is untrusted input — version drift, proxy rewriting, or manual edits can all make its structure diverge. This function folds invalid data into "no corpus" instead of letting it crash the page.
- `buildCorpus`: folds "group + file name + source + path" into a `Corpus`. The browser-side source is the bundler (vite's `import.meta.glob`); the Node side reads the disk. Both converge into a Corpus through this one function, so the vocabulary cannot diverge. With `requireComplete: true`, an unregistered group or a group emptied out raises an error immediately.
- `GROUPS`: the registry of 20 groups. A corpus directory not registered here raises an error, so a newly added folder cannot be silently missed.
- `exampleId`: group plus file name (sorting prefix stripped) forms the stable id.
- `parseExampleHeader`: parses the docstring header — first line is the title, `@expect` is the expected picture, `@reject` pins the word the error must contain, `@note` is the provenance, `@template` marks a skill template.
- `shotPath`: the screenshot path for one entry; defined in exactly one place in the whole repository.

**Example**

```ts
import { buildCorpus, parseCorpus, type CorpusSource } from 'manim-live'

// Browser side: the bundler has already read the sources into strings
const sources: CorpusSource[] = files.map((file) => ({
  group: file.group,
  name: file.name,
  file: `corpus/examples/${file.group}/${file.name}`,
  python: file.text,
}))
const corpus = buildCorpus(sources, { requireComplete: true })

// Or: JSON sent by someone else
const fromWire = parseCorpus(await response.json())
```

## Verdict and Tally

The single vocabulary for "which case counts as passed" after a batch has run. A case with `expect: 'reject'` **passes by failing** — what it verifies is "refused immediately, with an explicit reason"; executing successfully would mean the interception broke. This rule is easy to change by mistake, which is why it lives in the core package, shared by both consumers.

```ts
interface VerdictCase { id: string; expect: 'ok' | 'reject' }
interface CaseResult { ok: boolean; text?: string }   // the verdict reads ok only; text feeds the report and is optional

function isPassed(item: VerdictCase, result: CaseResult | undefined): boolean
function stateOf(item: VerdictCase, result: CaseResult | undefined): 'idle' | 'ok' | 'fail'
function tally<C extends VerdictCase>(items: readonly C[], results: Record<string, CaseResult>): {
  tried: number        // cases with a result
  failed: number       // cases with a result that did not pass
  pending: C[]         // not passed yet (including failed runs); feed straight back into a batch
  untried: C[]         // no result at all; the report's "untried" section uses this so the two never overlap
}
```

**Members**

- `isPassed`: never-run never counts as passed.
- `stateOf`: the three states of a list dot — not run / passed / failed.
- `tally`: generic, so the `pending` you get back keeps your own item type and can be fed straight back into a batch render.

**Example**

```ts
const { tried, failed, pending } = tally(samples, results)
setStatus(`${tried - failed} / ${samples.length} passed · ${failed} failed`)
await runBatch(pending)               // failed runs must be re-run too
```

## Report Text

Folds one round of results into a receipt you can paste straight into an issue or a chat.

```ts
function buildReport(input: {
  cases: readonly ReportCase[]        // VerdictCase plus title / file / python
  results: Record<string, CaseResult>
  now?: Date                          // defaults to now; pass it explicitly to keep test output stable
}): string
```

**Returns** A Markdown text. Section order is "failed → passed → untried", the most important first; every entry carries its in-repository path; failures carry the error text and the full source; empty sections are omitted entirely.

**Example**

```ts
const text = buildReport({ cases: examples, results })
await navigator.clipboard.writeText(text)
```
