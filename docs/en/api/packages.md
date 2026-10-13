# API Reference: Pyodide Packages

**Supply and management** for on-demand third-party packages (`pandas`, `matplotlib`, …): the browser half fetches (inventory / prefetch / clear), the Node half runs the supply line (turning the bundled lock into a catalog, sha256-verified downloads, cache accounting, the Node loader). The package-fetch mechanism and deployment shapes (why there is a single `indexURL`, what failures look like) are in [Third-party Packages](/en/guide/packages).

Both halves are **wired in**: the route URLs, the bundled directory, and the cache directory are all injected by the caller — a host plugin passes its own `/dsh-plugins/<id>/…` and dsh cache directory; this package neither knows nor should know those policies.

## createPackagesClient(options)

The browser-side fetch client for package management.

```ts
function createPackagesClient(options: { packagesUrl: string; cacheUrl: string }): PackagesClient

interface PackagesClient {
  loadPackages(): Promise<PackageInventory>             // GET  packagesUrl
  cachePackage(name: string): Promise<PrefetchOutcome>  // POST packagesUrl/cache, body { names: [name] }
  clearPackage(name: string): Promise<string[]>         // POST cacheUrl, body { names: [name] }
  clearPackageCache(): Promise<string[]>                // POST cacheUrl, no body
}
```

**Parameters**

| Field | Type | Default | Purpose | Consequence if omitted |
| --- | --- | --- | --- | --- |
| `packagesUrl` | `string` | required | Inventory URL (`GET` for the inventory, `POST …/cache` to prefetch) | cannot be omitted |
| `cacheUrl` | `string` | required | Cache-clearing URL (`POST`, optionally with `names`) | cannot be omitted |

**Returns** `PackagesClient`. The four methods:

- `loadPackages()`: reads the inventory once (each package is bundled / cached / absent). Throws on failure — a user-initiated action should not fail silently.
- `cachePackage(name)`: fetches one package (one request per package). **Does not throw on failure**; returns `{ ok, bytes, error }` — one failure in a batch should not cut the whole run short, so the caller decides by `ok`.
- `clearPackage(name)` / `clearPackageCache()`: clears the cache, returning the removed file names. **Throws on failure** — the UI says "cleanup failed" rather than pretending it worked.

**Example**

```ts
const packages = createPackagesClient({
  packagesUrl: '/dsh-plugins/example/packages',
  cacheUrl: '/dsh-plugins/example/cache',
})

const inventory = await packages.loadPackages()
const plan = prefetchPlan(inventory.entries, 'matplotlib')   // dependency closure, dependencies first
for (const name of plan) {
  const outcome = await packages.cachePackage(name)
  if (!outcome.ok) break   // stop on failure: it is usually systemic
}
```

**Notes**

- Any spelling of a package name is accepted (`Pillow` / `scikit_learn` / `python_dateutil`); the normalization rules live in the pure functions below.

## Pure functions (usable without fetching)

| Function | Signature | Purpose |
| --- | --- | --- |
| `parseInventory` | `(payload: unknown) => PackageInventory \| null` | Turns the inventory response into a definite shape; bad entries are dropped individually, a bad payload returns `null` |
| `findPackage` | `(entries, name) => PackageEntry \| undefined` | Finds one entry by name (any spelling) |
| `completionFor` | `(entries, input) => Completion \| null` | Ghost-text completion: first prefix match (case-insensitive) |
| `prefetchPlan` | `(entries, name) => string[]` | What to fetch together with one package: the dependency closure, dependencies first |
| `formatBytes` | `(bytes: number) => string` | Human-readable byte counts (two significant digits, capped at GB) |
| `COMMON_PACKAGES` | `readonly string[]` | Curated common packages (eleven; not a whitelist, just a shortcut past three hundred entries) |

**Notes**

- `prefetchPlan` is **post-order**: if you stop midway, what has landed is a self-consistent prefix. Packages already local are skipped, but their dependencies are still walked.

## createPyodideSupply(options)

The Node side of the supply line: turns the bundled `pyodide-lock.json` into a catalog and downloads, verifies, accounts, and clears against it.

```ts
function createPyodideSupply(options: { pyodideDir: string; cdnBase?: string }): PyodideSupply

interface PyodideSupply {
  catalog: readonly SupplyCatalogEntry[]           // downloadable catalog (sorted), the inventory's data source
  digestOf(fileName: string): string | undefined   // file name → sha256 from the lock; absent = must not download
  inventory(cacheDir: string): { cacheDir, pyodideVersion, entries }
  seedBundled(cacheDir: string): Promise<void>     // place bundled wheels into the cache dir (hard link, copy fallback)
  download(fileName: string, cacheDir: string): Promise<Buffer>   // sha256-verified atomic download
  cachePackages(cacheDir: string, names: string[]): Promise<CacheResult[]>   // sequential, stops on first failure
  cachedFiles(cacheDir: string): string[]          // package files currently in the cache dir
  filesForNames(cacheDir: string, names: string[]): string[]   // pick cache files by package name
  createNodeLoader(cacheDir: string): PyodideLoader   // loader for the Node dry-run runtime
}
```

**Parameters**

| Field | Type | Default | Purpose | Consequence if omitted |
| --- | --- | --- | --- | --- |
| `pyodideDir` | `string` | required | Bundled Pyodide directory (`pyodide-lock.json`, `pyodide.mjs`, bundled wheels) | cannot be omitted |
| `cdnBase` | `string` | jsdelivr official channel per lock version | Base URL for origin downloads | official CDN; air-gapped setups must pre-place wheels or self-host |

**Example** (wiring the supply into a host plugin's HTTP routes and Node loader)

```ts
import { createPyodideSupply, setPyodideLoader } from 'manim-live/node'

const supply = createPyodideSupply({ pyodideDir: join(pluginDir, 'assets', 'pyodide') })

// GET /packages → inventory; POST /packages/cache → prefetch
const inventory = supply.inventory(cacheDir)
const results = await supply.cachePackages(cacheDir, ['matplotlib'])

// the host dry-run uses real Python: the loader reads packages from the cache dir only
setPyodideLoader(supply.createNodeLoader(cacheDir))
```

**Notes**

- **The lock is the single source of the catalog**: file names and sha256 always come from the bundled `pyodide-lock.json`; a second hand-written list would drift.
- `download` refuses without a digest (a clear refusal beats "verification failed" after the fact); writes go to a temp name first, so a half file never poses as "cached".
- The cache directory is the caller's choice (a DSH plugin puts it under `~/.dsh/cache/<plugin>/pyodide`); clearing removes package files from that directory only.
- The loader built by `createNodeLoader` reads packages **from the cache directory only** — `packageCacheDir` must be given explicitly, or downloaded wheels land inside the bundled directory (observed in practice).
