# Development & Debugging

This page is for developers of this repository: build, tests, the playground, and artifact
self-checks. If you only use manim-live in your own project, start from
[Installation](/en/guide/installation) — you don't need this page.

## Common Commands

```bash
pnpm build         # tsdown build output (dist/)
pnpm dev           # tsdown --watch
pnpm test          # vitest (offline test cases)
pnpm test:net      # online cases (MANIM_NET=1, fetches real Pyodide / wheels, timeout relaxed to 5 minutes)
pnpm typecheck     # tsc --noEmit (include covers src and playground only, not docs)
pnpm coverage      # coverage (v8, src only)
pnpm check:pkg     # publint + attw, pre-release artifact self-check
pnpm setup:assets  # prepare assets/ (Pyodide distribution, etc.)
```

## The single home of corpus regression

`corpus/` (239 examples + real-machine screenshots) is this library's **exclusive** responsibility: support-surface probing, regression tests, and re-running screenshots all happen here. Downstream consumers (e.g. the dsh-manim-live laboratory) **no longer carry corpus regression** — they only verify their own behavior inside the host, and bundle a small sample set of their own when needed.

## The Playground

`pnpm playground` starts a vite dev server (`playground/vite.config.ts`) — this
repository's local playground. It ships a **fetching middleware**: if the wheel is present
in the package directory it serves it directly; otherwise it fetches it from jsdelivr after
verifying the lock's sha256 and caches it in `corpus/pyodide-cache/` (gitignored). One fetch
is enough; after that it works offline. `pnpm check:playground`
(`scripts/check-playground.mjs`) verifies that this directory's conventions haven't been
broken.

For the tiered diagnostics used when package fetching fails, see
[Where Third-Party Packages Come From](/en/guide/packages) — that's the troubleshooting
page for **consumers**; on the development side there is just one thing to know: the seam
is `setPackageDiagnoser`, and the browser-side tiering logic lives in
`src/engine/pyodide.ts`.

## Publication self-checks (run before publishing to npm)

```bash
pnpm build && pnpm check:pkg
```

`check:pkg` = publint + arethetypeswrong. Current results (verified 2026-10-11, all green):

- Every `exports` entry carries a `types` condition (including `style.css.d.ts` for `./style.css` — TypeScript 7 checks side-effect imports by default and consumers fail to compile without it; caught and fixed during verification); the `.d.ts` files are validated by real TS consumers — strict-mode `tsc` (TS 7) in `examples/react` and `vue-tsc` in `examples/vue` both pass.
- **ESM-only** (Node >= 20): CommonJS consumers need a dynamic `import()` — attw's note about this is expected behavior, not a defect.
- `sideEffects` covers only `*.css`; the `files` whitelist is `dist` / `style.css` / `README.md` / `LICENSE`.
- `engines` / `repository` / `homepage` / `bugs` / `license` / `keywords` are all present.

## Repository Layout

```
src/          source code (tests *.test.ts live next to the files under test)
playground/   local playground (vite, not part of the npm output)
examples/     Minimal framework-integration verification projects: vanilla / react / vue / next (not in the npm package)
assets/       assets distributed with the package (Pyodide distribution, etc.)
scripts/      maintenance scripts (setup-assets / check-playground, etc.)
corpus/       corpus and its screenshots (git-tracked, not in the npm package) + the local pyodide cache (ignored)
docs/         this documentation site (independent dependencies, vitepress only)
```

Maintenance notes for the documentation site (how to change base, where screenshots are
picked from) are in `docs/README.md`.
