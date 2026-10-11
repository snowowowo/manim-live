# 文档站（VitePress）

给 GitHub Pages 用的静态技术文档：怎么装、怎么用、在各个框架下怎么用、示例截图与代码。

**它与核心包的依赖图零关系**——本目录有自己的 `package.json`，依赖只有 `vitepress` 一项；
不在核心包的 `files` 白名单里，不进 npm 产物，`pnpm typecheck` 的 include 也不含它
（根 `tsconfig.json` 只 include `src` 与 `playground`）。

```bash
cd docs
pnpm install     # 只在本目录装一次（本目录自己的 lock 文件）
pnpm dev         # 本地预览 http://localhost:5173/manim-live/
pnpm build       # 产物在 .vitepress/dist/
```

`base` 配在 `.vitepress/config.ts`（现在是 `/manim-live/`，与 `snowowowo.github.io/manim-live/`
的项目页地址对齐）。正文里的图片**全是相对路径**，vite 构建时会自动带上 base——
换域名 / 换用户页只改 config 里那一处，正文不用动。

截图从 `_dev/shots/`（语料真机渲染的 188 张）里挑的，都注明了出处语料；
想换图就去那里重新挑，或先跑 `pnpm shot:corpus` 重截。
