# API Reference: Timeline Playback

`surface.createPlayback(python)` folds a **whole block of code** into one timeline: nothing plays in real time; the call returns a controller that can position at any moment (frame-level), play/pause, and step frame by frame. It serves the "whole block first, watch later" shape (experiment pages, future replay panels); the "add while lecturing" live shape uses [Session](/en/api/session) — the two are independent.

```
surface.createPlayback(python, handlers?)  → Promise<Playback>
Playback
├─ duration()                → number              total length in seconds
├─ time()                    → number              current position
├─ fps()                     → number              frame step base rate
├─ state()                   → PlaybackState       'ready' | 'playing' | 'paused' | 'ended'
├─ seek(seconds)             → void                position at any time and render one frame
├─ play() / pause()          → void
├─ step(frames?)             → void                frame stepping (default +1; negative goes back)
├─ segments()                → PlaybackSegment[]   per-segment time ranges (waits included)
└─ dispose()                 → void                stop and hand the scene back
```

## Mechanism: why frame-level positioning works

manim-web animations are a **timeline model** to begin with: every animation carries start/end times, and the picture state is a function of time. In collect mode the bridge does not play in real time; it schedules every `play` / `wait` onto one MasterTimeline (the same machinery as manim-web's official player). Its `seek` **resets all scheduled animations** and re-evaluates at the absolute time — so dragging backwards restores state (via the pre-animation snapshot each animation takes when it begins), and mobjects that have not been introduced yet stay hidden per segment. Implementation: `src/engine/playback.ts`; the collect protocol lives in the `collect` branch of `src/py/manim-bridge.ts`.

## surface.createPlayback(python, handlers?)

Executes a block of Manim Python (same interpreter as [`run`](/en/api/surface)), but **collects every animation into the timeline instead of playing it live**; it returns as soon as execution finishes (collecting a multi-minute lecture takes a few hundred milliseconds).

```ts
function createPlayback(python: string, handlers?: RunHandlers): Promise<Playback>
```

**Parameters**

- `python`: source; both forms are accepted (a full class shell or a bare construct body), same as `run`.
- `handlers.onLoading`: fetch-progress callback for `import`ed packages, same as [`run`](/en/api/surface).

**Returns** `Promise<Playback>`. Syntax errors and undefined names throw `PyRuntimeError` (with restored line numbers), as with `run`; on return the canvas already shows one frame at t=0.

**Example**

```ts
const playback = await surface.createPlayback(`
c = Circle()
self.play(Create(c), run_time=2)
self.wait(1)
self.play(c.animate.shift(RIGHT * 2))
`)

console.log(playback.duration())   // ≈ 4 (2s animation + 1s wait + 1s animation)
playback.seek(2.5)                 // jump to the frame at 2.5s
playback.play()                    // continue from there
```

**Notes**

- **One live form per canvas**: starting a playback ends an active session and any previous playback; `run` / `replay` / `createSession` end a playback too.
- **The scene is cleared before collecting**: collect mode really executes the code, so the mobjects are new — but the scene is reused. Without clearing, whatever the previous `run()` left is still mounted, and the canvas shows "old final state + new animation" stacked: it looks like a mobject "appears with no animation" (the old copy is already drawn) and moves look smeared (two copies). They are not on this timeline, so `seek` / `reset` cannot reach them. Only mobjects are cleared — **the canvas element stays the same** (so anyone recording that canvas is unaffected).
- Statements **without animation** (object creation, `set_color`, `self.add`, …) execute immediately during collecting — they have no duration and are state changes "outside" the timeline; **seeking backwards across them does not undo them** (the same trade-off as manim-web's official recording facade).
- 3D scene switches (a mid-block `class X(ThreeDScene)`) are not handled in collect mode.

## playback.duration() / time() / fps() / state()

Four readings. `duration()` is the sum of segment accounting (animations take the **parallel maximum**; wait segments add up); `time()` is the current position (advances with frames while playing); `fps()` is the scene's target frame rate (frame step length = 1/fps); `state()` has four values:

| State | Meaning |
| --- | --- |
| `ready` | Just collected, untouched (the canvas shows t=0) |
| `playing` | Playing |
| `paused` | Paused (also after a seek / step) |
| `ended` | Played to the end |

## playback.seek(seconds)

Positions at any time and renders one frame. **Calling it while playing continues playing from the new position** (a scrubber does not interrupt playback by itself — pausing first is the UI's call).

**Notes**

- Seconds are clamped to `[0, duration]`.
- Backward restore relies on each animation's begin-time snapshot; for the rare mobject where a snapshot is unavailable a little residue is possible (the library logs a warning).

## playback.play() / pause()

Continue from the current position / pause. **Pressing `play()` at the end restarts from zero** (player convention).

## playback.step(frames?)

Frame stepping: `step()` advances one frame, `step(-1)` goes back one; the step is `1 / fps()`. It pauses first (nobody wants playback continuing while inspecting frames).

**Notes**

- A frame here is "1/fps seconds on the timeline", not a video frame — state is computed from time, so stepping in both directions is exact.

## playback.segments()

Per-segment time ranges (waits included), for drawing tick marks in a UI.

```ts
interface PlaybackSegment {
  start: number    // segment start (seconds)
  end: number      // segment end (seconds)
  isWait: boolean  // wait segment (no animations, duration only)
}
```

## playback.dispose()

Stops and hands the scene back (timeline detached, canvas left on the current frame). Every member afterwards is a no-op; [`surface.dispose()`](/en/api/surface) disposes playbacks with it.
