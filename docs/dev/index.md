# 开发与调试

本页面向本仓库的开发者，涵盖构建、测试、演示台与产物自检。仅在自己项目中使用 manim-live 的读者请从[安装](/guide/installation)开始，无需阅读本页。

## 常用命令

```bash
pnpm build         # tsdown 构建产物（dist/）
pnpm dev           # tsdown --watch
pnpm test          # vitest（不联网的用例）
pnpm test:net      # 联网用例（MANIM_NET=1，取真实 Pyodide / wheel，超时放宽到 5 分钟）
pnpm typecheck     # tsc --noEmit（include 只有 src 与 playground，不含 docs）
pnpm coverage      # 覆盖率（v8，只算 src）
pnpm check:pkg     # publint + attw，发布前自检产物
pnpm setup:assets  # 准备 assets/（Pyodide 发行版等）
```

## 语料回归的唯一归属地

`corpus/`（239 条语料 + 真机截图）是本库**独有**的职责：支持面实测、回归测试、重跑截图全在这里做。下游消费方（如 dsh-manim-live 的实验场）**不再承担语料回归**——它们只验收自己在宿主里的功能表现，需要样例就内置一小份自己的。

## 演示台（playground）

`pnpm playground` 起一个 vite 开发服务器（`playground/vite.config.ts`），是本仓的本地演示台。
它带一个**代取中间件**：随包目录里有 wheel 就直接给，没有就按 lock 的 sha256 校验后从
jsdelivr 取回、落在 `corpus/pyodide-cache/`（gitignored）。取一遍就够，之后离线也能跑。
`pnpm check:playground`（`scripts/check-playground.mjs`）核对这个目录的约定没被改坏。

取包失败时的分档诊断见[第三方包从哪来](/guide/packages)——那是给**使用者**的排障页；
开发侧要知道的只有一句：接缝是 `setPackageDiagnoser`，浏览器侧分档逻辑在
`src/engine/pyodide.ts`。

## 发布自检（发 npm 前必跑）

```bash
pnpm build && pnpm check:pkg
```

`check:pkg` = publint + arethetypeswrong。当前结论（2026-10-11 实测，全绿）：

- `exports` 全部入口都带 `types` 条件（含 `./style.css` 的 `style.css.d.ts`——TypeScript 7 默认检查副作用导入，没有它消费者会编译失败，验证时抓到并补上）；`.d.ts` 已被真实 TS 消费者验证——`examples/react` 严格模式 `tsc`（TS 7）与 `examples/vue` 的 `vue-tsc` 均通过。
- **ESM-only**（Node ≥ 20）：CommonJS 消费者需要动态 `import()`——attw 对此的提示属预期行为，不是缺陷。
- `sideEffects` 仅 `*.css`；`files` 白名单 `dist` / `style.css` / `README.md` / `LICENSE`。
- `engines` / `repository` / `homepage` / `bugs` / `license` / `keywords` 齐备。

## 仓库布局

```
src/          源码（测试 *.test.ts 与被测文件同目录）
playground/   本地演示台（vite，不进 npm 产物）
examples/     框架集成最小验证项目：vanilla / react / vue / next（不进 npm 产物）
assets/       随包发的资源（Pyodide 发行版等）
scripts/      setup-assets / check-playground 等维护脚本
corpus/       语料与截图（git 跟踪、不进 npm 产物）+ 本地 pyodide 缓存（忽略）
docs/         本文档站（独立依赖，只有 vitepress 一项）
```

文档站的维护说明（base 怎么改、截图从哪挑）在 `docs/README.md`。
