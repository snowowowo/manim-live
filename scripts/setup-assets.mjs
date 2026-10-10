// 把开发期要用的静态资源接进来：`assets/pyodide` 与 `assets/katex` 指向插件仓的那两份。
//
// 为什么不复制：Pyodide 约 20 MB、KaTeX 约 1.2 MB（顶层设计 §2.4 定案——资源随插件发、不进核心包）。
// 复制一份等于让两台机器上的同一份东西各占一块盘，还必然漂移（插件升级了、核心这份还是旧的）。
// 软链只指路、不搬运，两边永远是同一份。
//
// 默认源：同级的插件仓 `<工作区>/dsh-manim-live/assets/`；换位置就设 `MANIM_PLUGIN_ASSETS`。
//
// 运行：node scripts/setup-assets.mjs
import { existsSync, lstatSync, mkdirSync, rmSync, symlinkSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE_ROOT =
  process.env.MANIM_PLUGIN_ASSETS?.trim() ||
  resolve(PKG_ROOT, '..', 'dsh-manim-live', 'assets')

if (!existsSync(SOURCE_ROOT)) {
  console.error(`找不到资源目录：${SOURCE_ROOT}\n（设 MANIM_PLUGIN_ASSETS 指向插件仓的 assets/）`)
  process.exit(1)
}

mkdirSync(join(PKG_ROOT, 'assets'), { recursive: true })

for (const name of ['pyodide', 'katex']) {
  const source = join(SOURCE_ROOT, name)
  const target = join(PKG_ROOT, 'assets', name)
  if (!existsSync(source)) {
    console.warn(`跳过 ${name}：源不存在（${source}）`)
    continue
  }
  // 已经是链接就重建（源可能换过位置）
  if (existsSync(target)) {
    const stat = lstatSync(target)
    if (stat.isSymbolicLink()) rmSync(target)
    else {
      console.warn(`跳过 ${name}：${target} 已存在且不是软链——请先自行处理`)
      continue
    }
  }
  symlinkSync(relative(dirname(target), source), target, 'dir')
  console.log(`${name} → ${relative(PKG_ROOT, source)}`)
}
