// playground 主脚本：**零框架**，只用 DOM API。
//
// 它证的三件事：
//   ① 核心包能在真浏览器里独立跑（不依赖任何宿主、任何框架）；
//   ② 自托管 Pyodide 那条路成立（`pyodideIndexURL: '/pyodide/'`，就是本目录 vite 中间件挂的资源）；
//   ③ 导出接口能接上——本页用核心自带的 `browserRecorder` 录一段屏。
import { createManimRenderer, type RenderController } from 'manim-live'

/** 内置语料：直接读 `_dev/examples/` 的 .py 原文（与回归网、与技能模板同一批文件）。 */
const files = import.meta.glob('../_dev/examples/**/*.py', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

const el = <T extends HTMLElement>(id: string): T => {
  const found = document.getElementById(id)
  if (found === null) throw new Error(`缺元素 #${id}`)
  return found as T
}

const select = el<HTMLSelectElement>('example')
const stage = el<HTMLDivElement>('stage')
const status = el<HTMLDivElement>('status')
const codeBox = el<HTMLTextAreaElement>('code')
const warmNote = el<HTMLSpanElement>('warm')
const renderButton = el<HTMLButtonElement>('render')
const fastButton = el<HTMLButtonElement>('fast')
const exportButton = el<HTMLButtonElement>('export')

const DEFAULT_ID = 'basic/01-circle.py'

/** 语料条目：`<组>/<文件名>` → 源码。默认挑一条最简单的先跑通。 */
const entries = Object.entries(files)
  .map(([path, source]) => ({ id: path.replace('../_dev/examples/', ''), source }))
  .sort((a, b) => a.id.localeCompare(b.id))

if (entries.length === 0) {
  status.textContent = '没找到语料——先在包根跑一次 pnpm install（_dev/examples 随包带着）。'
  throw new Error('no examples')
}

for (const entry of entries) {
  const option = document.createElement('option')
  option.value = entry.id
  option.textContent = entry.id
  select.append(option)
}
select.value = entries.find((entry) => entry.id === DEFAULT_ID)?.id ?? entries[0]!.id
codeBox.value = entries.find((entry) => entry.id === select.value)!.source

select.addEventListener('change', () => {
  const entry = entries.find((item) => item.id === select.value)
  if (entry !== undefined) codeBox.value = entry.source
})

/** 渲染器：资源指向本目录中间件挂的本地副本（演示自托管那条路）。 */
const renderer = createManimRenderer({
  pyodideIndexURL: '/pyodide/',
  katexBaseURL: '/katex/',
  onLoading: (names) => setStatus(names.length === 0 ? '' : `正在取包：${names.join(', ')}…`),
})

let surface: Awaited<ReturnType<typeof renderer.createSurface>> | null = null
let fast = false

function setStatus(text: string, kind: 'ok' | 'error' | '' = ''): void {
  status.textContent = text
  status.className = kind === '' ? 'status' : `status ${kind}`
}

async function ensureSurface() {
  surface ??= await renderer.createSurface(stage, { fast })
  return surface
}

async function run(): Promise<void> {
  renderButton.disabled = true
  fastButton.disabled = true
  exportButton.disabled = true
  setStatus(fast ? '极速落终态…' : '渲染中…')
  try {
    const target = await ensureSurface()
    const check = await renderer.check(codeBox.value)
    if (!check.ok) {
      setStatus(`预检未通过：\n${check.error ?? ''}`, 'error')
      return
    }
    const result = await target.run(codeBox.value)
    if (result.cancelled) setStatus('已作废')
    else if (result.ok) setStatus(`渲染完成（${fast ? '极速' : '真时序'}）`, 'ok')
    else setStatus(`渲染失败：\n${result.error ?? ''}`, 'error')
  } catch (error) {
    setStatus(`出错了：${error instanceof Error ? error.message : String(error)}`, 'error')
  } finally {
    renderButton.disabled = false
    fastButton.disabled = false
    exportButton.disabled = surface === null
  }
}

renderButton.addEventListener('click', () => void run())

fastButton.addEventListener('click', () => {
  fast = !fast
  fastButton.textContent = fast ? '极速：开' : '极速落终态'
  // 快慢是画布上的属性，换档要重建画布
  surface?.dispose()
  surface = null
  void run()
})

exportButton.addEventListener('click', async () => {
  const target = surface
  if (target === null) return
  exportButton.disabled = true
  setStatus('录屏中（实时，与动画等长）…')
  try {
    // 核心的 RenderController 契约：活画布 + 从头真播 —— Surface 本身就满足
    const controller: RenderController = {
      canvas: () => target.canvas(),
      isRendered: () => target.isRendered(),
      replay: () => target.replay(),
    }
    const recorder = renderer.exporters[0]!
    const probe = await recorder.probe()
    if (!probe.ready) {
      setStatus(`这台浏览器录不了：缺少 ${probe.missing?.map((item) => item.label).join('、') ?? ''}`, 'error')
      return
    }
    const result = await recorder.run({ python: codeBox.value, controller, onProgress: (note) => setStatus(note) })
    if (!result.ok) {
      setStatus(`导出失败：${result.error ?? result.reason}`, 'error')
      return
    }
    if (result.kind !== 'blob') {
      setStatus('这个接入者返回的不是浏览器可下载的结果')
      return
    }
    const url = URL.createObjectURL(result.blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = result.name
    anchor.click()
    URL.revokeObjectURL(url)
    setStatus(`已导出 ${result.name}（${result.mime}）`, 'ok')
  } catch (error) {
    setStatus(`导出出错：${error instanceof Error ? error.message : String(error)}`, 'error')
  } finally {
    exportButton.disabled = false
  }
})

// 预热：先把 Pyodide 拉起来，别等点渲染才发现要等 20 MB
setStatus('正在预热 Pyodide…（首次约 20 MB）')
renderer
  .warmup()
  .then(() => {
    warmNote.textContent = 'Pyodide 已就绪'
    renderButton.disabled = false
    fastButton.disabled = false
    setStatus('就绪——点「渲染」。')
  })
  .catch((error: unknown) => {
    setStatus(`预热失败：${error instanceof Error ? error.message : String(error)}`, 'error')
  })
