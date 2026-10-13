/**
 * 时间轴视图：左栏收集入口 + 右栏画布下方的走带控制（Transport）。
 *
 * 对应核心包 `surface.createPlayback()`——整段代码收进一条可帧级定位的时间轴。
 * 测试点：收集不占时间（几秒动画几百毫秒收完）、拖到任意时刻瞬时定位、
 * **往回拖还原**（按时刻重算 + 动画前快照）、逐帧步进、段界刻度对不对。
 *
 * 时刻读数由 Transport 自己按 rAF 轮询（播放中），控制器本体在 `pg.playbackRef`——
 * 时间归核心，界面只是读表。
 */
import { useEffect, useRef, useState } from 'react'
import { Pause, Play, StepBack, StepForward } from 'lucide-react'
import { T } from '@/lib/i18n.ts'
import type { Playground } from '@/lib/use-playground.ts'
import { Button } from '@/ui/button.tsx'
import { CodeEditor } from './code-editor.tsx'

export function TimelinePane({ pg }: { pg: Playground }) {
  const empty = pg.source.trim().length === 0
  return (
    <aside className="flex min-h-0 flex-col gap-2 border-r border-border pr-3">
      <div className="flex min-h-5 items-center gap-2 text-[11px] text-muted-foreground">
        {pg.playbackInfo !== null && (
          <span className="font-mono">{pg.playbackInfo.duration.toFixed(1)}s · {pg.playbackInfo.segments.length} 段</span>
        )}
      </div>

      {/* 与「画布」共用同一个代码缓冲（pg.source）：同一段代码，一边看实时跑、一边收时间轴对比。 */}
      <CodeEditor label={T.timelineTitle} value={pg.source} onChange={pg.setSource} />

      <div className="flex items-center gap-1.5">
        <Button
          variant="primary"
          disabled={pg.running || pg.warm !== 'ready' || empty}
          onClick={() => void pg.buildTimeline(pg.source)}
        >
          <Play size={12} strokeWidth={2} aria-hidden="true" />
          {T.timelineBuild}
        </Button>
      </div>
    </aside>
  )
}

/** 画布下方的走带：上一帧 / 播放暂停 / 下一帧 + 定位滑杆（带段界刻度）+ 时刻读数。 */
export function Transport({ pg }: { pg: Playground }) {
  const [time, setTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  /** 拖动之前是不是在播——松手恢复（播放器常规手感）。 */
  const resumeAfterScrub = useRef(false)

  // 换了一条时间轴：读数归零、停表。
  useEffect(() => {
    setTime(0)
    setPlaying(false)
  }, [pg.playbackInfo])

  // 播放中逐帧刷时刻；到尾自动停。
  useEffect(() => {
    if (!playing) return
    let raf = 0
    const tick = (): void => {
      const show = pg.playbackRef.current
      if (show !== null) {
        setTime(show.time())
        if (show.state() !== 'playing') setPlaying(false)
      }
      raf = window.requestAnimationFrame(tick)
    }
    raf = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(raf)
  }, [pg.playbackRef, playing])

  const toggle = (): void => {
    const show = pg.playbackRef.current
    if (show === null) return
    if (show.state() === 'playing') {
      show.pause()
      setPlaying(false)
      setTime(show.time())
    } else {
      show.play()
      setPlaying(true)
    }
  }

  const step = (frames: number): void => {
    const show = pg.playbackRef.current
    if (show === null) return
    show.step(frames)
    setPlaying(false)
    setTime(show.time())
  }

  const seekTo = (seconds: number): void => {
    const show = pg.playbackRef.current
    if (show === null) return
    show.seek(seconds)
    setTime(show.time())
  }

  const info = pg.playbackInfo
  if (info === null) return null
  const fps = pg.playbackRef.current?.fps() ?? 60

  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card px-2.5 py-2">
      <Button size="iconSm" className="size-6" aria-label={T.timelinePrev} onClick={() => step(-1)}>
        <StepBack size={13} strokeWidth={1.8} />
      </Button>
      <Button size="iconSm" className="size-6" aria-label={playing ? T.timelinePause : T.timelinePlay} onClick={toggle}>
        {playing ? <Pause size={13} strokeWidth={1.8} /> : <Play size={13} strokeWidth={1.8} />}
      </Button>
      <Button size="iconSm" className="size-6" aria-label={T.timelineNext} onClick={() => step(1)}>
        <StepForward size={13} strokeWidth={1.8} />
      </Button>

      <div className="relative min-w-0 flex-1 pb-1.5">
        <input
          className="w-full accent-primary"
          type="range"
          min={0}
          max={Math.max(info.duration, 0.001)}
          step={1 / fps}
          value={Math.min(time, info.duration)}
          aria-label={T.timelineSeek}
          onPointerDown={() => {
            const show = pg.playbackRef.current
            if (show !== null && show.state() === 'playing') {
              resumeAfterScrub.current = true
              show.pause()
              setPlaying(false)
            }
          }}
          onPointerUp={() => {
            if (resumeAfterScrub.current) {
              resumeAfterScrub.current = false
              pg.playbackRef.current?.play()
              setPlaying(true)
            }
          }}
          onChange={(event) => seekTo(Number(event.target.value))}
        />
        {/* 段界刻度：一段（一 play 或一 wait）一条竖线，挂在滑杆下沿。 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1" aria-hidden="true">
          {info.segments.map((segment, index) =>
            segment.start > 0
              ? <span key={index} className="absolute top-0 h-1 w-px bg-border" style={{ left: `${(segment.start / info.duration) * 100}%` }} />
              : null,
          )}
        </div>
      </div>

      {/* id 是给 check-playground.mjs 读的（同 #status / #stage 的约定），页面自己不用 */}
      <span id="tl-time" className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
        {time.toFixed(1)} / {info.duration.toFixed(1)}s
      </span>
    </div>
  )
}
