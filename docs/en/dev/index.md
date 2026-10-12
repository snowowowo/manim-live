# Development & Debugging

This page is for developers of this repository: tech stack, directory layout, development flow, and publication self-checks. Readers who only use manim-live in their own project should start at [Installation](/en/guide/installation) and skip this page.

## Tech stack

| Purpose | Choice | Notes |
|---|---|---|
| Language | TypeScript 7 | All `.ts`; types are checked separately by `tsc --noEmit`, the build does not type-check |
| Build | tsdown | Two entries (browser / Node), each emits ESM + `.d.ts` into `dist/`; `manim-web` is always external |
| Test | vitest + v8 | Tests live beside the file under test (`*.test.ts`); network cases are a separate run (`MANIM_NET=1`) |
| Playground | vite 7 + React 19 | `playground/`, local development only, not in the npm package |
| Package manager | pnpm | The only lockfile is `pnpm-lock.yaml`; Node ≥ 20, ESM-only |
| Python runtime | Pyodide | Real CPython running in the browser; the distribution is wired in by `pnpm setup:assets` |
| Package self-check | publint + attw | `pnpm check:pkg`, required before publishing |

## Directory layout

```
src/           source (tests *.test.ts beside the file under test)
├─ engine/     browser-side runtime: Pyodide loading, canvas, rendering, environment probing
├─ py/         Python side: bridge, API map, runtime packages and corpus format
├─ export/     recording and export (exporter interface + browser recorder)
└─ testbench/  corpus regression execution and verdicts
playground/    local playground (vite + React, not in the npm package)
examples/      minimal framework integration projects: vanilla / react / vue / next (not in the npm package)
assets/        assets shipped alongside (Pyodide release, KaTeX), symlinked by setup:assets
scripts/       maintenance scripts: setup-assets / check-playground / screenshot and API probes
corpus/        corpus and real-machine screenshots (git-tracked, not in the npm package) + local pyodide cache (ignored)
docs/          this documentation site (independent dependency: vitepress only)
```

`src/index.ts` is the browser entry (canvas included); `src/node.ts` is the Node entry (dry-run precheck + corpus loading, no DOM).

Only `dist/`, `style.css`, `README.md` and `LICENSE` go into the npm package (the `files` allowlist in `package.json`); `playground/`, `examples/`, `corpus/` and `docs/` stay in the repository.

## Setting up the development environment

```bash
git clone https://github.com/snowowowo/manim-live.git
cd manim-live
pnpm install
pnpm setup:assets    # wire in assets/pyodide and assets/katex
pnpm playground      # start the local playground (vite)
```

`setup:assets` **symlinks** rather than copies: Pyodide is about 20 MB and KaTeX about 1.2 MB, and a copy would inevitably drift (one side upgraded, the other still old). The default source is the sibling plugin repository `<workspace>/dsh-manim-live/assets/`; set `MANIM_PLUGIN_ASSETS` to change it.

## Development flow

```bash
pnpm dev               # tsdown --watch, rebuilds output as source changes
pnpm typecheck         # tsc --noEmit (include is src and playground only)
pnpm test              # vitest (offline cases)
pnpm test:net          # network cases (MANIM_NET=1, real Pyodide / wheels, timeout relaxed to 5 minutes)
pnpm coverage          # coverage (v8, src only)
pnpm check:playground  # verify the playground's package-fetch directory conventions
```

A typical change goes through these steps:

1. **Verify behaviour in the playground** — `playground/` imports **source** directly (`@/` maps to `playground/`, `manim-live` maps to `src/index.ts`), so edits hot-reload without a build first.
2. `pnpm typecheck` — the build does not type-check; type errors surface only here.
3. `pnpm test` — tests live beside the file under test; when you add a feature, add a `*.test.ts` next to it. For changes touching the real runtime or package fetching, run `pnpm test:net`.
4. `pnpm build` — both entries must pass, output lands in `dist/`.
5. When you touch `exports` / `files` / `sideEffects` in `package.json`, run `pnpm build && pnpm check:pkg`.

## Playground

`pnpm playground` starts a vite dev server (`playground/vite.config.ts`), this repository's local playground. It carries a **proxy-fetch middleware**: if the bundled directory has a wheel it serves it directly; otherwise it fetches from jsdelivr after verifying the lock's sha256 and drops it into `corpus/pyodide-cache/` (gitignored). One fetch is enough; afterwards it runs offline. `pnpm check:playground` (`scripts/check-playground.mjs`) verifies this directory's conventions have not been broken.

The tiered diagnosis for fetch failures is in [Third-Party Packages](/en/guide/packages) — that is the troubleshooting page for consumers. The development side needs only one sentence: the seam is `setPackageDiagnoser`, and the browser-side tiering logic is in `src/engine/pyodide.ts`.

## Corpus regression

`corpus/` (239 entries plus real-machine screenshots) is this repository's **exclusive** responsibility: support-surface measurement, regression tests, and screenshot re-runs all happen here. Downstream consumers (such as the dsh-manim-live laboratory) **no longer carry corpus regression** — they only accept their own functional behaviour in their host, and embed a small sample set of their own when they need examples.

## Publication

Required before publishing to npm:

```bash
pnpm build && pnpm check:pkg
```

`check:pkg` is publint plus arethetypeswrong. Current conclusions (measured 2026-10-11, all green):

- Every entry in `exports` carries a `types` condition (including `style.css.d.ts` for `./style.css` — TypeScript 7 checks side-effect imports by default, and without it consumers fail to compile; found and fixed during verification). The `.d.ts` files are validated by real TS consumers — `examples/react` under strict-mode `tsc` (TS 7) and `examples/vue` under `vue-tsc` both pass.
- **ESM-only** (Node ≥ 20): CommonJS consumers need a dynamic `import()` — attw's note about this is expected behaviour, not a defect.
- `sideEffects` is only `*.css`; the `files` allowlist is `dist` / `style.css` / `README.md` / `LICENSE`.
- `engines` / `repository` / `homepage` / `bugs` / `license` / `keywords` are all present.

Maintenance notes for the documentation site (how to change the base, where screenshots come from) are in `docs/README.md`.
