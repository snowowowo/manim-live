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

## The Playground

`pnpm playground` starts a vite dev server (`playground/vite.config.ts`) — this
repository's local playground. It ships a **fetching middleware**: if the wheel is present
in the package directory it serves it directly; otherwise it fetches it from jsdelivr after
verifying the lock's sha256 and caches it in `_dev/pyodide-cache/` (gitignored). One fetch
is enough; after that it works offline. `pnpm check:playground`
(`scripts/check-playground.mjs`) verifies that this directory's conventions haven't been
broken.

For the tiered diagnostics used when package fetching fails, see
[Where Third-Party Packages Come From](/en/guide/packages) — that's the troubleshooting
page for **consumers**; on the development side there is just one thing to know: the seam
is `setPackageDiagnoser`, and the browser-side tiering logic lives in
`src/engine/pyodide.ts`.

## Repository Layout

```
src/          source code (tests *.test.ts live next to the files under test)
playground/   local playground (vite, not part of the npm output)
assets/       assets distributed with the package (Pyodide distribution, etc.)
scripts/      maintenance scripts (setup-assets / check-playground, etc.)
_dev/         development-time materials (corpus screenshots, pyodide cache), not published
docs/         this documentation site (independent dependencies, vitepress only)
```

Maintenance notes for the documentation site (how to change base, where screenshots are
picked from) are in `docs/README.md`.
