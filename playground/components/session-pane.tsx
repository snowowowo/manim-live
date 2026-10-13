/**
 * 会话视图的左栏：一段顶层语句 + 开会话 / 预检 / 追加 / 结束，外加 source() 投影。
 *
 * 对应核心包 `surface.createSession()`——黑板「边讲边加」用的那一层。测试点：
 * 变量跨段保留（第 2 段引用第 1 段建的物体）、check 毫秒级拒绝坏段、
 * append 失败自动回滚（画布回到上一步干净态）、count / source 随提交更新。
 *
 * 代码不落盘：会话是临时形态，刷新即散（与「验收跑一半不能丢」的语料结果是两回事）。
 */
import { Play, Plus, ShieldQuestion, Square } from 'lucide-react'
import { T } from '@/lib/i18n.ts'
import type { Playground } from '@/lib/use-playground.ts'
import { Button } from '@/ui/button.tsx'
import { Tip } from '@/ui/tip.tsx'
import { CodeEditor } from './code-editor.tsx'

export function SessionPane({ pg }: { pg: Playground }) {
  const empty = pg.sessionCode.trim().length === 0
  const info = pg.sessionInfo
  const live = info !== null
  const busy = pg.running || pg.warm !== 'ready'

  return (
    <aside className="flex min-h-0 flex-col gap-2 border-r border-border pr-3">
      <div className="flex min-h-5 items-center gap-2 text-[11px] text-muted-foreground">
        {live && <span className="font-mono">{T.sessionCount(info.count)}</span>}
      </div>

      <CodeEditor label={T.segmentLabel} value={pg.sessionCode} onChange={pg.setSessionCode} />

      <div className="flex items-center gap-1.5">
        <Button
          variant={live ? 'outline' : 'primary'}
          disabled={busy}
          onClick={() => void pg.newSession()}
        >
          <Play size={12} strokeWidth={2} aria-hidden="true" />
          {live ? T.sessionOpenAgain : T.sessionOpen}
        </Button>
        <Tip label={T.sessionHint} align="start" wide>
          <Button size="iconSm" className="size-5" aria-label={T.sessionCheckBtn} disabled={!live || empty} onClick={() => void pg.sessionCheck(pg.sessionCode)}>
            <ShieldQuestion size={13} strokeWidth={1.8} />
          </Button>
        </Tip>
        <Button disabled={!live || empty} onClick={() => void pg.sessionAppend(pg.sessionCode)}>
          <Plus size={13} strokeWidth={2} aria-hidden="true" />
          {T.sessionAppendBtn}
        </Button>
        <Tip label={T.sessionEndBtn} align="end">
          <Button size="icon" aria-label={T.sessionEndBtn} disabled={!live} onClick={pg.endSession}>
            <Square size={12} strokeWidth={1.8} />
          </Button>
        </Tip>
      </div>

      {live && info.source.trim().length > 0 && (
        <div className="flex min-h-0 flex-[1.2] flex-col gap-1">
          <span className="text-[11px] text-muted-foreground">{T.sessionSourceLabel}</span>
          <pre className="scroll-thin min-h-0 flex-1 overflow-auto rounded-md border border-border bg-card p-2 font-mono text-[11px] leading-[1.5] text-foreground">
            {info.source}
          </pre>
        </div>
      )}
    </aside>
  )
}
