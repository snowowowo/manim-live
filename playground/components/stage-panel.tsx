/**
 * 会话 / 时间轴视图的右栏：活画布（#stage）+ 视图自己的附属件（时间轴的走带）。
 *
 * 与语料 / 自定义视图的 Preview 分开：那一栏带着「预期表现 / 截图 / 人工标注」这套
 * 语料专属的四件套，对这两个视图没意义。烟测认的 id（#stage / #status）在 LiveStage
 * 里，两个视图都保得住。
 */
import { T } from '@/lib/i18n.ts'
import type { Playground } from '@/lib/use-playground.ts'
import { LiveStage } from './live-stage.tsx'
import { Transport } from './timeline-pane.tsx'

export function StagePanel({ pg }: { pg: Playground }) {
  const live = pg.view === 'session' ? pg.sessionInfo !== null : pg.playbackInfo !== null
  const label = pg.view === 'session' ? T.sessionEmptyStage : T.timelineEmptyStage
  return (
    <section className="flex min-w-0 flex-col gap-3">
      <LiveStage
        stageRef={pg.stageRef}
        status={pg.status}
        live={live}
        label={label}
        overlay={pg.overlay}
      />
      {pg.view === 'timeline' && <Transport pg={pg} />}
    </section>
  )
}
