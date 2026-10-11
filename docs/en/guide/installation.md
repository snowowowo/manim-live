# Installation

This page covers three things: the install command, the two external assets, and browser requirements. For what the package is and where it fits, see [Overview](/en/guide/overview).

```bash
pnpm add manim-live
```

The package is pure ESM (`exports` contains only `import`) and needs a bundler that resolves `node_modules` — vite, webpack, and rspack all work. `manim-web` is installed with the package (it sits in `dependencies`) but is **not bundled into this package's output**: it is left for the consumer's bundler to resolve, which helps tree-shaking and caching.

::: tip The package contains logic only
The `files` allowlist is `dist`, `style.css`, `README.md`, `LICENSE`. The static assets required at runtime are **not distributed with the package** — see the two sections below.
:::

## External assets

### Pyodide

About 13 MB for the core, plus about 7 MB for the bundled numpy and sympy. Pointed to by `pyodideIndexURL` of `createManimRenderer`; if omitted, the official CDN is used. For offline or self-hosted setups, pass your own address and note two things:

- The Pyodide core and the on-demand third-party packages (pandas, matplotlib, and friends) read **the same address**, and are SRI-verified against the sha256 in `pyodide-lock.json` — whichever file is missing from that address, the corresponding `import` simply cannot be fetched. The complete self-hosting recipe is in [Third-Party Packages](/en/guide/packages).
- Pyodide is licensed under **MPL-2.0**: when served from the CDN this package is not the distributor; when self-hosted you must include its LICENSE and note where the source lives.

### KaTeX

`MathTex` renders to KaTeX HTML and needs the styles to display correctly; the CSS and fonts are pointed to by `katexBaseURL`. If omitted, the DOM is left untouched — if your code uses no formula text, you can skip this entirely.

## Browser requirements

A modern browser with WebAssembly and WebGL support: Pyodide runs WASM and manim-web renders with three.js. DOM-less environments (Node) use the `manim-live/node` entry, which supports the dry-run precheck only; see [Node Precheck](/en/guide/node).

## Next steps

- Your first frame in about twenty lines → [Quick Start](/en/guide/quick-start)
- Mounting and cleanup in vanilla JS / React / Vue → [Framework Integration](/en/guide/frameworks)
- The three contracts: singleton, real release, one segment per run → [Behavioural Contracts](/en/guide/contracts)
