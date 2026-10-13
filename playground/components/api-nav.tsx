/**
 * 左侧垂直导航：**分节与文档站的 API 参考一一对应**（顺序也照它）。
 *
 * 为什么是垂直导航而不是顶栏再塞一个 Segmented：playground 要对文档里**每一个** API 负责，
 * 分节只会越来越多；横着放迟早放不下，竖着一列还能随文档继续长。
 */
import { T } from '@/lib/i18n.ts'
import type { GroundView } from '@/lib/types.ts'
import type { Playground } from '@/lib/use-playground.ts'
import { cn } from '@/ui/cn.ts'

/** 分节清单：顺序 = 文档站 API 参考的页序（渲染器 → … → 低层导出）。 */
const SECTIONS: ReadonlyArray<{ id: GroundView; label: string }> = [
  { id: 'renderer', label: T.viewRenderer },
  { id: 'surface', label: T.viewSurface },
  { id: 'session', label: T.viewSession },
  { id: 'playback', label: T.viewPlayback },
  { id: 'hooks', label: T.viewHooks },
  { id: 'status', label: T.viewStatus },
  { id: 'export', label: T.viewExport },
  { id: 'machine', label: T.viewMachine },
  { id: 'packages', label: T.viewPackages },
  { id: 'node', label: T.viewNode },
  { id: 'corpus', label: T.viewCorpus },
  { id: 'internals', label: T.viewInternals },
]

/**
 * 每节与文档站的对应关系（节头用，见 section-header.tsx）：
 * `doc` = API 参考里的页名；`members` = 那一页覆盖的成员、以及本节能直接跑哪几个。
 * 改文档站 API 页时要回来看这里——两边对不上就是这页失职的地方。
 */
export const SECTION_META: Record<GroundView, { doc: string; members: string }> = {
  renderer: { doc: '渲染器', members: 'createManimRenderer · warmup · check · pyodideIndexURL（createSurface / dispose → 「画布」节每次渲染的活演示）' },
  surface: { doc: '画布', members: 'run · replay · canvas · isRendered（读在代码框下方）· dispose' },
  session: { doc: '会话', members: 'createSession · check · append · count · source · dispose' },
  playback: { doc: '时间轴回放', members: 'createPlayback · duration · time · seek · play · pause · step · segments · dispose' },
  hooks: { doc: '钩子', members: 'onLoading（本节按钮触发）· onProgress / signal（→ 「导出」节）' },
  status: { doc: '环境状态', members: 'environmentStatus · onEnvironmentStatus（订阅已在运行）' },
  export: { doc: '导出', members: 'Exporter · browserRecorder.probe / run · onProgress · signal（取消按钮）' },
  machine: { doc: '本机探测', members: 'probePlan · probeCheck（resolveExecutable / pythonBesideExecutable 由它内部使用）' },
  packages: { doc: '包管理', members: 'createPyodideSupply.inventory / cachePackages；浏览器侧纯函数由核心包单测覆盖' },
  node: { doc: 'Node 入口', members: 'runPython + createDryRunBridge（语料装载 → 「语料与测试台」节）' },
  corpus: { doc: '语料与测试台', members: '语料回归网 + isPassed / stateOf / tally（工具条计数即其输出）' },
  internals: { doc: '低层导出', members: '实现零件（被上面各节按真实路径使用）· 缺口表' },
}

/** 分节标题（节头与导航同一份来源）。 */
export function sectionLabel(id: GroundView): string {
  return SECTIONS.find((section) => section.id === id)?.label ?? id
}

export function ApiNav({ pg }: { pg: Playground }) {
  return (
    <nav
      className="scroll-thin flex w-[200px] shrink-0 flex-col gap-2 overflow-y-auto border-r border-border px-3 py-4"
      aria-label={T.navLabel}
    >
      <div role="tablist" aria-orientation="vertical" className="flex flex-col gap-0.5">
        {SECTIONS.map((section) => (
          <button
            key={section.id}
            role="tab"
            aria-selected={pg.view === section.id}
            disabled={pg.running}
            onClick={() => pg.setView(section.id)}
            className={cn(
              'rounded-md px-2 py-1.5 text-left text-xs transition-colors',
              'disabled:pointer-events-none disabled:opacity-45',
              pg.view === section.id
                ? 'bg-accent font-medium text-foreground'
                : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
            )}
          >
            {section.label}
          </button>
        ))}
      </div>
      <p className="mt-auto px-2 text-[10.5px] leading-[1.5] text-muted-foreground">{T.navHint}</p>
    </nav>
  )
}
