/**
 * 一键带走的文本：把一轮自动结果整理成能直接贴进 issue / 对话的回执。
 *
 * 两条规矩（都是踩出来的）：
 *   · **每条都写清文件路径**——「basic-circle 挂了」没法定位，「corpus/examples/basic/01-circle.py 挂了」可以；
 *   · **失败的附上源码**——路径用于定位，源码是能直接照着复现的那一份。
 *
 * 分节按**未通过 / 通过 / 未跑**：最该看的排最前。「未跑」取 `untried` 而不是 `pending`，
 * 理由见 verdict.ts 的 `Tally.untried`。
 */
import { isPassed, tally, type CaseResult, type VerdictCase } from './verdict.ts'

/** 报告比判定多要三样：标题、仓库内路径、源码。核心包的 `ManimExample` 就满足这个形状。 */
export interface ReportCase extends VerdictCase {
  title: string
  file: string
  python: string
}

export interface ReportInput {
  cases: readonly ReportCase[]
  results: Record<string, CaseResult>
  /** 生成时刻，默认取现在。能显式传是为了让测试的输出稳定。 */
  now?: Date
}

export function buildReport({ cases, results, now = new Date() }: ReportInput): string {
  const { tried, failed, untried } = tally(cases, results)
  const lines = ['# manim-live 运行结果', `时间：${now.toLocaleString('zh-CN')}`]
  if (tried === 0) {
    lines.push('', '（还没有跑过任何用例）')
    return lines.join('\n')
  }
  lines.push(`总计 ${cases.length} 条 · 已跑 ${tried} · 通过 ${tried - failed} · 失败 ${failed}`)

  const broken = cases.filter((item) => results[item.id] !== undefined && !isPassed(item, results[item.id]))

  const section = (title: string, items: readonly ReportCase[]): void => {
    if (items.length === 0) return
    lines.push('', title)
    for (const item of items) {
      lines.push(`[${item.id}] ${item.title} — ${item.file} · 期望 ${item.expect}`)
      const result = results[item.id]
      // 只在这条真的没跑成、且带了原文时才附一行：reject 被成功拒掉也会走进这里，
      // 那句拒绝理由正是「拒对了」的证据。
      if (result !== undefined && !result.ok && result.text !== undefined && result.text !== '') {
        lines.push(`错误：${result.text}`)
      }
    }
  }

  section(`## 未通过（${broken.length}）`, broken)
  section(`## 通过（${tried - failed}）`, cases.filter((item) => isPassed(item, results[item.id])))
  section(`## 未跑（${untried.length}）`, untried)

  if (broken.length > 0) {
    lines.push('', '源码：')
    for (const item of broken) lines.push('', `# ${item.file}`, '```python', item.python, '```')
  }
  return lines.join('\n')
}
