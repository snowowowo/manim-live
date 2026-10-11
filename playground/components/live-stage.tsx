/**
 * 活画布：整页**唯一**那块 WebGL 画布，也是 `#stage` / `#status` 两个 DOM id 的所在。
 *
 * 为什么 id 要留在这一层而不是随便挂个 ref：`scripts/check-playground.mjs` 这条真机烟测认的就是
 * 三个 id——`#status` 等预热、`#render` 触发一次、`#stage canvas` 量墨迹。它们是「核心包能在
 * 真浏览器里独立跑」这条断言的抓手，改版式时**不能丢**。所以这里显式写出来，并加了一句注释守着。
 *
 * `#stage` 里**不放任何 React 子节点**：画布是命令式插进去的（核心包 `createScene` 往容器里
 * append canvas），而换档时要 `replaceChildren()` 清干净。React 一旦也往这儿渲染东西，
 * 清理就会把它的节点一并抹掉、然后 React 在下一次更新时对着不存在的节点操作。
 * 所以「还没渲染」的那层提示做成**兄弟节点**、绝对定位压在上面。
 */
import type { RefObject } from 'react'
import { T } from '@/lib/i18n.ts'
import type { Overlay } from '@/lib/types.ts'
import type { Status } from '@/lib/use-playground.ts'
import { cn } from '@/ui/cn.ts'

const KIND_CLASS = {
  idle: 'text-muted-foreground',
  running: 'text-foreground',
  ok: 'text-success',
  error: 'text-danger',
} as const

/**
 * 画布上的那层浮层（`null` = 不盖）。
 *
 * 骨架用 DSH 实验场同款三个基础几何形（圆 / 方 / 三角）而不是一个转圈：它表达的是
 * 「这里马上会出现一张图」，转圈只表达「在忙」。而且**不能写字**——这会儿还可能是
 * 「刚清过画布、正在建新的」，写「正在加载」会跟取包那条撞车（那条才是真的在取东西）。
 */
function StageOverlay({ overlay }: { overlay: Overlay }) {
  if (overlay.kind === 'skeleton') {
    return (
      <div className="pointer-events-none absolute inset-0 grid place-items-center" aria-hidden="true">
        <span className="flex items-center gap-7">
          <span className="stage-skel size-13 rounded-full" />
          <span className="stage-skel size-13 rounded" />
          <span className="stage-skel size-13 [clip-path:polygon(50%_0%,100%_100%,0%_100%)]" />
        </span>
      </div>
    )
  }
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center px-6" role="status">
      <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card/92 px-3 py-1.5 text-xs text-foreground shadow-sm">
        <span className="size-3 animate-spin rounded-full border-2 border-current border-t-transparent" aria-hidden="true" />
        {overlay.text}
      </span>
    </div>
  )
}

export interface LiveStageProps {
  stageRef: RefObject<HTMLDivElement | null>
  status: Status
  /** 画布上已经有东西了吗（决定要不要压那层提示）。 */
  live: boolean
  /** 预览标签（当前展示的是哪条）。 */
  label?: string
  /** 盖在画布上的那层（骨架 / 取包进度）。 */
  overlay?: Overlay | null
  className?: string
}

export function LiveStage({ stageRef, status, live, label, overlay = null, className }: LiveStageProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="relative">
        {/* 烟测认这个 id，见文件头 */}
        <div
          id="stage"
          ref={stageRef}
          className="stage-shell w-full overflow-hidden rounded-lg border border-border bg-stage"
        />
        {overlay !== null && <StageOverlay overlay={overlay} />}
        {!live && overlay === null && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center px-6 text-center text-xs text-white/45">
            {label ?? T.previewEmpty}
          </p>
        )}
      </div>
      {/* 烟测认这个 id + data-render-seq（区分「这句『渲染完成』是这一轮的还是上一轮的」）*/}
      <div
        id="status"
        data-render-seq={status.seq}
        aria-live="polite"
        className={cn(
          'min-h-5 font-mono text-[11.5px] leading-[1.55] whitespace-pre-wrap',
          KIND_CLASS[status.kind],
        )}
      >
        {status.text}
      </div>
    </div>
  )
}
