# API 参考：Pyodide 包管理

按需第三方包（`pandas`、`matplotlib`…）的**供给与管理**：浏览器侧是取数（清单 / 预缓存 / 清缓存），Node 侧是供给线（随包 lock 的目录化、sha256 下载校验、缓存盘点、Node 装载器）。取包机制与部署形态（为什么只有一个 `indexURL`、失败长什么样）见[第三方包](/guide/packages)。

两个半边都是**接线式**的：路由地址、随包目录、缓存目录全部由调用方注入——宿主插件传自己的 `/dsh-plugins/<id>/…` 与 dsh 缓存目录；本包不知道也不该知道这些策略。

## createPackagesClient(options)

包管理的浏览器侧取数客户端。

```ts
function createPackagesClient(options: { packagesUrl: string; cacheUrl: string }): PackagesClient

interface PackagesClient {
  loadPackages(): Promise<PackageInventory>             // GET  packagesUrl
  cachePackage(name: string): Promise<PrefetchOutcome>  // POST packagesUrl/cache，体 { names: [name] }
  clearPackage(name: string): Promise<string[]>         // POST cacheUrl，体 { names: [name] }
  clearPackageCache(): Promise<string[]>                // POST cacheUrl，不带正文
}
```

**参数**

| 字段 | 类型 | 默认 | 作用 | 不传的后果 |
| --- | --- | --- | --- | --- |
| `packagesUrl` | `string` | 必填 | 清单地址（`GET` 拿清单、`POST …/cache` 预缓存） | 不可省略 |
| `cacheUrl` | `string` | 必填 | 清缓存地址（`POST`，可带 `names` 只清指定包） | 不可省略 |

**返回** `PackagesClient`。四个方法的约定：

- `loadPackages()`：读一次清单（每个包在本地是随包 / 已缓存 / 缺三种状态之一）。失败抛错——这是用户主动触发的动作，不该静默。
- `cachePackage(name)`：取一个包（一个包一次请求）。**失败不抛**，回 `{ ok, bytes, error }`——批量取时一次失败不该把整轮断在半路，由调用方看 `ok` 决定继续还是收摊。
- `clearPackage(name)` / `clearPackageCache()`：清缓存，回被删掉的文件名。**失败抛错**——界面据此说「清理失败」，不能当成清掉了。

**例子**

```ts
const packages = createPackagesClient({
  packagesUrl: '/dsh-plugins/example/packages',
  cacheUrl: '/dsh-plugins/example/cache',
})

const inventory = await packages.loadPackages()
const plan = prefetchPlan(inventory.entries, 'matplotlib')   // 依赖闭包，依赖在前
for (const name of plan) {
  const outcome = await packages.cachePackage(name)
  if (!outcome.ok) break   // 失败即停：一个失败多半是系统性的
}
```

**注意**

- 包名任一写法都认（`Pillow` / `scikit_learn` / `python_dateutil`），归一化口径见下节的纯函数。

## 纯函数（与取数无关，可单独用）

| 函数 | 签名 | 作用 |
| --- | --- | --- |
| `parseInventory` | `(payload: unknown) => PackageInventory \| null` | 把清单响应收成形状确定的值；单条不合格只丢那条，形状不对回 `null` |
| `findPackage` | `(entries, name) => PackageEntry \| undefined` | 按名字（任一写法）找一条记录 |
| `completionFor` | `(entries, input) => Completion \| null` | 输入框虚影补全：按名字前缀（不分大小写）找第一个能接上的 |
| `prefetchPlan` | `(entries, name) => string[]` | 取一个包要连哪些一起取：依赖闭包，依赖排在前面 |
| `formatBytes` | `(bytes: number) => string` | 字节数成人话（两位有效数字，停在 GB） |
| `COMMON_PACKAGES` | `readonly string[]` | 常用包清单（十一个；不是白名单，只是摆出来免得翻三百行） |

**注意**

- `prefetchPlan` 是**后序**：中途停下来时，已落地的部分是一个自洽的前缀。已在本地的包不进计划，但它的依赖仍会往下看。

## createPyodideSupply(options)

供给线的 Node 侧：把随包 `pyodide-lock.json` 目录化，并按它下载校验、盘点、清理。

```ts
function createPyodideSupply(options: { pyodideDir: string; cdnBase?: string }): PyodideSupply

interface PyodideSupply {
  catalog: readonly SupplyCatalogEntry[]           // 可下载目录（按名字排序），清单接口的直接数据源
  digestOf(fileName: string): string | undefined   // 文件名 → lock 里的 sha256；没有 = 不该下载
  inventory(cacheDir: string): { cacheDir, pyodideVersion, entries }   // 每个包的状态与字节数
  seedBundled(cacheDir: string): Promise<void>     // 随包 wheel 在缓存目录就位（硬链，失败退复制）
  download(fileName: string, cacheDir: string): Promise<Buffer>        // 按 sha256 校验的原子下载
  cachePackages(cacheDir: string, names: string[]): Promise<CacheResult[]>  // 顺序取、失败即停
  cachedFiles(cacheDir: string): string[]          // 缓存目录里现有的包文件
  filesForNames(cacheDir: string, names: string[]): string[]            // 按包名挑缓存文件
  createNodeLoader(cacheDir: string): PyodideLoader                    // Node 干跑运行时的装载器
}
```

**参数**

| 字段 | 类型 | 默认 | 作用 | 不传的后果 |
| --- | --- | --- | --- | --- |
| `pyodideDir` | `string` | 必填 | 随包 Pyodide 目录（含 `pyodide-lock.json`、`pyodide.mjs` 与随包 wheel） | 不可省略 |
| `cdnBase` | `string` | 按 lock 版本取 jsdelivr 官方通道 | 回源下载的基地址 | 走官方 CDN；内网环境要把 wheel 放进缓存目录或自建源 |

**例子**（把供给线接成宿主插件的 HTTP 路由与 Node 装载器）

```ts
import { createPyodideSupply, setPyodideLoader } from 'manim-live/node'

const supply = createPyodideSupply({ pyodideDir: join(pluginDir, 'assets', 'pyodide') })

// GET /packages → 清单；POST /packages/cache → 预缓存
const inventory = supply.inventory(cacheDir)
const results = await supply.cachePackages(cacheDir, ['matplotlib'])

// Host 预检用真 Python：装载器只认缓存目录（packageCacheDir 必须显式给，见注释）
setPyodideLoader(supply.createNodeLoader(cacheDir))
```

**注意**

- **lock 是唯一清单源**：文件名与 sha256 一律以随包 `pyodide-lock.json` 为准，不另写一份——两份清单早晚会对不上。
- `download` 没有摘要就**不下**（拒绝要比「下完才发现校验不过」清楚得多）；落盘是先写临时名再改名，中途失败不会留下半截文件冒充「已缓存」。
- 缓存目录由调用方定（DSH 插件挂在 `~/.dsh/cache/<插件名>/pyodide` 下），删也只删该目录里的包文件。
- `createNodeLoader` 造的装载器只**装从缓存目录**读包——`packageCacheDir` 必须显式给，不给时下载的 wheel 会写进随包目录（实测踩过）。
