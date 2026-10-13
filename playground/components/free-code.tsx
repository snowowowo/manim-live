/**
 * 「自由代码」节的左栏：一段可编辑的 Manim Python + 完整工作流——预检 → 渲染 → 导出。
 *
 * 2026-10-14 重组时吸收了旧「渲染器」节的 check()（预检按钮就在编辑器下面，检的就是这份代码）
 * 和旧「导出」节的动作组（probe / 导出 / 取消 / 过程播报）。onLoading 的活演示也在这节：
 * 代码里写个 `import pandas`，取包遮罩与状态行就是它的真实回调。
 *
 * 这一半也是**语料不在时唯一还能用的那一半**（正式安装里 `_dev/` 不存在，语料是空的）——
 * 所以它必须自己站得住：能写、能跑、能导、能存（代码内容落 localStorage，刷新回来还在）。
 * 编辑器用 CodeMirror（根 devDependencies）：这一页本来就在本地跑，高亮与行号不算越界。
 */
import { Info, Redo2, RotateCcw, ShieldCheck, Square } from 'lucide-react'
import { useState } from 'react'
import { T } from '@/lib/i18n.ts'
import { FREE_SAMPLE } from '@/lib/types.ts'
import type { Playground } from '@/lib/use-playground.ts'
import { Button } from '@/ui/button.tsx'
import { Tip } from '@/ui/tip.tsx'
import { CodeEditor } from './code-editor.tsx'

/** 预检结论（就地一行，过 / 未过 + 原因）。 */
function CheckRow({ pg }: { pg: Playground }) {
  const [verdict, setVerdict] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const runCheck = async (): Promise<void> => {
    if (pg.source.trim().length === 0) {
      setVerdict(T.freeCheckEmpty)
      return
    }
    setBusy(true)
    setVerdict(T.commonRunning)
    const result = await pg.getRenderer().check(pg.source)
    setVerdict(result.ok ? T.freeCheckOk : T.freeCheckFail(result.error ?? ''))
    setBusy(false)
  }

  return (
    <div className="flex items-center gap-2">
      <Button size="sm" disabled={busy} onClick={() => void runCheck()}>
        <ShieldCheck size={12} strokeWidth={1.8} aria-hidden="true" />
        {T.freeCheckBtn}
      </Button>
      {verdict !== null && <span className="min-w-0 truncate text-[11px] text-muted-foreground">{verdict}</span>}
    </div>
  )
}

/** 导出动作组：探测（probe）/ 导出（run）/ 取消（signal.abort）+ 过程播报（onProgress 的活演示）。 */
function ExportRow({ pg }: { pg: Playground }) {
  const [probe, setProbe] = useState<string | null>(null)
  const runProbe = async (): Promise<void> => {
    const exporter = pg.getRenderer().exporters[0]
    if (exporter === undefined) {
      setProbe(T.exportNoSurface)
      return
    }
    const result = await exporter.probe()
    setProbe(result.ready
      ? T.exportProbeReady(exporter.label)
      : T.exportMissing(result.missing?.map((item) => item.label).join('、') ?? ''))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button size="sm" onClick={() => void runProbe()}>{T.exportProbeBtn}</Button>
        {probe !== null && <span className="min-w-0 truncate text-[11px] text-muted-foreground">{probe}</span>}
      </div>
      <pre
        className="scroll-thin min-h-0 flex-1 overflow-auto rounded-md border border-border bg-card p-2 font-mono text-[11px] leading-[1.5] text-foreground"
        aria-label={T.exportLogTitle}
      >
        {pg.exportLog.length > 0 ? pg.exportLog.join('\n') : `（${T.exportLogTitle}——导出时逐条出现）`}
      </pre>
    </div>
  )
}

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

      <CodeEditor label={T.sourceTitle} value={pg.source} onChange={pg.setSource} />

      {/* 渲染 / 极速 / 导出三件在**右侧 Preview 的动作行**上（与画布在一起，语料节同一套）——
          左栏只留右栏没有的三件：重播（代码-centric：同一段再真播一遍）、取消导出、预检。 */}
      <div className="flex items-center gap-1.5">
        <Tip label={T.replayHint} align="start" wide>
          <Button size="icon" aria-label={T.replay} disabled={pg.shown === null || pg.running} onClick={() => void pg.replayCurrent()}>
            <Redo2 size={14} strokeWidth={1.7} />
          </Button>
        </Tip>
        <Tip label={T.exportCancelBtn} align="end">
          <Button size="icon" aria-label={T.exportCancelBtn} onClick={pg.cancelExport}>
            <Square size={12} strokeWidth={2} />
          </Button>
        </Tip>
      </div>

      <CheckRow pg={pg} />

      {/* surface 读数：isRendered() / canvas()（画布页那两个成员的就地验证） */}
      <div className="font-mono text-[10.5px] text-muted-foreground">
        isRendered(): {String(pg.surfaceInfo().rendered)} · canvas(): {pg.surfaceInfo().size ?? '—'}
      </div>

      <ExportRow pg={pg} />
    </aside>
  )
}
