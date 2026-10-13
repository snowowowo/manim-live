/**
 * 时间轴回放（Playback）：一段代码 → 一条**可任意定位**的时间轴。
 *
 * 与 run / 会话的关系：`run` 实时播完就结束（画面停在终态）；会话是分段追加、以「段」为单位
 * 提交与重演（黑板边讲边加的形态）。Playback 走第三条路——**收集模式**：整段代码里的所有
 * play / wait 都不实时播，而是排进一条 manim-web 的 MasterTimeline（官方 Player 用的同一套），
 * 搭完之后可以定位到任意时刻（帧级）、暂停/继续、按帧步进。三者互不依赖，各服务一种形态。
 *
 * 机制全部来自 manim-web 0.3.24 的公开 API（已核实）：
 *  - `masterTimeline()`：分段收集（`addSegment` / `addWaitSegment`）；它的 `seek` 会**全量
 *    reset** 已排动画再按绝对时间重算——往回拖能还原（靠 `Animation.begin()` 抓的动画前快照），
 *    并把「尚未引入」的物体藏起来（`_mobjectFirstSegment` 那套）。
 *  - `scene.setTimeline(mt)` / `scene.seek(t)` / `scene.pause()` / `scene.resume()` /
 *    `scene.currentTime` / `scene.getTargetFps()`。
 *
 * 已知边界（v1，按实验场实际表现再收）：
 *  - 收集期间「没有动画的语句」（建物体、set_color、self.add…）立即执行——它们没有时长，
 *    属于时间轴之外的状态改动；跨过它们的往回拖**不还原**（与官方录制门面同一取舍）。
 *  - 3D 场景转换（class X(ThreeDScene) 中途换画布）在收集模式下未处理。
 */
import type { ManimNamespace, TimelineCollector } from '../py/manim-bridge.ts'

export type PlaybackState = 'ready' | 'playing' | 'paused' | 'ended'

export interface PlaybackSegment {
  /** 段起点（秒）。 */
  start: number
  /** 段终点（秒）。 */
  end: number
  /** 等待段（没有动画，只有时长）。 */
  isWait: boolean
}

/** 控制器面向的场景能力（结构类型，全是 manim-web 的公开成员）。 */
interface PlaybackScene {
  setTimeline(timeline: unknown): void
  seek(time: number): unknown
  pause(): unknown
  resume(): unknown
  readonly currentTime: number
  getTargetFps(): number
}

interface MasterTimelineLike extends TimelineCollector {
  finalizeSlides(): void
  getDuration(): number
  getSegments(): readonly { startTime: number; endTime: number; isWait: boolean }[]
}

export interface Playback {
  /** 整段总时长（秒）。 */
  duration(): number
  /** 当前时刻（秒）——播放中随帧推进。 */
  time(): number
  /** 帧步进的基准（场景的目标帧率）。 */
  fps(): number
  state(): PlaybackState
  /** 定位到任意时刻并渲染一帧；播放中调用则从新位置继续播。 */
  seek(seconds: number): void
  /** 从当前位置继续；已在末尾则从头重播（播放器惯例）。 */
  play(): void
  pause(): void
  /** 按帧步进（默认前进一帧，负值后退）。步进前会先暂停。 */
  step(frames?: number): void
  /** 各段的时间区间（含等待段）——界面画刻度用。 */
  segments(): readonly PlaybackSegment[]
  /** 停表并交还场景（时间轴摘除，画面留在当前帧）。 */
  dispose(): void
}

/**
 * 建一个收集器并给出收口函数。用法（见 engine/renderer.ts 的 createPlayback）：
 * 把 `collector` 交给桥跑代码（搭时间轴），跑完调 `finish()` 收口成可回放的控制器。
 */
export function collectPlayback(manim: ManimNamespace, scene: object): {
  collector: TimelineCollector
  finish: () => Playback
} {
  const factory = manim.masterTimeline as undefined | (() => MasterTimelineLike)
  if (typeof factory !== 'function') throw new Error('manim-live：manim-web 里没有 masterTimeline()——版本过低？')
  const timeline = factory.call(manim)
  const host = scene as unknown as PlaybackScene

  return {
    collector: timeline,
    finish: () => {
      timeline.finalizeSlides()
      host.setTimeline(timeline)
      // seek(0) 一帧：把画面定到时间轴起点（未引入的物体由 MasterTimeline 藏起来）。
      host.seek(0)
      return createPlayback(timeline, host)
    },
  }
}

function createPlayback(timeline: MasterTimelineLike, scene: PlaybackScene): Playback {
  let disposed = false
  let playing = false
  /** 有没有动过（seek / play 过）——没动过是 ready，动过且暂停是 paused。 */
  let touched = false

  const duration = (): number => timeline.getDuration()
  const clamp = (seconds: number): number => Math.min(Math.max(seconds, 0), duration())
  const atEnd = (): boolean => duration() > 0 && scene.currentTime >= duration() - 1e-4

  const state = (): PlaybackState => {
    if (!touched) return 'ready'
    if (playing && atEnd()) {
      // 播到末尾：场景自己会停渲染循环，这里把标志翻过来，下一次查询就是 ended。
      playing = false
      return 'ended'
    }
    return playing ? 'playing' : 'paused'
  }

  return {
    duration,
    time: () => scene.currentTime,
    fps: () => scene.getTargetFps(),
    state,

    seek(seconds: number): void {
      if (disposed) return
      touched = true
      scene.seek(clamp(seconds))
    },

    play(): void {
      if (disposed) return
      touched = true
      // 末尾再点播放 = 从头重播（播放器惯例）。resume() 对已完成的时间轴是空操作，所以先回零。
      if (atEnd()) scene.seek(0)
      playing = true
      scene.resume()
    },

    pause(): void {
      if (disposed) return
      playing = false
      scene.pause()
    },

    step(frames = 1): void {
      if (disposed) return
      if (playing) {
        playing = false
        scene.pause()
      }
      touched = true
      scene.seek(clamp(scene.currentTime + frames / scene.getTargetFps()))
    },

    segments: () => timeline.getSegments().map((segment) => ({
      start: segment.startTime,
      end: segment.endTime,
      isWait: segment.isWait,
    })),

    dispose(): void {
      if (disposed) return
      disposed = true
      playing = false
      scene.pause()
      scene.setTimeline(null)
    },
  }
}
