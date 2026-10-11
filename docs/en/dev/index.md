# Development & Debugging

This page is for developers of this repository: build, test, playground, and publication self-checks. Readers who only use manim-live in their own project should start at [Installation](/en/guide/installation) and skip this page.

## Common commands

```bash
pnpm build         # tsdown build output (dist/)
pnpm dev           # tsdown --watch
pnpm test          # vitest (offline cases)
pnpm test:net      # network cases (MANIM_NET=1, real Pyodide / wheels, timeout relaxed to 5 minutes)
pnpm typecheck     # tsc --noEmit (include is src and playground only, not docs)
pnpm coverage      # coverage (v8, src only)
pnpm check:pkg     # publint + attw, publication self-check
pnpm setup:assets  # prepare assets/ (Pyodide release, etc.)
```

## Corpus regression

`corpus/` (239 entries plus real-machine screenshots) is this repository's **exclusive** responsibility: support-surface measurement, regression tests, and screenshot re-runs all happen here. Downstream consumers (such as the dsh-manim-live laboratory) **no longer carry corpus regression** — they only accept their own functional behaviour in their host, and embed a small sample set of their own when they need examples.

## Playground

`pnpm playground` starts a vite dev server (`playground/vite.config.ts`), this repository's local playground. It carries a **proxy-fetch middleware**: if the bundled directory has a wheel it serves it directly; otherwise it fetches from jsdelivr after verifying the lock's sha256 and drops it into `corpus/pyodide-cache/` (gitignored). One fetch is enough; afterwards it runs offline. `pnpm check:playground` (`scripts/check-playground.mjs`) verifies this directory's conventions have not been broken.

The tiered diagnosis for fetch failures is in [Third-Party Packages](/en/guide/packages) — that is the troubleshooting page for consumers. The development side needs only one sentence: the seam is `setPackageDiagnoser`, and the browser-side tiering logic is in `src/engine/pyodide.ts`.

## Publication self-check

Required before publishing to npm:

```bash
pnpm build && pnpm check:pkg
```

`check:pkg` is publint plus arethetypeswrong. Current conclusions (measured 2026-10-11, all green):

- Every entry in `exports` carries a `types` condition (including `style.css.d.ts` for `./style.css` — TypeScript 7 checks side-effect imports by default, and without it consumers fail to compile; found and fixed during verification). The `.d.ts` files are validated by real TS consumers — `examples/react` under strict-mode `tsc` (TS 7) and `examples/vue` under `vue-tsc` both pass.
- **ESM-only** (Node ≥ 20): CommonJS consumers need a dynamic `import()` — attw's note about this is expected behaviour, not a defect.
- `sideEffects` is only `*.css`; the `files` allowlist is `dist` / `style.css` / `README.md` / `LICENSE`.
- `engines` / `repository` / `homepage` / `bugs` / `license` / `keywords` are all present.

## Repository layout

```
src/          source (tests *.test.ts beside the file under test)
playground/   local playground (vite, not in the npm package)
examples/     minimal framework integration projects: vanilla / react / vue / next (not in the npm package)
assets/       assets shipped alongside (Pyodide release, etc.)
scripts/      maintenance scripts: setup-assets / check-playground and friends
corpus/       corpus and screenshots (git-tracked, not in the npm package) + local pyodide cache (ignored)
docs/         this documentation site (independent dependency: vitepress only)
```

Maintenance notes for the documentation site (how to change the base, where screenshots come from) are in `docs/README.md`.
