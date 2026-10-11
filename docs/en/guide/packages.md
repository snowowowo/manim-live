# Third-Party Packages

Some code needs `import pandas`, `matplotlib`, `scipy`, or `sklearn`. These packages are not distributed with this package, nor with the Pyodide core; they are fetched on demand. This page covers where they come from, why fetching fails, and where they are cached — read it before deploying to an intranet or offline environment.

## How fetching works

The following is taken from Pyodide's `pyodide.asm.js` source, not inferred: fetching one on-demand package in the browser is

```js
fetch(new URL(file_name, indexURL), { integrity: 'sha256-' + base64(pkg.sha256) })
```

Two consequences:

1. **There is exactly one address, `indexURL`, with no fallback to the official CDN** (the CDN fallback in Pyodide's source lives in the Node branch and is a no-op in the browser). Only the files present in the directory `indexURL` points at can be fetched.
2. A missing file surfaces as `TypeError: Failed to fetch` — a fetch with SRI hitting a 404 empty body always fails integrity verification, and the thrown message is **identical** to "the network is down". So on `Failed to fetch`, check the static directory first, not the network.

## Two deployment environments

| Environment | Who puts the wheels into `indexURL` | Cache location |
| --- | --- | --- |
| Official CDN (default) | Nobody — the CDN is already complete | Browser HTTP cache |
| Self-hosted (static directory) | **You** — copy the wheels you use into the directory | Browser HTTP cache |

This repository's local playground uses a third route — a vite middleware proxy fetch — which is development-time behaviour; see [Development & Debugging](/en/dev/).

### Official CDN (default)

No configuration at all. The first use of a package fetches it over the network once; afterwards it comes from the browser HTTP cache.

### Self-hosted (intranet or fully offline)

1. Copy `pyodide-lock.json` and the wheels you use from a Pyodide release into the static directory; the core files `pyodide.js`, `pyodide.asm.wasm`, and `python_stdlib.zip` are also required.
2. Wheel bytes are verified against the sha256 in the lock, so **swapping in another version is rejected by SRI** — when changing versions, change the lock together with them.
3. Whichever package is missing, the error message **states it explicitly** (see below); add the file it names.

Size reference (measured from this repository's playground fetch cache): `pandas + matplotlib + scipy + scikit-learn + statsmodels` with their full dependency closure is **19 wheels plus one openblas archive, about 73 MB in total**, with the core (~13 MB) counted separately.

## Error messages on failure

The core ships a tiered diagnosis that translates `Failed to fetch` into one of four categories:

| Tier | Meaning |
| --- | --- |
| The file is not under the address | `indexURL` is a static directory; which file is missing is stated explicitly |
| Cannot connect | A real network problem |
| The proxying end errored itself | Relays the server's original message (e.g. 502) |
| Bytes do not match the sha256 | The file exists but differs from the version registered in the lock |

Example of the first two tiers:

```
Cannot fetch a library imported by the code (pandas): Failed to fetch. The real cause is
usually not the network: files like pandas-2.2.3-…whl are missing under /pyodide/ — this
address is a static directory, and you can only get what is in it…
```

Extension point: the seam is `setPackageDiagnoser` (the core provides one generic suggestion by default; a host can override it). The browser-side tiering logic lives in `src/engine/pyodide.ts`. A host integration with its own package route can register a custom diagnoser.
