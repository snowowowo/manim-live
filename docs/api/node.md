# API 参考：Node 入口

`manim-live/node` 是不依赖 DOM 的那一半，供服务端、CI 与脚本使用。在该入口 import 任何依赖 DOM 或 WebGL 的模块都会失败，这是它的契约。概念与部署方式见 [Node 预检](/guide/node)。

## runPython(python, bridge, options?)

在 Pyodide 里真实解释执行一段 Python，绘制动作全部发送到调用方提供的桥上。

```ts
function runPython(python: string, bridge: ManimBridge, options?: RunOptions): Promise<void>

interface RunOptions {
  output?: (text: string) => void        // print 的落点，不传则丢弃
  drive?: boolean                        // 跑完是否自动执行 Scene 子类的 construct，默认 true
  onLoading?: (names: string[]) => void  // 取包进展
  active?: () => boolean                 // 轮到这段时再问一次「调用方还在吗」，false 则整段作废
}
```

**参数**

- `python`：源码，两种形态都收（完整 class 外壳或裸 construct 体）。
- `bridge`：绘制动作的接收方。预检用 `createDryRunBridge()`，记录用 `createRecordingBridge()`，真渲染用浏览器入口的 `createManimWebBridge()`。
- `options.active`：返回 `false` 时抛 `PyRunCancelled`，连解释器都不碰——用于「轮到它时调用方已经不在」的场景。

**返回** `Promise<void>`。语法错、未定义名、实测缺失的能力统一抛 `PyRuntimeError`，消息里带还原后的行号。

**例子**

```ts
import { createDryRunBridge, runPython } from 'manim-live/node'

try {
  await runPython(python, createDryRunBridge())
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
}
```

## createDryRunBridge()

一份「什么都不画」的桥：代码真被解释执行，只是不产出画面。预检用它。

```ts
function createDryRunBridge(): ManimBridge
```

## 预热

Node 入口**没有**单独的预热函数：第一次 `runPython()` 会顺带把 Pyodide 与 manim 适配层拉起来（核心约 13 MB），所以进程里的第一段代码明显更慢。预热原语 `warmupRuntime()` 只从浏览器入口低层导出，见[低层导出](/api/internals)。

## PyRuntimeError 与 PyRunCancelled

```ts
class PyRuntimeError extends Error      // 用户代码或运行时的错，带还原后的行号
class PyRunCancelled extends Error      // 执行到它时调用方已作废：不是错误，不向用户显示
```

两者需分开处理：前者原样上报，后者不向用户显示任何内容。

## 语料装载

只在 Node 入口，因为要读盘。语料本体在核心包仓的 `corpus/`，不进发布集，正式安装里读不到。

```ts
function collectCorpus(): Corpus          // 读盘收成 Corpus；语料缺失时给空表
function corpusRoot(): string             // 语料根：MANIM_CORPUS 优先，否则 <包根>/corpus/examples
function corpusAvailable(): boolean       // 这个检出里有没有语料
function shotsRoot(): string              // 截图根
function shotPath(group: string, file: string): string
const PACKAGE_ROOT: string                // 核心包自己的根目录
```

**例子**

```ts
import { collectCorpus, corpusAvailable } from 'manim-live/node'

if (!corpusAvailable()) {
  console.warn('这个检出里没有语料，跳过')
} else {
  const { groups, examples } = collectCorpus()
  console.log(`${groups.length} 组 / ${examples.length} 条`)
}
```

## 其余导出

`manim-live/node` 还导出下面几组，各自的完整参考见对应页：

| 导出 | 参考页 |
| --- | --- |
| `probePlan` / `probeCheck` / `resolveExecutable` / `pythonBesideExecutable` | [本机探测](/api/machine) |
| `createPyodideSupply` | [包管理](/api/packages) |
| `createLocalExport` / `sceneClassName` / `wrapConstructBody` / `buildRenderArgs` | [导出](/api/export) |
