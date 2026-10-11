/**
 * 语料的**格式**：目录即分组、文件头即元数据。这一段**不碰 `node:`**。
 *
 * 为什么单独抽出来：语料的读者有两个世界——
 *   · Node 侧（`src/testbench/corpus.ts`）：从磁盘读。回归测试、截图脚本、插件端的语料路由走它；
 *   · 浏览器侧（包内的 playground，靠 vite 的 `import.meta.glob`）：源码由 bundler 读成字符串。
 * 两边手上都只有「组名 + 文件名 + 一段文本 + 它在仓库里的路径」，往后要做的事**一模一样**：
 * 解析 docstring、算 id、算截图路径、按登记顺序排。
 *
 * 所以放这儿、两边共用。**不许各写一套**：那等于让 playground 与回归网对「这条语料是什么意思」
 * 各有一套说法——id 对不对得上、图名叫什么、`reject` 组怎么判——迟早对不上，
 * 而对不上的时候两边各自都自洽，查起来最费劲。
 *
 * 元数据写在被收录文件开头的模块 docstring 里（不影响它独立运行）：
 *
 *   """画一个圆                  ← 第一行 = 条目标题
 *
 *   @reject Table                ← 本条应被**当场拒绝**，后面那个词必须出现在报错里
 *   @expect 出现一个青色圆…       ← **预期表现**（一句话，人看得懂就算数）
 *   @browser                     ← 只能真浏览器跑（要 DOM / WebGL，如 SVGMobject 的 DOMParser）
 *   @note 2026-10-09 事故：…      ← 为什么有这条
 *   @template 要画带坐标系的函数图…  ← 入选技能模板区，后面那句 = 「什么时候照它抄」
 *   """
 *
 * 目录即分组：`<语料根>/<组>/NN-<名字>.py` → 分组 `<组>`、条目 id `<组>-<名字>`（`NN-` 只用于排序）。
 */
import type { Corpus, ExampleGroup, ManimExample } from './examples.ts'

/**
 * 分组登记表：[id, 显示名, 是否需要联网取包]。**顺序即页面上的顺序**。
 *
 * 为什么是一张写死的表而不是「读目录就知道」：目录给不了中文名与顺序，也给不了「这组要联网」。
 * 代价是新增分组必须来这儿登记——所以 `buildCorpus()` 对「未登记的目录」**抛错**，
 * 宁可当场吵，也不要新加的文件夹被静默漏掉。
 */
export const GROUPS: ReadonlyArray<{ id: string; title: string; network?: boolean }> = [
  { id: 'basic', title: '基础几何' },
  { id: 'ctor', title: '构造器参数' },
  { id: 'method', title: '方法与改写' },
  { id: 'graph', title: '坐标系与数据' },
  { id: 'text', title: '文字与公式' },
  { id: 'updater', title: '更新器与轨迹' },
  { id: 'animate', title: '动画' },
  { id: 'scene', title: '场景与分组' },
  { id: 'lesson', title: '讲解场景（模板）' },
  // 按学科的实际讲解场景（下面五组）。与 lesson 的区别：lesson 是**通用范式**（也是技能里的模板），
  // 这五组是**具体知识点**——高数、线代、概率、群论、离散，都是真上课会讲的那一类画面。
  { id: 'math-calculus', title: '高等数学与数学分析' },
  { id: 'math-linear', title: '线性代数' },
  { id: 'math-prob', title: '概率论与统计' },
  { id: 'math-group', title: '群论' },
  { id: 'math-discrete', title: '离散数学' },
  // 语法综合：只用 manim + 标准库（numpy 随包），所以**离线也跑**，默认套件里就有一份。
  { id: 'syntax', title: '语法综合（离线）' },
  // API 覆盖兜底：把三态表里 state=ok 的名字成批点名（颜色 / 速率 / 动画法 / 物体），
  // 一次一条维度钉全。也是离线的。
  { id: 'api', title: 'API 点名（离线）' },
  // 下面两组要真联网取包（首次跑会下载几十 MB），默认不进自动测试；见 examples.test.ts 的 MANIM_NET。
  { id: 'net', title: '第三方包（按需取·需联网）', network: true },
  { id: 'combo', title: '综合场景（多库协同·需联网）', network: true },
  { id: 'reject', title: '应当被当场拒绝' },
]

/** 一条语料的文件头（docstring 解析结果）。 */
export interface ExampleHeader {
  /** 第一行非空文本。 */
  title: string
  /** `@note` 可以有多条，按出现顺序。 */
  notes: string[]
  reject: boolean
  errorIncludes?: string
  expectation?: string
  browser: boolean
  template?: string
}

/** 一条语料的来源：两个世界都能给出来的那四样。 */
export interface CorpusSource {
  /** 分组 id = 语料根下的一级目录名。 */
  group: string
  /** 文件名，形如 `01-circle.py`（`NN-` 排序前缀在 id 里去掉）。 */
  name: string
  /** 报错回执里显示的路径（包内给包根相对路径，包外给绝对路径）。 */
  file: string
  /** 逐字的源码。 */
  python: string
}

/**
 * 解析文件头的模块 docstring。第一行非空文本是标题，`@xxx` 是可选元数据。
 *
 * 缺 docstring / 缺标题一律**抛**：这是开发机上的语料写坏了，静默跳过等于把一条回归悄悄丢掉。
 */
