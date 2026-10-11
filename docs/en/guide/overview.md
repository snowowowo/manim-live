# What It Is

manim-live brings Manim animations into the browser: write **standard Manim CE Python**, and the page renders it into a WebGL animation on the spot — no server, no local Python.

## Why it exists: compared with the two existing options

| | Native Manim (CLI) | manim-web | manim-live |
| --- | --- | --- | --- |
| The code you write | Standard Manim Python | Its own API, not Manim syntax | **Standard Manim Python** |
| Where it runs | Local Python (manim + LaTeX + ffmpeg installed) | Browser | **Browser (real CPython via Pyodide)** |
| Output | mp4 video files | Live WebGL frames | **Live WebGL frames** |
| On-demand rendering in a page | Not viable (heavy environment, needs a local machine or server) | Yes, but code must be rewritten to its API | **Yes — standard code runs as-is** |

Each path has one hard flaw. Native Manim executes real Python but the environment is heavy — rendering an animation on demand inside a web page cannot require every user to install a Python stack, and standing up a server is slow and costly. manim-web gets into the browser, but its API is its own; standard Manim code won't run on it — and **what AI generates is precisely standard Manim**: that is what fills its training corpus, so having the AI write against manim-web's private API is neither stable nor realistic.

manim-live combines the strengths of both: **Pyodide runs a real CPython in the browser** (the code is genuinely Python, language features work as-is), and **the adapter layer translates standard Manim CE constructs into manim-web calls** (rendering is native WebGL). A piece of AI-generated standard Manim code, pasted into a page, just moves.

## What it looks like from the outside

An npm package exposing a single factory `createManimRenderer()`: give it a container element, get `run(code)` and `dispose()`. Zero framework dependencies — React, Vue, and vanilla JS differ only in mount timing. Third-party libraries (pandas / matplotlib, etc.) are fetched on demand with sha256 verification from `pyodide-lock.json`, and the fetch URL can point at self-hosted assets for fully offline operation (see [Where Third-Party Packages Come From](/en/guide/packages)).

## When to use it — and when not

**Good fits**: rendering model-generated animations in AI chat UIs (this is where it came from); on-demand math animations in teaching pages and interactive notebooks; stopping bad code before rendering with the `check()` dry run.

**Poor fits**: batch-rendering videos on a server (use manim CLI's native pipeline); all of Manim (this package covers a commonly used subset of Manim CE, see [Public API](/en/api/)); non-Python animation needs.
