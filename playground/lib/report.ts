/**
 * 一键带走的文本：把这一轮的自动结果整理成一份能直接贴进 issue / 对话的回执。
 *
 * 两条规矩（都是踩出来的）：
 *   · **每条都写清文件路径**——「basic-circle 挂了」没法定位，「corpus/examples/basic/01-circle.py 挂了」可以；
 *   · **失败的附上源码**——路径是定位，源码是能直接复现的那一份（就是那个文件的内容）。
 *
 * 分节按**未通过 / 通过 / 未跑**：最该看的是第一节，所以它排最前。
 * 这条规则与 `verdict.ts` 的「reject 组失败才算通过」同源——报告里的「未通过」不会是 reject 组。
 *
 * 只 import 类型，所以能直接单测（见 report.test.ts）。
 */
import type { Corpus, ManimExample } from 'manim-live'
import { T } from './i18n.ts'
import type { CardResult } from './types.ts'
import { isPassed, tally } from './verdict.ts'

export interface ReportInput {
  corpus: Corpus
  results: Record<string, CardResult>
  /** 生成时刻，默认取现在。显式传是为了让测试输出稳定。 */
  now?: Date
}

export function buildReport({ corpus, results, now = new Date() }: ReportInput): string {
  const { examples } = corpus
  const { tried, failed, untried } = tally(examples, results)
  const lines = [T.reportTitle, T.reportTime(now.toLocaleString('zh-CN'))]
  if (tried === 0) {
    lines.push('', T.reportEmpty)
    return lines.join('\n')
  }
  lines.push(T.reportSummary(examples.length, tried, tried - failed, failed))

  const section = (title: string, items: readonly ManimExample[]): void => {
    if (items.length === 0) return
    lines.push('', title)
    for (const item of items) {
      lines.push(T.reportCase(item.id, item.title, item.file, item.expect))
      const result = results[item.id]
      if (result !== undefined && !result.ok) lines.push(T.reportError(result.text))
    }
  }

  section(T.reportFailed(failed), examples.filter((item) => results[item.id] !== undefined && !isPassed(item, results[item.id])))
  section(T.reportPassed(tried - failed), examples.filter((item) => isPassed(item, results[item.id])))
  section(T.reportUntried(untried.length), untried)

  const broken = examples.filter((item) => results[item.id] !== undefined && !isPassed(item, results[item.id]))
  if (broken.length > 0) {
    lines.push('', T.reportSource)
    for (const item of broken) lines.push('', `# ${item.file}`, '```python', item.python, '```')
  }
  return lines.join('\n')
}
