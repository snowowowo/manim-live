# Installation

```bash
pnpm add manim-live
```

Pure ESM (`exports` contains only `import`); a bundler that resolves `node_modules` is required
(vite / webpack / rspack all work). `manim-web` is installed along with the package (it sits in
`dependencies`), but it is **not bundled into this package's output** — it is left for the
consumer's bundler to resolve, which helps tree-shaking and caching.

::: tip This package contains logic only
The `files` allowlist is `dist`, `style.css`, `README.md`, `LICENSE`. The **static assets
required at runtime are not distributed with the package** — see the two sections below.
:::

## Two External Resources

### Pyodide (~13 MB core, includes numpy / sympy)

Pointed to by `pyodideIndexURL` of `createManimRenderer`. **If omitted, the official CDN is used**
(the default); for offline / self-hosted setups, pass your own address and note:

- Pyodide's "core" and its "on-demand third-party packages" (pandas / matplotlib, etc.) read
  **the same address**, and are SRI-verified against the sha256 in `pyodide-lock.json` —
  whichever file is missing from the address, the corresponding import simply cannot be fetched.
  The complete self-hosting recipe is in [Where Third-Party Packages Come From](/en/guide/packages).
- Pyodide is licensed under **MPL-2.0**: when served from the CDN this package is not the
  distributor; when self-hosted you must include its LICENSE and note where the source lives.

### KaTeX CSS and Fonts

Pointed to by `katexBaseURL` (`MathTex` is rendered as KaTeX HTML and needs the styles to
display correctly). If omitted, the DOM is left untouched — if your code uses no formula
text, you can skip this entirely.

## Browser Requirements

A modern browser with **WebAssembly and WebGL** support is required (Pyodide runs WASM,
manim-web renders with three.js). DOM-less environments (Node) use the `manim-live/node`
entry, which supports the dry-run precheck only — see [the dedicated page](/en/guide/node).

## Next Steps

- [Quick Start](/en/guide/quick-start) — render your first scene in about twenty lines
- [Using in Frameworks](/en/guide/frameworks) — vanilla JS / React / Vue
- [Three Contracts You Must Know](/en/guide/contracts) — multi-instance, disposal, one segment per run
