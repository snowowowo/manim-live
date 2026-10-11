# What It Is

This page explains the problem manim-live solves, its approach, how it differs from using manim-web directly, and when to use (or not use) it. If you just want to install and run, go straight to [Installation](/en/guide/installation) and [Quick Start](/en/guide/quick-start).

## The problem

Manim is the most widely used math-animation library in the Python ecosystem, but its standard workflow depends on a local Python environment and rendering pipeline (manim CLI + LaTeX + ffmpeg). Rendering a Manim animation **inside a web page** on demand — the typical case being an AI chat product where the model generates Manim code and the page draws it for the user on the spot — normally means running Python on a server or asking users to install a local environment: both are too heavy for "a front-end page".

## The approach

Move the whole execution chain into the browser:

- **Pyodide** provides a real CPython interpreter (with numpy / sympy); code runs in the page and never touches a server;
- **manim-web** provides WebGL rendering; frames are drawn straight onto a canvas, no video files involved;
- **The adapter layer** (the core of this package's work) translates Manim Community Edition constructs into manim-web calls — users write the familiar `Scene` / `self.play(Create(...))`, with no new API to learn.

Externally it exposes a single factory `createManimRenderer()` and two DOM primitives (give a container element, get run / dispose), which is why it depends on no framework.

## How it differs from using manim-web directly

manim-web is the underlying rendering library, and its API is not the same as Manim CE's. This package adds three things on top: syntax compatibility (Manim CE → manim-web calls), execution queue and canvas lifecycle management, and the `check()` dry-run precheck. Using manim-web directly means implementing all three yourself.

## When to use it — and when not

**Good fits**:

- Rendering Manim animations on demand inside your own product (AI chat UIs, teaching pages, interactive notebooks);
- A "check first, then animate" pipeline — `check()` stops bad code before rendering;
- Simple deployment: one npm package, optionally self-hosted static assets, no server.

**Poor fits**:

- Batch-rendering videos on a server — use manim CLI's native pipeline;
- Needing all of Manim (e.g. complex LaTeX typesetting) — this package covers a commonly used subset of Manim CE; see the [Public API](/en/api/) and the examples for the supported surface;
- Non-Python animation needs — this package does Manim only.
