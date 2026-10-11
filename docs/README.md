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

## i18n 约定

- **中文是源语言**，页面在根目录；**英文是本地化**，页面在 `en/` 下，目录结构与中文一一对应。
- `config.ts` 里 `locales.root` = 中文、`locales.en` = 英文（`link: '/en/'`），导航切换由 VitePress
  的 locale 选择器提供；`nav` / `sidebar` / 文案标签按语言各配一份，`socialLinks` 等共享项在顶层 `themeConfig`。
- **两侧只差语言、不差内容**：改了中文必须同步改英文；英文链接指向 `/en/...` 前缀，
  `en/` 下图片相对路径比根目录深一层。
- 中文写法遵循容器仓技能 `.agents/skills/tech-doc-style-chinese`（克制、事实保真、一段一义、
  术语一致、中西文之间加空格、段落不硬换行）。
