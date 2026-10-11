/**
 * playground 的语料装载：**在浏览器里**把 `corpus/` 下的语料收成 Corpus。
 *
 * 与 Node 侧（`src/testbench/corpus.ts` 的 `collectCorpus()`）是同一个口径，只是取字节的方式不同：
 * 那边读磁盘，这边靠 vite 的 `import.meta.glob`（bundler 已经把文件内容读成字符串了）。
 * **收敛成 Corpus 的那一步是同一份实现**——`buildCorpus()` / `parseExampleHeader()` 来自核心包
 * 的浏览器入口。所以这一页算出来的 id、分组、`expect`、截图路径，与回归网逐字一致；
 * 不这么做的话，两边对「这条语料是什么意思」各有一套说法，而各自都自洽，最难查。
 *
 * 三样东西：
 *   · 语料本体      `corpus/examples/**\/*.py`（eager 读原文，239 条、约 1 MB，一次性）
 *   · 截图**清单**  `corpus/shots/**\/*.png`（只要键、不要内容——188 张图不该各自变成一个模块请求）
 *   · 截图**内容**  走 vite 中间件挂的 `/shots/` 路由（地址稳定、可 target=_blank 看原尺寸）
 *   · 上一轮真机结果 `corpus/shots/index.json`（gitignored 的本地清单，见下）
 *
 * 语料不在（正式安装 / 从 tarball 跑）时给空表 + 一句说明，**不抛**——这一页照样能用「自定义代码」。
 */
import { buildCorpus, type Corpus, type CorpusSource } from 'manim-live'

const EXAMPLES_PREFIX = '../../corpus/examples/'
const SHOTS_PREFIX = '../../corpus/shots/'

// 路径必须是**字面量**：vite 在编译期做静态替换，拼字符串它认不出来。
const rawSources = import.meta.glob('../../corpus/examples/**/*.py', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

// 只要键：`eager: false` 时值是 `() => Promise`，本模块一个都不调用；`Object.keys` 正是
// vite 文档里「只要清单」的用法。
const shotKeys = Object.keys(import.meta.glob('../../corpus/shots/**/*.png'))

const rawIndex = import.meta.glob('../../corpus/shots/index.json', {
  import: 'default',
  eager: true,
}) as Record<string, unknown>

/** 截图内容的路由前缀（真源在 vite.config.ts 的 assetRoutes）。 */
export const SHOTS_URL = '/shots'

/** 一条语料截图的完整地址。`rel` 形如 `basic/01-circle.png`。 */
export const shotUrl = (rel: string): string => `${SHOTS_URL}/${rel}`

/**
 * 截图那一轮的真机结果（来自 `corpus/shots/index.json`，由 `scripts/shot-corpus.mjs` 落盘）。
 *
 * 为什么值得读：截图只回答「画出来什么样」，回答不了「那一次到底过没过、控制台吵了什么」。
 * 这条记录与图**同一次**跑出来的，对得上才说明「图是当前这版代码的图」。
 *
 * 注意它是 **gitignored 的本地清单**（每跑一次全量就整体重写，进不了库）：
 * 所以这里一律当**可选**信息——没有就不显示，绝不因为它缺失而报错或缺一块界面。
 */
export interface LastRun {
  ok: boolean
  error: string | null
  /** 画布墨迹占比（0~1）：>0 才说明真画出东西了。 */
  ink: number
  /** 这一条是在极速档下跑的吗（**按行记**——清单会被多轮合并，档位可能不同）。 */
  fast: boolean
  /** 页面 console 里的 error（同一次跑时收集的）。 */
  console: string[]
}

export interface ShotArchive {
  /** 这份清单最近一次更新的时刻。 */
  at: string | null
  /** 本轮跑了多少条（合并进清单的）。 */
  ranThisPass: number
  /** 清单里一共有多少条。**小于语料里可截图的条数就说明它来自一次局部跑**。 */
  covered: number
  byId: Record<string, LastRun>
}

const num = (value: unknown): number => (typeof value === 'number' && Number.isFinite(value) ? value : 0)

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

function readArchive(): ShotArchive {
  const empty: ShotArchive = { at: null, ranThisPass: 0, covered: 0, byId: {} }
  const payload = Object.values(rawIndex)[0]
  if (payload === null || typeof payload !== 'object') return empty
  const bag = payload as Record<string, unknown>
  const byId: Record<string, LastRun> = {}
  for (const item of Array.isArray(bag.results) ? bag.results : []) {
    if (item === null || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    const id = typeof row.id === 'string' ? row.id : ''
    if (id === '') continue
    byId[id] = {
      ok: row.ok === true,
      error: typeof row.error === 'string' ? row.error : null,
      ink: num(row.ink),
      fast: row.fast === true,
      console: strings(row.console),
    }
  }
  return {
    at: typeof bag.generatedAt === 'string' ? bag.generatedAt : null,
    ranThisPass: num(bag.ranThisPass),
    covered: Object.keys(byId).length,
    byId,
  }
}

export interface PlaygroundCorpus {
  corpus: Corpus
  /** 装载失败的原因（语料写坏了 / 没找到）。非 null 时页面显示它，而不是崩掉。 */
  error: string | null
  shots: ShotArchive
}

const EMPTY: Corpus = { groups: [], examples: [] }

let cached: PlaygroundCorpus | null = null

/** 装载一次（模块级缓存：239 条源码解析不必每次重做）。 */
export function loadPlaygroundCorpus(): PlaygroundCorpus {
  if (cached !== null) return cached
  const shots = readArchive()
  const keys = new Set(shotKeys.map((key) => key.slice(SHOTS_PREFIX.length)))

  let corpus: Corpus = EMPTY
  let error: string | null = null
  try {
    const sources: CorpusSource[] = Object.entries(rawSources).map(([path, python]) => {
      const rel = path.slice(EXAMPLES_PREFIX.length)
      const cut = rel.indexOf('/')
      return {
        group: cut < 0 ? '' : rel.slice(0, cut),
        name: cut < 0 ? rel : rel.slice(cut + 1),
        // 报错回执里的路径：与 Node 侧 `collectCorpus()` 一样给**包根相对路径**，
        // 两个世界点同一条语料时，报告里那一行字必须一样。
        file: `corpus/examples/${rel}`,
        python,
      }
    })
    corpus = buildCorpus(sources, {
      hasShot: (shot) => keys.has(shot),
      // 与读盘那一路同一条规矩：未登记的分组 / 某组被删空都当场抛。
      // 页面把它收成 error 显示出来——语料写坏了是开发机上的事，不该静默少一组。
      requireComplete: true,
    })
  } catch (thrown) {
    error = thrown instanceof Error ? thrown.message : String(thrown)
  }
  cached = { corpus, error, shots }
  return cached
}

/** 这条语料在截图那一轮的记录（没跑过 / 清单是局部跑 → undefined）。 */
export function lastRunOf(id: string, shots: ShotArchive): LastRun | undefined {
  return shots.byId[id]
}
