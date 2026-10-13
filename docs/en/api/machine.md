# API Reference: Machine Probe

"Does this machine have the manim command-line toolchain?" — answered by running **real commands**. Local CLI export to mp4 (see [Export](/en/api/export)) must pass this gate first.

Not to be confused with [Environment Status](/en/api/status): that reports the **browser-side** Pyodide / WASM runtime state (facts on the page, no commands run); this reports what is **installed on the machine**.

Four functions on the Node side (`probePlan` / `probeCheck` / `resolveExecutable` / `pythonBesideExecutable`), all in `manim-live/node`; the browser-side fetch client is `createMachineClient`.

```
probePlan()                → EnvPlan                             instant: lists what will be probed
probeCheck(id)             → Promise<EnvResult | null>           runs one probe; null for unknown ids
resolveExecutable(tool)    → string | null                       finds an executable on PATH
pythonBesideExecutable(f)  → string | null                       the sibling interpreter of a venv layout

createMachineClient({ environmentUrl }) → MachineClient
├─ loadPlan()              → Promise<EnvPlan>
└─ probe(id)               → Promise<EnvResult>
```

## probePlan()

The probe plan: which items exist, what each looks for, which command it runs. **Contains no results**, so it returns instantly.

```ts
function probePlan(): EnvPlan

interface EnvPlan {
  platform: string
  arch: string
  node: string
  path: string      // the PATH actually used to find commands (common install dirs appended)
  checks: EnvCheck[]   // { id, tool, command }
}
```

**Returns** `EnvPlan`. Six items by default: `python3`, `manim`, `manimModule` (the version of the `manim` import, asked of the interpreter sibling to the manim command), `ffmpeg`, `latex`, `dvisvgm`.

**Notes**

- Why items are **asked one by one**: `manim --version` imports all of Manim, which can take tens of seconds; probing everything at once would freeze the first paint, while separate probes let the UI light up row by row.
- PATH augmentation (`/usr/local/bin`, `/opt/homebrew/bin`, `/Library/TeX/texbin`, `~/.local/bin`, …) counters the trimmed environment a desktop app often gets — "installed but reported missing" is the classic false negative for this class of tools.

## probeCheck(id)

Runs one probe. Always `execFile` with fixed arguments; user input never enters the command line.

```ts
function probeCheck(id: string): Promise<EnvResult | null>

interface EnvResult {
  id: string
  status: 'ok' | 'missing' | 'error'   // installed / not installed / installed but failing
  path: string | null                  // the executable found; null when missing
  version: string                      // version line (present when ok)
  detail: string                       // explanation when missing or failing
}
```

**Parameters** `id`: a probe identifier (`checks[].id` from `probePlan()`).

**Returns** `EnvResult`; `null` for unknown ids (the caller answers 404).

**Example**

```ts
import { probeCheck } from 'manim-live/node'

const manim = await probeCheck('manim')
if (manim === null) return
if (manim.status !== 'ok') console.log('local export unavailable:', manim.detail)
else console.log('manim at', manim.path, '—', manim.version)
```

**Notes**

- The `manimModule` item **follows the manim command**: it asks the interpreter sitting beside it (venv / pipx layouts), not the first `python3` on PATH. Watching the latter misjudges a venv-installed manim as missing (observed in practice).

## resolveExecutable(tool) / pythonBesideExecutable(file)

Two small addressing helpers, usable on their own for prefetch / reveal-style work.

```ts
function resolveExecutable(tool: string): string | null
function pythonBesideExecutable(file: string): string | null
```

**Parameters** `tool`: an executable name (searched only on the augmented PATH; Windows `.exe` / `.cmd` / `.bat` supported); `file`: a path to an executable.

**Returns** An absolute path; `null` when not found / not a venv layout.

**Notes**

- `pythonBesideExecutable` **resolves symlinks first**: when `~/.local/bin/manim` links into a venv, an unresolved path would never find that venv's sibling `python3`.

## createMachineClient(options)

The browser-side fetch client for probes.

```ts
function createMachineClient(options: { environmentUrl: string }): MachineClient

interface MachineClient {
  loadPlan(): Promise<EnvPlan>            // GET  environmentUrl
  probe(id: string): Promise<EnvResult>   // GET  environmentUrl/<id>
}
```

**Parameters** `environmentUrl`: the probe route (the caller plugin's own namespace).

**Returns** `MachineClient`. Both methods **throw on failure**: a failing `probe` must throw so that row is marked "error" rather than misreported as "not installed" — keeping those two apart is exactly this discipline.

**Example**

```ts
import { createMachineClient } from 'manim-live'

const machine = createMachineClient({ environmentUrl: '/dsh-plugins/example/environment' })
const plan = await machine.loadPlan()
const results = await Promise.all(plan.checks.map(async (check) => {
  try {
    return await machine.probe(check.id)
  } catch (error) {
    return { id: check.id, status: 'error' as const, path: null, version: '', detail: String(error) }
  }
}))
```

**Notes**

- The `parsePlan` / `parseResult` parsers are exported too: responses are untrusted input (version skew, error pages from a middle layer); every field is checked and bad entries do not poison good ones.
