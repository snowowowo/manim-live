/**
 * 核心包产物：两个入口，都产 ESM + `.d.ts`，`manim-web` 一律 external。
 *
 *   - `dist/index.js`  浏览器入口（含画布）：`createManimRenderer` → platform: browser
 *   - `dist/node.js`   干跑预检 + 语料装载入口（不碰 DOM）：platform: node
 *
 * 两个入口分两种 platform：`node.js` 要 import `node:fs` 之类，`index.js` 一个都不碰。
 * 混成一个 neutral 构建会让 node 内置模块每次都被报「解析不到」（其实是对的，但天天刷屏）。
 *
 * **manim-web 不打包**（`deps.neverBundle`）：它是重量级实现库（牵着 three.js），
 * 交给使用者自己的 bundler 做 tree-shaking / code-splitting。它仍在 `dependencies` 里，
 * 只是为了让 `npm install manim-live` 顺手把版本装对（见顶层设计 §6.2）。
 */
import { defineConfig } from 'tsdown'

/** 两个入口共用的部分。 */
const shared = {
  outDir: 'dist',
  format: 'esm' as const,
  dts: true,
  sourcemap: true,
  // 本包是 `"type": "module"`：产物就用 `.js` / `.d.ts`，别让 platform=node 那一路
  // 自作主张改成 `.mjs` / `.d.mts`（`exports` 里写的是 `.js`，对不上 publint 会当场报）。
  fixedExtension: false,
  deps: { neverBundle: ['manim-web'] },
  // 发包体检（顶层设计 §14.2 第 7 条）——tsdown 原生支持，基本白送。
  publint: true,
  attw: {
    // 本包**有意** ESM-only（顶层设计 §14.3 第 13 条）：node10 与 CJS 解析失败是预期，不是缺陷。
    profile: 'esm-only' as const,
    // `./style.css` 是 CSS 导出，attw 拿 JS 解析规则量它必然失败——这一条是它的固有误报。
    // 关掉它不影响安全网：**文件是否存在由 publint 管**（漏发 / 写错路径它照样报）。
    ignoreRules: ['no-resolution'],
  },
}

export default defineConfig([
  // 浏览器入口：先跑，由它清目录（clean 只在第一个产物上开，否则会把前一个擦掉）
  { ...shared, entry: ['src/index.ts'], platform: 'browser', clean: true },
  // Node 入口：干跑预检 + 语料装载（要 node:fs）
  { ...shared, entry: ['src/node.ts'], platform: 'node', clean: false },
])
