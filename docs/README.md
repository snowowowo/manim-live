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

示例章的 36 个页面（17 组 × 中英 + 两个总览）由 `scripts/gen-examples-docs.mjs` 生成：标题与预期取自
语料 docstring（唯一出处），英文文案在 `docs/examples-i18n.json`，代码走 snippet import——页面里不复制任何字节。
改语料或翻译表后重跑脚本；想换截图先去 `corpus/shots/` 重挑，或跑 `pnpm shot:corpus` 重截。

示例章另有自己的一套侧栏：`sidebar` 是按路径前缀分的对象（示例章一套、兜底 `/` 一套），前缀匹配的是页面的
`relativePath`，所以英文侧栏的键要写成 `/en/examples/`。子组按 `collapsed` 收起，含当前页的子组会自动展开。

截图统一经 `docs/shots`（→ `../corpus/shots` 的符号链接）引用，**不要改回 `corpus/shots` 的相对路径**：
dev 模式不重写 markdown 里的图片 URL（按页面 URL 解析），只有落在 `docs/` 内的路径才能 dev / build 都取得到；
build 会把它收进 `assets/` 并哈希。代价是 Windows 检出需要 symlink 权限。仓里不再存复制图（旧的 `docs/images/` 已删）。

## i18n 约定

- **中文是源语言**，页面在根目录；**英文是本地化**，页面在 `en/` 下，目录结构与中文一一对应。
- `config.ts` 里 `locales.root` = 中文、`locales.en` = 英文（`link: '/en/'`），导航切换由 VitePress
  的 locale 选择器提供；`nav` / `sidebar` / 文案标签按语言各配一份，`socialLinks` 等共享项在顶层 `themeConfig`。
- **两侧只差语言、不差内容**：改了中文必须同步改英文；英文链接指向 `/en/...` 前缀，
  `en/` 下图片相对路径比根目录深一层。
- 中文写法遵循容器仓技能 `.agents/skills/tech-doc-style-chinese`（克制、事实保真、一段一义、
  术语一致、中西文之间加空格、段落不硬换行）。
