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

## 演示台（playground）

`pnpm playground` 起一个 vite 开发服务器（`playground/vite.config.ts`），是本仓的本地演示台。
它带一个**代取中间件**：随包目录里有 wheel 就直接给，没有就按 lock 的 sha256 校验后从
jsdelivr 取回、落在 `_dev/pyodide-cache/`（gitignored）。取一遍就够，之后离线也能跑。
`pnpm check:playground`（`scripts/check-playground.mjs`）核对这个目录的约定没被改坏。

取包失败时的分档诊断见[第三方包从哪来](/guide/packages)——那是给**使用者**的排障页；
开发侧要知道的只有一句：接缝是 `setPackageDiagnoser`，浏览器侧分档逻辑在
`src/engine/pyodide.ts`。

## 仓库布局

```
src/          源码（测试 *.test.ts 与被测文件同目录）
playground/   本地演示台（vite，不进 npm 产物）
assets/       随包发的资源（Pyodide 发行版等）
scripts/      setup-assets / check-playground 等维护脚本
_dev/         开发期素材（语料截图、pyodide 缓存），不进发布集
docs/         本文档站（独立依赖，只有 vitepress 一项）
```

文档站的维护说明（base 怎么改、截图从哪挑）在 `docs/README.md`。
