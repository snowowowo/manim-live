/**
 * 自定义代码视图的左栏：一段可编辑的 Manim Python + 渲染 / 极速 / 导出。
 *
 * 这一半是**语料不在时唯一还能用的那一半**（正式安装里 `_dev/` 不存在，语料是空的）——
 * 所以它必须自己站得住：能写、能跑、能录、能存。代码内容落 localStorage，刷新回来还在。
 *
 * 编辑器就是个 `<textarea>`：这一页要验的是渲染通路，不是编辑体验。换成 Monaco/CodeMirror
 * 会把「核心包零依赖」这件事说得含糊（虽然依赖装了也只在 playground 里），
 * 而收益只有语法高亮——不值。真要写代码的人会去编辑器里写，这里只负责跑。
 */
import { Download, Info, Play, RotateCcw, Zap } from 'lucide-react'
import { T } from '@/lib/i18n.ts'
import { FREE_SAMPLE } from '@/lib/types.ts'
import type { Playground } from '@/lib/use-playground.ts'
import { Button } from '@/ui/button.tsx'
import { Tip } from '@/ui/tip.tsx'

export function FreeCode({ pg }: { pg: Playground }) {
  const empty = pg.source.trim().length === 0
  return (
    <aside className="flex min-h-0 flex-col gap-2 border-r border-border pr-3">
      {pg.loadError !== null && (
        <p className="rounded-md border border-danger/40 bg-danger/10 px-3 py-2 text-xs text-danger">
          {T.corpusBroken}：{pg.loadError}
        </p>
      )}
      {pg.examples.length === 0 && pg.loadError === null && (
        <p className="rounded-md border border-border bg-card px-3 py-2 text-xs text-muted-foreground">
          {T.corpusEmpty}——{T.corpusEmptyHint}
        </p>
      )}

      <div className="flex items-center gap-1.5">
        <span className="text-[11.5px] font-medium">{T.sourceTitle}</span>
        <Tip label={T.sourceHint} align="start" wide>
          <Button size="iconSm" className="size-5" aria-label={T.sourceHint}>
            <Info size={12} strokeWidth={1.8} />
          </Button>
        </Tip>
        <Tip label={T.clearCodeHint} align="end">
          <Button
            size="iconSm"
            className="ml-auto size-5"
            aria-label={T.clearCode}
            onClick={() => pg.setSource(FREE_SAMPLE)}
          >
            <RotateCcw size={12} strokeWidth={1.8} />
          </Button>
        </Tip>
      </div>

      <textarea
        className="scroll-thin min-h-0 flex-1 resize-none rounded-md border border-input bg-card p-3 font-mono text-[11.5px] leading-[1.55] text-foreground"
        spellCheck={false}
        aria-label={T.sourceTitle}
        value={pg.source}
        onChange={(event) => pg.setSource(event.target.value)}
      />

      <div className="flex items-center gap-1.5">
        <Button variant="primary" disabled={pg.running || empty || pg.warm !== 'ready'} onClick={pg.renderFree}>
          <Play size={12} strokeWidth={2} aria-hidden="true" />
          {T.render}
        </Button>
        <Tip label={T.fastHint} align="start" wide>
          <Button
            size="icon"
            active={pg.fast}
            aria-pressed={pg.fast}
            aria-label={T.fastOn}
            onClick={() => pg.setFast(!pg.fast)}
          >
            <Zap size={14} strokeWidth={1.7} />
          </Button>
        </Tip>
        <Tip label={pg.fast ? '极速档没有过程可录——先关掉极速再导' : T.exportHint} align="start" wide>
          <Button
            size="icon"
            aria-label={T.exportVideo}
            disabled={pg.fast || pg.shown === null || pg.shown.job.kind !== 'free'}
            onClick={() => void pg.exportCurrent()}
          >
            <Download size={14} strokeWidth={1.7} />
          </Button>
        </Tip>
      </div>
    </aside>
  )
}
