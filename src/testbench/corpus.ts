// 语料的**唯一**位置与读取入口（Node 侧：核心包的测试、playground、以及插件端的实验场路由共用）。
//
// 为什么语料在仓根的 `corpus/` 而不进发布集：这批文件是**开发期的回归网**（外加讲解模板的出处），
// 不是产品功能——跟着发布等于把上百条源码打进产物，还给每个使用者一个只有开发者才用的实验场。
// 所以它留在包外（`package.json` 的 `files` 不含 `corpus`）：只在**仓库检出**里读得到，
// 正式安装里这条路径不存在，调用方据此走降级（空表），不报错。
//
// 解析顺序：环境变量 MANIM_CORPUS（绝对路径）优先，否则 = <本包根>/corpus/examples。
// 消费者共用本文件，**不许再有第二处**（各写各的路径必然漂移）：
//   ① src/py/examples.test.ts（Node 回归）
//   ② 插件端 src/host/index.js 的语料路由（浏览器侧实验场）—— 经 `manim-live/node` 导入本模块
//   ③ 插件端 scripts/gen-skill.mjs（把 @template 语料内联进技能）
//   ④ scripts/shot-corpus.mjs（真浏览器截图落盘）
//   ⑤ 浏览器侧：包内的 playground —— 它拿不到 `node:fs`，走 vite 的 `import.meta.glob` 读源码，
//      再用**同一个** `buildCorpus()` 收成 Corpus（格式那一半在 `src/py/corpus-format.ts`）。
//
// 截图（`corpus/shots/<组>/<同名>.png`）也在这里定路径，理由同上：
//   它是「这条语料**真渲染出来长什么样**」的唯一记录——回归只证明没炸，画面对不对只能看图。
//   存成与 .py 同名同目录，`collectCorpus()` 顺手就能给出每条对应的图，页面直接显示，
//   不必每次现截。同样在包外，正式安装里没有。路径只有 shotPath() 一处定义。
//
// 文件即元数据（写法见 src/py/corpus-format.ts 的顶注）：标题 / @expect / @reject / @note / @template / @browser。
// 目录即分组：<语料根>/<组>/NN-<名字>.py → 分组 <组>、条目 id `<组>-<名字>`（NN- 只用于排序）。
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildCorpus, GROUPS, shotPath, type CorpusSource } from '../py/corpus-format.ts'
import type { Corpus } from '../py/examples.ts'

// 格式那一半（分组表 / 文件头解析 / id 与截图路径）在 corpus-format.ts，两栖共用；这里原样转出，
// 免得老消费者（测试、插件路由、gen-skill）改 import 路径。
export { GROUPS, exampleId, parseExampleHeader, shotPath } from '../py/corpus-format.ts'

/**
 * 本包根：**向上找**含 `package.json` 的那一级。
 *
 * 不能按固定层级数（如「上两级」）：源码直跑时本文件在 `src/testbench/`（上两级才是包根），
 * 构建产物里它在 `dist/node.js`（上一级就是包根）——两种形态深度不同，写死必错一边
 * （实测：产物里按上两级算，包根跑到了工作区，语料一条都读不到）。
 * 向上找 package.json 对两种形态都给同一答案，也不怕将来再挪目录。
 */
function findPackageRoot(start: string): string {
  let dir = start
  for (let depth = 0; depth < 6; depth += 1) {
    if (existsSync(join(dir, 'package.json'))) return dir
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  return start
}

export const PACKAGE_ROOT = findPackageRoot(dirname(fileURLToPath(import.meta.url)))

/** 语料根目录（绝对路径）。目录不存在时返回路径本身，由调用方按「这台机器没有语料」处理。 */
export function corpusRoot(): string {
  const configured = process.env.MANIM_CORPUS?.trim()
  return configured ? resolve(configured) : join(PACKAGE_ROOT, 'corpus', 'examples')
}

/**
 * 截图根目录（绝对路径）：与语料同级，**不是**它的子目录。
 * 特意放在 examples/ 外面——`collectCorpus()` 会把语料根下未登记的目录当配置错误抛错，
 * 截图塞进去就得再给它开一次后门；摆在外面则两边各不相干。
 */
export function shotsRoot(): string {
  const configured = process.env.MANIM_SHOTS?.trim()
  return configured ? resolve(configured) : join(PACKAGE_ROOT, 'corpus', 'shots')
}

/** 语料是否就位（开发机有、正式安装没有）。 */
export function corpusAvailable(): boolean {
  return existsSync(corpusRoot())
}

/** 只要目录（不递归进子目录）：一个目录一个分组。 */
const listFiles = (dir: string): string[] =>
  readdirSync(dir)
    .filter((name) => statSync(join(dir, name)).isFile() && name.endsWith('.py'))
    .sort()

/** 报错回执里的路径：包内给包根相对路径，包外（MANIM_CORPUS 指过去）给绝对路径。 */
function relativeToRoot(path: string): string {
  const rel = relative(PACKAGE_ROOT, path)
  if (rel.startsWith('..')) return path.split(sep).join('/')
  return rel.split(sep).join('/')
}

/**
 * 读全部语料。目录不存在（正式安装）返回空表，**不抛**——调用方据此走降级。
 * 目录在、分组对不上则**抛**（判定在 `buildCorpus()` 里）：开发机上的配置错误，静默漏掉更糟。
 */
export function collectCorpus(): Corpus {
  const root = corpusRoot()
  if (!existsSync(root)) return { groups: [], examples: [] }

  const sources: CorpusSource[] = []
  for (const group of GROUPS) {
    const dir = join(root, group.id)
    let files: string[]
    try {
      files = listFiles(dir)
    } catch {
      throw new Error(`${group.id}/ 目录不存在（${dir}）——GROUPS 里登记了就得建`)
    }
    for (const name of files) {
      const path = join(dir, name)
      sources.push({ group: group.id, name, file: relativeToRoot(path), python: readFileSync(path, 'utf8') })
    }
  }
  return buildCorpus(sources, {
    hasShot: (shot) => existsSync(join(shotsRoot(), shot)),
    // 读盘这一路是仓里自己的语料：登记了就必须有（未登记的分组 / 某组被删空都当场抛）。
    // playground 走 bundler 时也开这一条，两个世界口径一致。
    requireComplete: true,
  })
}
