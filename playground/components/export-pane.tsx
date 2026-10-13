/**
 * 「导出」分节：Exporter 契约与内置录屏的活演示。
 *
 * 演示三件事：probe()（此刻能不能录）、run() + onProgress（录一段真播过程，逐条播报）、
 * signal（取消进行中的录制 → AbortController.abort）。
 * 录制对象是**当前画布上那一段**（要一块全新建好的空白画布，口径见 use-playground 的 exportCurrent）。
 */
import { Info, Square, Video } from 'lucide-react'
import { useState } from 'react'
import { T } from '@/lib/i18n.ts'
import type { Playground } from '@/lib/use-playground.ts'
import { Button } from '@/ui/button.tsx'
import { Tip } from '@/ui/tip.tsx'

/** 给「先渲染一段」用的短代码：快、稳、一看就知道录出来的是什么。 */
const EXPORT_DEMO = 'c = Circle(radius=1.4, color=BLUE)\nself.play(Create(c))\nself.play(c.animate.shift(RIGHT * 2))'

export function ExportPane({ pg }: { pg: Playground }) {
  const [probe, setProbe] = useState<string | null>(null)

  const runProbe = async (): Promise<void> => {
    const recorder = pg.getRenderer().exporters[0]
    if (recorder === undefined) {
      setProbe(T.exportNoSurface)
      return
    }
    const result = await recorder.probe()
    setProbe(result.ready
      ? T.exportProbeReady(recorder.label)
      : T.exportMissing(result.missing?.map((item) => item.label).join('、') ?? ''))
  }

  return (
    <aside className="flex min-h-0 flex-col gap-2 border-r border-border pr-3">
      <div className="flex items-center gap-1.5">
        <span className="text-[11.5px] font-medium">{T.exportTitle}</span>
        <Tip label={T.exportSectionHint} align="start" wide>
          <Button size="iconSm" className="size-5" aria-label={T.exportSectionHint}>
            <Info size={12} strokeWidth={1.8} />
          </Button>
        </Tip>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" onClick={() => void runProbe()}>{T.exportProbeBtn}</Button>
        <Button size="sm" variant="primary" disabled={pg.running} onClick={() => pg.runSnippet(EXPORT_DEMO)}>
          {T.exportDemo}
        </Button>
        <Button size="sm" disabled={pg.shown === null || pg.running} onClick={() => void pg.exportCurrent()}>
          <Video size={12} strokeWidth={1.8} aria-hidden="true" />
          {T.exportRunBtn}
        </Button>
        <Button size="sm" variant="danger" onClick={pg.cancelExport}>
          <Square size={11} strokeWidth={2} aria-hidden="true" />
          {T.exportCancelBtn}
        </Button>
      </div>

      {probe !== null && (
        <p className="rounded-md border border-border bg-card px-2.5 py-2 text-[11px] text-muted-foreground">{probe}</p>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-1">
        <span className="text-[11px] text-muted-foreground">{T.exportLogTitle}</span>
        <pre className="scroll-thin min-h-0 flex-1 overflow-auto rounded-md border border-border bg-card p-2 font-mono text-[11px] leading-[1.5] text-foreground">
          {pg.exportLog.length > 0 ? pg.exportLog.join('\n') : '（录制时逐条出现）'}
        </pre>
      </div>
    </aside>
  )
}
