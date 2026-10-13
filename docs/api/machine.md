# API 参考：本机环境探测

「这台机器有没有那套 manim 命令行工具链」——跑**真命令**去问。导出 mp4 走本机 CLI（见[导出](/api/export)）之前必须先过这道门。

与[环境状态](/api/status)是两件事，别混：那个报的是**浏览器里** Pyodide / WASM 运行时的状态（读页面内的事实，不跑命令）；这里报的是**本机装没装** manim / FFmpeg / LaTeX。

Node 侧四个函数（`probePlan` / `probeCheck` / `resolveExecutable` / `pythonBesideExecutable`）都在 `manim-live/node`；浏览器侧取数用 `createMachineClient`。

```
probePlan()                → EnvPlan                                   秒回：只列要测什么
probeCheck(id)             → Promise<EnvResult | null>                 跑那一项；id 不认识回 null
resolveExecutable(tool)    → string | null                             PATH 里找可执行文件
pythonBesideExecutable(f)  → string | null                             venv 布局的同层解释器

createMachineClient({ environmentUrl }) → MachineClient
├─ loadPlan()              → Promise<EnvPlan>
└─ probe(id)               → Promise<EnvResult>
```

## probePlan()

探测计划：有哪些项、各自要找什么、会跑什么命令。**不含探测结果**，所以是秒回的。

```ts
function probePlan(): EnvPlan

interface EnvPlan {
  platform: string
  arch: string
  node: string
  path: string      // 实际用来找命令的 PATH（含补上的常见安装目录）
  checks: EnvCheck[]   // { id, tool, command }
}
```

**返回** `EnvPlan`。默认探测六项：`python3`、`manim`、`manimModule`（`import manim` 的版本，问的是 manim 命令同层的解释器）、`ffmpeg`、`latex`、`dvisvgm`。

**注意**

- 探测项**分开问**的理由就在这：`manim --version` 要 import 整个 Manim，本机上可能十几秒；一次全跑会把首屏吊死，分开之后界面可以逐行亮起来。
- 补 PATH（`/usr/local/bin`、`/opt/homebrew/bin`、`/Library/TeX/texbin`、`~/.local/bin` 等）是为了对付桌面应用拿到的精简环境变量——「明明装了却报没装」是这类工具最常见的假阴性。

## probeCheck(id)

跑一项探测。一律 `execFile` + 写死的参数，用户输入不进命令行。

```ts
function probeCheck(id: string): Promise<EnvResult | null>

interface EnvResult {
  id: string
  status: 'ok' | 'missing' | 'error'   // 装了 / 没装 / 装了但报错
  path: string | null                  // 找到的可执行文件；没找到是 null
  version: string                      // 版本行（ok 时才有）
  detail: string                       // 没装 / 出错时的说明
}
```

**参数** `id`：探测项标识（`probePlan()` 的 `checks[].id`）。

**返回** `EnvResult`；`id` 不认识回 `null`（调用方答 404）。

**例子**

```ts
import { probeCheck } from 'manim-live/node'

const manim = await probeCheck('manim')
if (manim === null) return
if (manim.status !== 'ok') console.log('本机不能导出：', manim.detail)
else console.log('manim 在', manim.path, '，', manim.version)
```

**注意**

- `manimModule` 这项**跟着 manim 命令走**：它问的是 manim 同层的解释器（venv / pipx 布局），不是 PATH 第一个的 `python3`。盯着后者会把「装在 venv 里的 manim」误判成没装（实测踩过）。

## resolveExecutable(tool) / pythonBesideExecutable(file)

两个小的寻址工具，prefetch / 定位类场景可单独用。

```ts
function resolveExecutable(tool: string): string | null
function pythonBesideExecutable(file: string): string | null
```

**参数** `tool`：可执行文件名（只在补好的 PATH 里找，支持 Windows 的 `.exe` / `.cmd` / `.bat`）；`file`：一个可执行文件路径。

**返回** 绝对路径；找不到 / 不是 venv 布局回 `null`。

**注意**

- `pythonBesideExecutable` 会**先解软链**：`~/.local/bin/manim` 链到 venv 里时，不解开就找不到那个 venv 的同层 `python3`。

## createMachineClient(options)

探测的浏览器侧取数客户端。

```ts
function createMachineClient(options: { environmentUrl: string }): MachineClient

interface MachineClient {
  loadPlan(): Promise<EnvPlan>      // GET  environmentUrl
  probe(id: string): Promise<EnvResult>   // GET  environmentUrl/<id>
}
```

**参数** `environmentUrl`：探测路由地址（调用方自己插件的命名空间）。

**返回** `MachineClient`。两个方法**失败都抛错**：`probe` 失败抛错才会把那一行标成「出错」，而不是误报成「这项没装」——界面分得清这两件事，靠的就是这条纪律。

**例子**

```ts
import { createMachineClient } from 'manim-live'

const machine = createMachineClient({ environmentUrl: '/dsh-plugins/example/environment' })
const plan = await machine.loadPlan()
const results = await Promise.all(plan.checks.map(async (check) => {
  try {
    return await machine.probe(check.id)
  } catch (error) {
    return { id: check.id, status: 'error' as const, path: null, version: '', detail: String(error) }
  }
}))
```

**注意**

- `parsePlan` / `parseResult` 两个解析函数也导出：响应是不可信输入（版本对不上、中间层塞了错误页），逐字段过一遍，坏条目不牵连好条目。
