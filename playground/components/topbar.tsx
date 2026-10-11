/**
 * 顶栏：标题 + 视图 / 版式切换 + 主题切换 + 两条状态。
 *
 * 两条状态是这一页的「自证」：
 *   · **Pyodide 就绪**——页面上写着「零框架、自托管、真 Python」，总得有个地方证明它真起来了；
 *   · **截图清单覆盖数**——历史截图是 188 张，但那份 index.json 是本地跑出来的。
 *     把它覆盖了多少条写出来，「为什么这条没有上一轮结果」就一眼有了答案，
 *     不必去翻 scripts/。
 */
import { Info, Moon, Sun } from 'lucide-react'
import { T } from '@/lib/i18n.ts'
import type { GroundView, LayoutMode } from '@/lib/types.ts'
import type { Playground } from '@/lib/use-playground.ts'
import { Badge } from '@/ui/badge.tsx'
import { Button } from '@/ui/button.tsx'
import { Segmented } from '@/ui/segmented.tsx'
import { Tip } from '@/ui/tip.tsx'

export function Topbar({ pg }: { pg: Playground }) {
  const warmText = pg.warm === 'ready' ? T.warmupDone : pg.warm === 'failed' ? T.warmupFailed : '正在预热 Pyodide…'
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-4 py-2.5">
      <div className="flex items-center gap-1.5">
        <h1 className="text-sm font-semibold">{T.title}</h1>
        <Tip label={T.lead} align="start" wide>
          <Button size="iconSm" className="size-5" aria-label={T.lead}>
            <Info size={12} strokeWidth={1.8} />
          </Button>
        </Tip>
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-2">
        <span className="inline-flex items-center gap-1.5">
          <Badge tone={pg.warm === 'ready' ? 'ok' : pg.warm === 'failed' ? 'fail' : 'neutral'}>{warmText}</Badge>
          {pg.shots.covered > 0 && (
            <Tip
              label={`上一轮截图清单：${pg.shots.at === null ? '时间未知' : new Date(pg.shots.at).toLocaleString('zh-CN')}，覆盖 ${pg.shots.covered} 条（本轮 ${pg.shots.ranThisPass} 条）。它来自 _dev/shots/index.json，是本机跑 scripts/shot-corpus.mjs 的产物、不入库——所以别的机器上这一栏是空的，那是正常的。`}
              align="end"
              wide
            >
              <span className="cursor-help font-mono text-[11px] text-muted-foreground">
                截图清单 {pg.shots.covered} 条
              </span>
            </Tip>
          )}
        </span>

        <Segmented<GroundView>
          label={T.viewLabel}
          value={pg.view}
          onChange={pg.setView}
          disabled={pg.running}
          options={[
            { value: 'examples', label: T.viewExamples },
            { value: 'free', label: T.viewFree },
          ]}
        />

        <Segmented<LayoutMode>
          label={T.layoutLabel}
          value={pg.layout}
          onChange={pg.setLayout}
          disabled={pg.view === 'free'}
          options={[
            { value: 'list', label: T.layoutList, hint: T.layoutListHint },
            { value: 'gallery', label: T.layoutGallery, hint: T.layoutGalleryHint },
            { value: 'docs', label: T.layoutDocs, hint: T.layoutDocsHint },
          ]}
        />

        <Tip label={pg.theme === 'dark' ? '换成亮色' : '换成暗色'} align="end">
          <Button
            size="icon"
            aria-label={T.themeLabel}
            onClick={() => pg.setTheme(pg.theme === 'dark' ? 'light' : 'dark')}
          >
            {pg.theme === 'dark' ? <Sun size={14} strokeWidth={1.7} /> : <Moon size={14} strokeWidth={1.7} />}
          </Button>
        </Tip>
      </div>
    </header>
  )
}
