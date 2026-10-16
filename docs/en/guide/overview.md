# Overview

manim-live turns standard Manim (Python) code into real-time animations in a web page: no server, no local Python. Two typical uses — an AI writes and plays animations on the fly while explaining, and embedding rendering anywhere in your own site.

## Differences from native Manim

The code is the same standard Manim Python; the difference lies only in where it runs and how the picture is produced:

| | Native Manim (CLI) | manim-live |
| --- | --- | --- |
| The code you write | Standard Manim Python | The same code, runs as-is |
| Environment | Local install of Python + manim + ffmpeg (plus LaTeX for formulas) | Just a browser, zero install |
| How you get the picture | Offline CLI render to an mp4; playback and embedding are left to you | Real-time rendering in the page; the animation plays as soon as the code is submitted |
| Embedding in pages or products | Not possible; a video file can only be embedded after the fact | Embed anywhere; all it takes is a container element |
| AI drawing while explaining | A single render waits for the whole pipeline, so it cannot keep pace with the explanation | Write it, watch it; `check()` stops invalid code before rendering |
| Deployment cost | Install the stack on every machine, or run a render server | One npm package; assets can be self-hosted and it runs fully offline |

The single trade-off: about 90% of the 437 public API entries are verified usable — the main scenarios (basic shapes, coordinate systems, text and formulas, animations, updaters, 3D) are fully covered; most of the 43 missing items are niche and every one has an alternative, listed item by item in [Support Surface](/en/guide/support). In exchange: real-time rendering in the browser with zero environment.

## Package shape

One npm package with a single entry factory, `createManimRenderer()`: give it a container element, get `run(code)` and `dispose()`. Zero framework dependencies — React, Vue, and vanilla JS differ only in mount timing. Third-party Python libraries (pandas, matplotlib, and others) are fetched automatically on demand, and the fetch URL can point at self-hosted assets for fully offline operation; see [Third-Party Packages](/en/guide/packages).

## When to use it

**Good fits**: rendering model-generated animations in AI chat UIs (the package was built for this scenario); on-demand math animations in teaching pages and interactive notebooks; stopping invalid code before rendering with the `check()` dry run.

**Poor fits**: batch-rendering videos on a server (use manim CLI's native pipeline); all of Manim (this package covers a commonly used subset of Manim CE; the boundary is in the [API Reference](/en/api/)); non-Python animation needs.

## Where to start

- Install, the two external assets, browser requirements → [Installation](/en/guide/installation)
- Your first frame in about twenty lines → [Quick Start](/en/guide/quick-start)
- Type definitions and examples for every method, property, and hook → [API Reference](/en/api/)
