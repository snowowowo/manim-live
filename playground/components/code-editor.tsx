/**
 * 代码框：CodeMirror（@uiw/react-codemirror + Python 语言包）。
 *
 * 为什么直接用真编辑器：playground 是**本地开发页**，依赖只进根 devDependencies、不进 npm 产物、
 * 也不需要任何部署——「手搓一个轻量高亮」省不下什么，反而丢行号、括号配对、撤销历史这些每天都要用的东西。
 * （历史上这页刻意用过裸 textarea；2026-10-13 用户拍板换真编辑器，理由如上。）
 *
 * 契约：外层包裹 div 带 `aria-label`（无障碍名，也是**烟测抓手**——`check-playground.mjs` 用
 * `[aria-label="…"] .cm-content` 定位并 fill，改这里要连烟测一起改）。
 */
import { python } from '@codemirror/lang-python'
import { oneDark } from '@codemirror/theme-one-dark'
import CodeMirror from '@uiw/react-codemirror'

export interface CodeEditorProps {
  value: string
  onChange: (next: string) => void
  /** 无障碍名 / 烟测抓手（见文件头契约）。 */
  label: string
  /** 高度下限（外层容器 style；默认 10rem，行数多的分节给大一点）。 */
  minHeight?: string
}

export function CodeEditor({ value, onChange, label, minHeight = '10rem' }: CodeEditorProps) {
  return (
    <div
      className="min-h-0 flex-1 overflow-hidden rounded-md border border-input"
      style={{ minHeight }}
      aria-label={label}
      data-code-editor=""
    >
      <CodeMirror
        value={value}
        height="100%"
        theme={document.documentElement.classList.contains('dark') ? oneDark : 'light'}
        extensions={[python()]}
        basicSetup={{ foldGutter: false, highlightActiveLine: true, autocompletion: false }}
        onChange={onChange}
      />
    </div>
  )
}
