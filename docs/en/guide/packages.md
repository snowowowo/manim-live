# Where Third-Party Packages Come From, and Where They Are Cached

This page explains where third-party packages like `import pandas` are fetched from, why fetching fails, and where things are cached — read it before deploying to an intranet / offline environment.

Some corpus entries need `import pandas` / `matplotlib` / `scipy` / `sklearn`. These packages
are **not distributed with this package**, nor with the Pyodide core — they are fetched on
demand. This page explains where they come from, why fetching can fail, and where they are
cached.

## One Key Fact

The source is a reading of Pyodide's `pyodide.asm.js` (not guesswork): fetching an
on-demand package on the browser side works like this

```js
fetch(new URL(file_name, indexURL), { integrity: 'sha256-' + base64(pkg.sha256) })
```

Two corollaries:

1. **There is only one address, `indexURL`, with no fallback to the official CDN** (the CDN
   fallback in Pyodide's source sits on the Node branch and is a no-op in the browser).
   Whatever is in the directory `indexURL` points to is all you can get.
2. If the file does not exist, the symptom is `TypeError: Failed to fetch` — an SRI-tagged
   fetch hitting a 404 with an empty body inevitably fails the integrity check, and the
   thrown message is **identical** to "network is down". So when you see `Failed to fetch`,
   check the static directory first, not the network.

## Two Deployment Setups, Each with Its Own Recipe

| Setup | Who puts wheels into `indexURL` | Cache location |
| --- | --- | --- |
| Official CDN (default) | Nothing to do — the CDN itself is complete | Browser HTTP cache |
| Self-hosted (static directory) | **You** — copy the wheels you need into the directory | Browser HTTP cache |

(This repository's local playground uses a third recipe — a vite middleware proxy that
fetches them — which is a development-time behavior, see [Development & Debugging](/en/dev/).)

### Default (official CDN)

No configuration needed. The first use of a package fetches it over the network once; after
that the browser HTTP cache serves it.

### Self-hosted (intranet / fully offline)

1. From a Pyodide distribution, copy `pyodide-lock.json` and the wheels you use into a
   static directory (the core files `pyodide.js` / `pyodide.asm.wasm` /
   `python_stdlib.zip` are equally indispensable).
2. Wheel bytes are verified against the sha256 in the lock — **swapping in another version
   gets rejected by SRI**; when changing versions you must swap the lock along with it.
3. Whichever package is missing, the error message **names it explicitly** (see the next
   section); just add the file as prompted.

Size reference: `pandas + matplotlib + scipy + scikit-learn + statsmodels` with their full
dependency closure is **20 wheels / 41.3 MB**, not counting the core (~13 MB).

## Error Messages When Fetching Fails

The core package ships tiered diagnostics; `Failed to fetch` gets translated into one of
these four categories:

| Tier | Meaning |
| --- | --- |
| File missing from the address | `indexURL` is a static directory; whichever file is missing is named explicitly |
| Cannot connect | A genuine network problem |
| The proxied fetch endpoint itself errored | Relays the server's original message (e.g. 502) |
| Bytes don't match the sha256 | The file exists but doesn't match the version registered in the lock |

Examples of the first two tiers:

```
Cannot fetch the library imported by the code (pandas): Failed to fetch. The real cause is
most likely not the network: /pyodide/ doesn't have files like pandas-2.2.3-…whl — this
address is a static directory, and it can only serve what's in it…
```

Extension point: the seam is `setPackageDiagnoser` (the core provides one generic hint by
default; hosts may override it), and the browser-side tiering logic lives in
`src/engine/pyodide.ts`. Host integrations with their own package-fetching routes can
register a custom diagnoser.
