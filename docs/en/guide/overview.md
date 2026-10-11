# What It Is

manim-live does one thing: turn **standard Manim (Python) code** into **real-time animations** in a web page. Two typical scenarios — an AI generates animations while explaining, written and played on the fly; and embedding rendering anywhere in your own site. No server, no local Python.

## Compared with native Manim

The code is the same standard Manim Python; the difference is entirely **where it runs and how you get the picture**:

| | Native Manim (CLI) | manim-live |
| --- | --- | --- |
| The code you write | Standard Manim Python | The same code, **runs as-is** |
| Environment | Local install of Python + manim + ffmpeg (plus LaTeX for formulas) | **Just a browser, zero install** |
| How you get the picture | Offline CLI render to an mp4, then figure out how to show it | **Real-time rendering in the page — paste the code and the animation plays** |
| Embedding in pages / products | Not possible; a video file can only be embedded after the fact | **Embed anywhere; all it takes is a container element** |
| AI drawing while explaining | One render waits on the whole pipeline — too slow for conversation | **Write it, watch it; check() stops bad code first** |
| Deployment cost | Install the stack on every machine, or run a render server | **One npm package; assets can be self-hosted and it runs fully offline** |

The single trade-off: this package covers a commonly used subset of Manim CE rather than everything, in exchange for real-time rendering in the browser with zero environment.

## What it looks like from the outside

An npm package exposing a single factory `createManimRenderer()`: give it a container element, get `run(code)` and `dispose()`. Zero framework dependencies — React, Vue, and vanilla JS differ only in mount timing. Third-party Python libraries (pandas / matplotlib, etc.) are fetched automatically on demand, and the fetch URL can point at self-hosted assets for fully offline operation (see [Where Third-Party Packages Come From](/en/guide/packages)).

## When to use it — and when not

**Good fits**: rendering model-generated animations in AI chat UIs (this is where it came from); on-demand math animations in teaching pages and interactive notebooks; stopping bad code before rendering with the `check()` dry run.

**Poor fits**: batch-rendering videos on a server (use manim CLI's native pipeline); all of Manim (this package covers a commonly used subset of Manim CE, see [Public API](/en/api/)); non-Python animation needs.
