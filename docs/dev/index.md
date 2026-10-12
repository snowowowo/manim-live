# 开发与调试

本页面向本仓库的开发者，涵盖技术栈、目录结构、开发流程与发布自检。只在自己项目里使用 manim-live 的读者从[安装](/guide/installation)开始即可，无需读本页。

## 技术栈

| 用途 | 选型 | 说明 |
|---|---|---|
| 语言 | TypeScript 7 | 全仓 `.ts`；类型由 `tsc --noEmit` 单独检查，构建不做类型检查 |
| 构建 | tsdown | 两个入口（浏览器 / Node）各产 ESM + `.d.ts` 到 `dist/`；`manim-web` 一律 external |
| 测试 | vitest + v8 | 用例与被测文件同目录（`*.test.ts`）；联网用例单独一组（`MANIM_NET=1`） |
| 演示台 | vite 7 + React 19 | `playground/`，只用于本地开发，不进 npm 产物 |
| 包管理 | pnpm | 唯一 lockfile 是 `pnpm-lock.yaml`；Node ≥ 20，ESM-only |
| Python 运行时 | Pyodide | 真 CPython 在浏览器里跑；发行版由 `pnpm setup:assets` 接进来 |
| 产物自检 | publint + attw | `pnpm check:pkg`，发布前必跑 |

## 目录结构

```
src/           源码（用例 *.test.ts 与被测文件同目录）
├─ engine/     浏览器侧运行时：Pyodide 加载、画布、渲染、环境探测
├─ py/         Python 侧：桥接、API 映射、运行时包与语料格式
├─ export/     录制与导出（导出器接口 + 浏览器录制器）
└─ testbench/  语料回归的执行与判定
playground/    本地演示台（vite + React，不进 npm 产物）
examples/      框架集成最小验证：vanilla / react / vue / next（不进 npm 产物）
assets/        随包发的资源（Pyodide 发行版、KaTeX），由 setup:assets 软链进来
scripts/       维护脚本：setup-assets / check-playground / 截图与 API 探针
corpus/        语料与真机截图（git 跟踪、不进 npm 产物）+ 本地 pyodide 缓存（忽略）
docs/          本文档站（独立依赖，只有 vitepress 一项）
```

`src/index.ts` 是浏览器入口（含画布），`src/node.ts` 是 Node 入口（干跑预检 + 语料装载，不碰 DOM）。

进 npm 产物的只有 `dist/`、`style.css`、`README.md`、`LICENSE`（`package.json` 的 `files` 白名单）；`playground/`、`examples/`、`corpus/`、`docs/` 都只留在仓里。

## 搭建开发环境

```bash
git clone https://github.com/snowowowo/manim-live.git
cd manim-live
pnpm install
pnpm setup:assets    # 把 assets/pyodide 与 assets/katex 接进来
pnpm playground      # 起本地演示台（vite）
```

`setup:assets` 做的是**软链**不是复制：Pyodide 约 20 MB、KaTeX 约 1.2 MB，复制一份两边必然漂移（一边升级、另一边还是旧的）。默认源是同级的插件仓 `<工作区>/dsh-manim-live/assets/`，换位置就设 `MANIM_PLUGIN_ASSETS`。

## 开发流程

```bash
pnpm dev               # tsdown --watch，改源码即时重构建产物
pnpm typecheck         # tsc --noEmit（include 只含 src 与 playground）
pnpm test              # vitest（不联网的用例）
pnpm test:net          # 联网用例（MANIM_NET=1，取真实 Pyodide / wheel，超时放宽到 5 分钟）
pnpm coverage          # 覆盖率（v8，只算 src）
pnpm check:playground  # 核对演示台的取包目录约定没被改坏
```

改一处代码通常走这几步：

1. **在演示台里验行为**——`playground/` 裸 import **源码**（`@/` 指 `playground/`，`manim-live` 指 `src/index.ts`），改完立刻热更，不用先 build。
2. `pnpm typecheck`——构建不做类型检查，类型错只在这里报。
3. `pnpm test`——用例与被测文件同目录，加功能就加同目录的 `*.test.ts`；碰到真实运行时或取包的改动跑 `pnpm test:net`。
4. `pnpm build`——两个入口都要过，产物进 `dist/`。
5. 动到 `package.json` 的 `exports` / `files` / `sideEffects` 时，跑 `pnpm build && pnpm check:pkg`。

## 演示台

`pnpm playground` 起一个 vite 开发服务器（`playground/vite.config.ts`），是本仓的本地演示台。它带一个**代取中间件**：随包目录里有 wheel 就直接给，没有就按 lock 的 sha256 校验后从 jsdelivr 取回、落在 `corpus/pyodide-cache/`（gitignored）。取一遍就够，之后离线也能跑。`pnpm check:playground`（`scripts/check-playground.mjs`）核对这个目录的约定没被改坏。

取包失败时的分档诊断见[第三方包](/guide/packages)——那是给使用者的排障页。开发侧要知道的只有一句：接缝是 `setPackageDiagnoser`，浏览器侧的分档逻辑在 `src/engine/pyodide.ts`。

## 语料回归

`corpus/`（239 条语料加真机截图）是本库**独有**的职责：支持面实测、回归测试、重跑截图全在这里做。下游消费方（如 dsh-manim-live 的实验场）**不再承担语料回归**——它们只验收自己在宿主里的功能表现，需要样例就内置一小份自己的。

## 发布

发 npm 前必跑：

```bash
pnpm build && pnpm check:pkg
```

`check:pkg` 是 publint 加 arethetypeswrong。当前结论（2026-10-11 实测，全绿）：

- `exports` 全部入口都带 `types` 条件（含 `./style.css` 的 `style.css.d.ts`——TypeScript 7 默认检查副作用导入，没有它消费者会编译失败，验证时发现并补上）；`.d.ts` 已被真实 TS 消费者验证——`examples/react` 严格模式 `tsc`（TS 7）与 `examples/vue` 的 `vue-tsc` 均通过。
- **ESM-only**（Node ≥ 20）：CommonJS 消费者需要动态 `import()`——attw 对此的提示属预期行为，不是缺陷。
- `sideEffects` 仅 `*.css`；`files` 白名单 `dist` / `style.css` / `README.md` / `LICENSE`。
- `engines` / `repository` / `homepage` / `bugs` / `license` / `keywords` 齐备。

文档站的维护说明（base 怎么改、截图从哪挑）在 `docs/README.md`。
