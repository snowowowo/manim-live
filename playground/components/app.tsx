/**
 * 页面骨架：顶栏 + 版式。
 *
 * 三种版式共用**同一套状态**（`usePlayground`）与**同一块活画布**（`Preview` 里的 `#stage`），
 * 差别只在三栏怎么摆：
 *
 *   list     [ 分组清单 320px ][ 预览 ]
 *   gallery  [ 平铺网格 1.35fr ][ 预览 ]
 *   docs     [ 导航 240px ][ 正文 1.15fr ][ 画布 ]
 *
 * 所以「跑过哪几条、标过哪几条、正在跑哪条」切版式时一个字都不会变——这不是三份实现。
 *
 * **三个槽必须带稳定 key**（`left` / `mid` / `right`）。这不是洁癖：文档版式是**三栏**，
 * 另外两个是两栏，JSX 子节点的位置会整体挪一格；而不带 key 时 React 按**下标**配对，
 * 于是「文档版式里第二个孩子换了类型」会连累第三个（预览）一起卸载重建——
 * 表现是**切一下版式，画布就没了**（实测踩过，烟测里那条「画布复用」断言抓到的就是它）。
 * 带上 key，React 走 keyed 配对，右边的预览在新旧树里都能被认出来，画布与画布上的画面原样留着。
 */
import type { ReactNode } from 'react'
import { DocBody } from './doc-body.tsx'
import { FreeCode } from './free-code.tsx'
import { Gallery } from './gallery.tsx'
import { Preview } from './preview.tsx'
import { SessionPane } from './session-pane.tsx'
import { Sidebar } from './sidebar.tsx'
import { StagePanel } from './stage-panel.tsx'
import { TimelinePane } from './timeline-pane.tsx'
import { Topbar } from './topbar.tsx'
import { cn } from '@/ui/cn.ts'
import { usePlayground } from '@/lib/use-playground.ts'

/** 右栏外壳：内容超长时自己滚（画布固定 16:9，不会撑破）。 */
function RightPane({ children }: { children: ReactNode }) {
  return <div className="scroll-thin min-h-0 min-w-0 overflow-y-auto pr-1">{children}</div>
}

export function App() {
  const pg = usePlayground()
  const current = pg.examples.find((item) => item.id === pg.selected)

  const free = pg.view === 'free'
  // 会话 / 时间轴是「单栏控制 + 舞台」的两栏版式（与自定义代码同宽），不吃语料那三种版式。
  const single = free || pg.view === 'session' || pg.view === 'timeline'
  const columns = single
    ? 'grid-cols-[minmax(320px,420px)_minmax(0,1fr)]'
    : pg.layout === 'gallery'
      ? 'grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]'
      : pg.layout === 'docs'
        ? 'grid-cols-[minmax(240px,300px)_minmax(0,1.15fr)_minmax(0,1fr)]'
        : 'grid-cols-[minmax(280px,340px)_minmax(0,1fr)]'

  return (
    <div className="flex h-full flex-col">
      <Topbar pg={pg} />

      <div className={cn('grid min-h-0 flex-1 gap-3 p-4', columns)}>
        {free ? (
          <FreeCode key="left" pg={pg} />
        ) : pg.view === 'session' ? (
          <SessionPane key="left" pg={pg} />
        ) : pg.view === 'timeline' ? (
          <TimelinePane key="left" pg={pg} />
        ) : pg.layout === 'gallery' ? (
          <Gallery key="left" pg={pg} />
        ) : (
          /* 点一条就是「渲染 + 记录结果」——与 DSH 实验场同一个动作序列，三种版式一致。
             所以这里没有「只选中不渲染」那档：那是找东西时的省事，代价是「点了没反应」。 */
          <Sidebar key="left" pg={pg} compact={pg.layout === 'docs'} />
        )}

        {/* 只有文档版式有中栏；另外两版留空，但**槽位要在**（见文件头关于 key 的说明）。
            空的时候给 `null` 而不是 `false`——`false` 不是 React 显式认的「空」，走的是兜底分支。 */}
        {pg.view === 'examples' && pg.layout === 'docs' ? <DocBody key="mid" pg={pg} item={current} /> : null}

        <RightPane key="right">
          {single
            ? (free
                ? <Preview pg={pg} current={undefined} />
                : <StagePanel pg={pg} />)
            : <Preview pg={pg} current={current} showShot={pg.layout !== 'docs'} />}
        </RightPane>
      </div>
    </div>
  )
}
