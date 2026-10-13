# API Reference: Session

A session is a **persistent execution context** on one canvas, for scenes that grow step by step: incremental lecturing, piece-by-piece construction. Create it with [`surface.createSession()`](/en/api/surface); at most one live session per canvas — starting a new one ends the old.

Difference from [`surface.run()`](/en/api/surface): `run` executes each segment in isolation, variables do not survive between calls; a session reuses one namespace, one bridge, and one canvas throughout (**shape note**: `run` / `createPlayback` take a complete Manim file or a bare construct body; the piece-by-piece shape belongs to sessions only — see [Behavioural Contracts](/en/guide/contracts)) — segment 2 can reference `circle` created in segment 1, `self` is bound to the resident scene, and top-level `play` / `wait` are auto-awaited.

```
surface.createSession()   → Promise<Session>
Session
├─ check(code)            → Promise<SessionVerdict>   dry-run check, no canvas touched
├─ append(code)           → Promise<SessionAppend>    append one segment: check → execute → commit on success
├─ count                  → number                    number of committed segments (property)
├─ source()               → string                    file projection of committed segments
└─ dispose()              → void
```

Commit protocol: `append` first dry-runs a check (with a name table of committed segments), then executes on the canvas, and **commits only on success**, returning the step number. On failure it **rolls back automatically** — fresh namespace, cleared scene, and a **fast replay** of committed segments on the **same bridge**; the canvas returns to the clean state of the previous step. A failed segment does not take a step number.

After `dispose()`, every operation is void: it returns `cancelled: true`.

## session.check(code)

Dry-run check of one segment against the **name table of committed segments** (kind-stubbed: functions are callable, numbers keep their values, arithmetic degrades to 0). No canvas touched; milliseconds.

```ts
check(code: string): Promise<SessionVerdict>

interface SessionVerdict {
  ok: boolean
  error?: string       // reason when ok:false (with restored line numbers)
  cancelled?: boolean  // voided, e.g. session disposed: the caller should show nothing
}
```

**Parameters** `code`: one segment of source. Write **top-level statements**; no `from manim import *` needed (injected when the session starts). Reference variables from previous steps directly.

**Returns** `SessionVerdict`. A rejected check is a **conclusion**, not a failure: `ok:false` with `error`, never thrown.

**Example**

```ts
const verdict = await session.check('c.move_to(RIGHT * 2)')
if (!verdict.ok) console.log('rejected:', verdict.error)
```

**Notes**

- The name table stubs by **kind**: a name committed as a function is callable, as a number participates in arithmetic. So some shape errors surface only when `append` actually executes — the price of a cheap check.
- The check really runs the segment (dry), so prints happen but are discarded (not wired to the caller's output).

## session.append(code)

Append and execute one segment: check first, then onto the canvas; commits with a step number on success, rolls back to the clean state on failure.

```ts
append(code: string): Promise<SessionAppend>

interface SessionAppend extends SessionVerdict {
  step?: number   // step number after a successful commit (starts at 1; failures take none)
}
```

**Parameters** `code`: same shape as `check`. A segment must be a **syntactically complete** sequence of top-level statements (not half an `if`).

**Returns** `SessionAppend`. On `ok:true`, `step` is this step's number; on failure, `error` explains why and the canvas is back at the previous clean state.

**Example**

```ts
const result = await session.append('c = Circle(radius=1.2)\nself.play(Create(c))')
if (result.ok) console.log('committed step', result.step)
else console.log('rejected:', result.error)
```

**Notes**

- Rollback is **replay**, not undo: fresh namespace, cleared scene, then committed segments re-run fast on the same bridge (animation durations compressed to 0). Segment **end states** match; side effects outside the canvas (e.g. writing a file) are not reversed.
- Animations inside a segment play to completion before the step finishes: when `append` resolves, the canvas shows the segment's end state.
- Objects persist across segments; to change a committed object, change it in a **new** segment (appending is editing).

## session.count / session.source()

`count` is the number of committed segments (property; step numbers are segment order); `source()` is the **file projection** of committed segments — joined with blank lines, it is a complete Python file.

**Notes**

- `count` counts only **successful** segments.
- `source()` is the minimal material to replay the lecture: hand it to the local CLI export (see [Export](/en/api/export)) or archive it.

## session.dispose()

Ends the session: releases the namespace; every later operation is void (`cancelled: true`).

**Notes**

- Starting a new session on the same canvas ends the old one automatically; [`surface.dispose()`](/en/api/surface) disposes sessions with it.
- A session reuses one canvas and one bridge (no flicker, no canvas swap) — that is what makes the fast replay possible instead of rebuilding the canvas.

## Boundary

A session only owns the **execution context** (namespace, commit, rollback, step numbers). Narration, pacing, step snapshots, and manuscript manifests stay outside — they belong to the caller (the shell); the test is "does this still hold for a different consumer?"