export function parseExampleHeader(label: string, text: string): ExampleHeader {
  const match = text.match(/^"""([\s\S]*?)"""/)
  if (match === null) throw new Error(`${label}：缺少开头的模块 docstring（第一行写标题）`)
  const lines = match[1]!.split('\n').map((line) => line.trim())
  const title = lines.find((line) => line !== '')
  if (title === undefined) throw new Error(`${label}：docstring 第一行要写标题`)
  let reject = false
  let errorIncludes: string | undefined
  let expectation: string | undefined
  let browser = false
  let template: string | undefined
  const notes: string[] = []
  for (const line of lines) {
    if (line.startsWith('@note')) notes.push(line.slice('@note'.length).trim())
    else if (line.startsWith('@expect')) {
      const value = line.slice('@expect'.length).trim()
      if (value !== '') expectation = value
    } else if (line.startsWith('@browser')) {
      browser = true
    } else if (line.startsWith('@template')) {
      const value = line.slice('@template'.length).trim()
      if (value !== '') template = value // 入选理由（「什么时候照它抄」），gen-skill 原样写进技能
    } else if (line.startsWith('@reject')) {
      reject = true
      const keyword = line.slice('@reject'.length).trim()
      if (keyword !== '') errorIncludes = keyword
    }
  }
  return { title, notes, reject, errorIncludes, expectation, browser, template }
}

/** 排序前缀 `NN-` 只用于文件排序，不进 id。 */
export function exampleId(group: string, name: string): string {
  return `${group}-${name.replace(/^\d+-/, '').replace(/\.py$/, '')}`
}

/**
 * 一条语料的截图相对路径（相对截图根）：同名同目录，只换扩展名。
 * 于是「这条语料的图在哪」不用查表——看文件名就知道，改名也不会漏。
 */
export function shotPath(group: string, name: string): string {
  return `${group}/${name.replace(/\.py$/, '.png')}`
}

/**
 * 把一批来源收成 `Corpus`。
 *
 * @param sources 所有语料来源（顺序无所谓，本函数按登记表与文件名重排）。
 * @param options.hasShot 这条的截图在不在。**只在真在时才带上 `shot` 字段**——页面拿它当 `<img>`
 *   的地址，给了地址却 404 会在控制台留噪声，也会被当成故障。默认「都没有」。
 * @param options.requireComplete 登记表上的分组必须**每组都有语料**，否则抛。
 *   默认 false：随便给一部分也能收成表（给「拿一堆自己的源码建个清单」的消费者用）。
 *   我们自己的两个调用方都开成 true——`collectCorpus()`（读盘）与 playground（bundler 给的字符串），
 *   于是「新加的文件夹没登记」「某组被删空了」在**两个世界都当场吵**，不会一边看见一边看不见。
 *
 * 目录不存在（正式安装）由调用方给空表、返回空 `Corpus`，**不抛**。
 */
export function buildCorpus(
  sources: readonly CorpusSource[],
  options: { hasShot?: (shot: string) => boolean; requireComplete?: boolean } = {},
): Corpus {
  if (sources.length === 0) return { groups: [], examples: [] }
  const hasShot = options.hasShot ?? (() => false)
  const requireComplete = options.requireComplete ?? false

  // 未登记的分组**永远**抛：GROUPS 是分组表这件事的唯一出处，往表外放语料等于凭空多出一个
  // 谁也认不出的组——静默丢掉比吵起来糟得多（页面上会少一整组而没人发现）。
  const known = new Set(GROUPS.map((group) => group.id))
  const strays = [...new Set(sources.map((item) => item.group))].filter((group) => !known.has(group))
  if (strays.length > 0) {
    throw new Error(`语料里有未登记的分组：${strays.join(', ')}——请在 GROUPS 里登记`)
  }

  const groups: ExampleGroup[] = []
  const examples: ManimExample[] = []
  for (const group of GROUPS) {
    const items = sources
      .filter((item) => item.group === group.id)
      .slice()
      .sort((left, right) => (left.name < right.name ? -1 : left.name > right.name ? 1 : 0))
    if (items.length === 0) {
      if (requireComplete) throw new Error(`${group.id}/ 里没有 .py——GROUPS 里登记了就得有语料`)
      continue
    }
    groups.push({
      id: group.id,
      title: group.title,
      ...(group.network === true ? { network: true } : {}),
    })
    for (const item of items) {
      const header = parseExampleHeader(`${group.id}/${item.name}`, item.python)
      const shot = shotPath(group.id, item.name)
      examples.push({
        id: exampleId(group.id, item.name),
        group: group.id,
        file: item.file,
        title: header.title,
        ...(hasShot(shot) ? { shot } : {}),
        expect: header.reject ? 'reject' : 'ok',
        ...(header.errorIncludes === undefined ? {} : { errorIncludes: header.errorIncludes }),
        ...(group.network === true ? { network: true } : {}),
        ...(header.browser ? { browser: true } : {}),
        ...(header.notes.length === 0 ? {} : { note: header.notes.join(' ') }),
        ...(header.expectation === undefined ? {} : { expectation: header.expectation }),
        ...(header.template === undefined ? {} : { template: header.template }),
        python: item.python,
      })
    }
  }
  return { groups, examples }
}
