# API 参考：语料与测试台

自己也要管一批 Manim 语料、或者要跑一批用例并出回执时才用这一组。它们不碰 `node:`，浏览器与 Node 两个入口都出；要读盘的装载函数只在 [Node 入口](/api/node)。

## 语料格式

```ts
function parseCorpus(value: unknown): Corpus          // 不可信输入的边界校验，坏数据当「没有语料」
function buildCorpus(sources: readonly CorpusSource[], options?: {
  hasShot?: (shot: string) => boolean
  requireComplete?: boolean
}): Corpus
const GROUPS: ReadonlyArray<{ id: string; title: string; network?: boolean }>
function exampleId(group: string, file: string): string
function parseExampleHeader(source: string): ExampleHeader   // 文件头的 @expect / @note / @template
function shotPath(group: string, file: string): string
```

**成员说明**

- `parseCorpus`：使用者自行提供一批语料（自建后端、静态 JSON、粘贴导入）时，浏览器收到的是不可信输入——版本不一致、代理改写、人工修改都可能使其结构偏离。该函数把非法数据一律收敛为「没有语料」，不让非法数据导致页面崩溃。
- `buildCorpus`：把「组名 + 文件名 + 源码 + 路径」收成 `Corpus`。浏览器侧的语料来源是 bundler（vite 的 `import.meta.glob`），Node 侧是读盘，两侧都通过这一个函数收敛成 Corpus，口径不会分叉。`requireComplete: true` 时，未登记的分组或某组被清空会立即抛错。
- `GROUPS`：20 个组的登记表。未在此登记的语料目录会直接报错，避免新增的文件夹被静默漏掉。
- `exampleId`：分组加文件名（去掉排序前缀）拼成稳定 id。
- `parseExampleHeader`：解析 docstring 文件头——第一行是标题，`@expect` 是预期表现，`@reject` 固定报错信息中必须出现的词，`@note` 是出处，`@template` 标记技能模板。
- `shotPath`：一条语料对应截图的路径，全仓只此一处定义。

**例子**

```ts
import { buildCorpus, parseCorpus, type CorpusSource } from 'manim-live'

// 浏览器侧：bundler 已经把源码读成字符串
const sources: CorpusSource[] = files.map((file) => ({
  group: file.group,
  name: file.name,
  file: `corpus/examples/${file.group}/${file.name}`,
  python: file.text,
}))
const corpus = buildCorpus(sources, { requireComplete: true })

// 或者：外部返回的 JSON
const fromWire = parseCorpus(await response.json())
```

## 判定与统计

一批用例执行完毕后「哪条算通过」的唯一口径。`expect: 'reject'` 的用例**执行失败才算通过**——它验证的是「当场拒绝并给出明确原因」，执行通过反而说明拦截失效。这条口径容易被误改，因此收敛在核心包内，两个消费者共用。

```ts
interface VerdictCase { id: string; expect: 'ok' | 'reject' }
interface CaseResult { ok: boolean; text?: string }   // 判定只看 ok；text 供报告用，可选

function isPassed(item: VerdictCase, result: CaseResult | undefined): boolean
function stateOf(item: VerdictCase, result: CaseResult | undefined): 'idle' | 'ok' | 'fail'
function tally<C extends VerdictCase>(items: readonly C[], results: Record<string, CaseResult>): {
  tried: number        // 有结果的条数
  failed: number       // 有结果且未通过的条数
  pending: C[]         // 尚未通过（含跑挂的），可直接喂回批量渲染
  untried: C[]         // 一条结果都没有的；报告的「未跑」节取它，两节才不会重叠
}
```

**成员说明**

- `isPassed`：没跑过一律不算通过。
- `stateOf`：清单上红绿点的三态——没跑 / 通过 / 未通过。
- `tally`：泛型的，调用方拿回的 `pending` 仍是自己的条目类型，可以直接喂回批量渲染。

**例子**

```ts
const { tried, failed, pending } = tally(samples, results)
setStatus(`${tried - failed} / ${samples.length} 通过 · ${failed} 失败`)
await runBatch(pending)               // 跑挂的也要重跑
```

## 报告文本

把一轮结果整理成一份能直接贴进 issue 或对话的回执。

```ts
function buildReport(input: {
  cases: readonly ReportCase[]        // VerdictCase 加 title / file / python
  results: Record<string, CaseResult>
  now?: Date                          // 默认取现在；显式传是为了让测试输出稳定
}): string
```

**返回** 一段 Markdown 文本，分节顺序是「未通过 → 通过 → 未跑」，最该看的排最前；每条带仓库内路径，未通过的附报错原文与完整源码；空节整个不出现。

**例子**

```ts
const text = buildReport({ cases: examples, results })
await navigator.clipboard.writeText(text)
```
