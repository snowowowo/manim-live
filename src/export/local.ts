// 本机导出：把一段 Manim Python 交给**本机真正装的** Manim CLI，渲染成 mp4 文件。
//
// 与浏览器录制（./browser-recorder.ts）的关系：录屏拿的是**活画布**、出 Blob；本模块走本机
// CLI、出磁盘路径。两条路互不依赖、同一份源码都能走——录屏偏「所见即所得」，本机导出偏
// 「发行质量」（可上 1080p / 4K，公式走真 LaTeX）。
//
// 与卡片里那条渲染路径的关系：卡片跑在 Pyodide（WebAssembly）里，看动画够用，但拿不走文件。
// 要一个能保存、能分享的 mp4，就得调用户机器上的 manim 命令，这完全是另一套运行时
// （探测见 ../machine/probe.ts）。所以导出之前必须先过环境门：必要条件没备齐，
// 这里直接回结构化的「缺什么」，调用方（按钮 / 面板）据此置灰与提示。
//
// 政策与本事分开：**成片去向**（`outputDir`）与**探测 / 寻址**（`probe` / `resolve`）都由调用方
// 注入——DSH 插件传自己的「下载」目录与它环境路由那半，测试传临时目录与替身。不注入时用默认：
// 真机探测、真机寻址、`~/Downloads`。

import { execFile } from 'node:child_process'
import { statSync } from 'node:fs'
import { copyFile, mkdir, mkdtemp, readdir, realpath, rm, writeFile } from 'node:fs/promises'
import { homedir, tmpdir } from 'node:os'
import { basename, dirname, join, sep } from 'node:path'
import { probeCheck, resolveExecutable } from '../machine/probe.ts'
import type { ProbeFn } from '../machine/types.ts'
import type { ExportMissing, ExportReadiness, LocalExportResult, RevealResult } from './types.ts'

/** 跑命令的注入点：测试要断言「点了什么命令」，又绝不能真弹出 Finder / 真跑 manim。 */
export interface CommandOutcome {
  error: (Error & { killed?: boolean }) | null
  stdout: string
  stderr: string
}
export type CommandRunner = (file: string, args: string[], timeoutMs: number) => Promise<CommandOutcome>

/** 导出的环境必要条件。LaTeX / dvisvgm 刻意不在内：只有 MathTex / Tex 写法才用得到，普通动画没有它们照样出片。 */
const REQUIRED_CHECKS = ['python3', 'manim', 'manimModule', 'ffmpeg']

/** manim 的质量档：l=480p15 m=720p30 h=1080p60 p=1440p60 k=2160p60（`-q` 的合法值）。 */
const QUALITIES = new Set(['l', 'm', 'h', 'p', 'k'])
const DEFAULT_QUALITY = 'h'
/** 导出是真渲染（还可能是 60fps），比卡片那条慢得多；上限放宽到 10 分钟，超时由 execFile 杀进程。 */
const EXPORT_TIMEOUT_MS = 10 * 60 * 1000
/** 必要条件的就绪结论缓存这么久：太快会反复 import Manim，太慢则装好环境后按钮迟迟不亮。 */
const READINESS_TTL_MS = 30 * 1000

/**
 * 扩展车道的 import 行（`from manim_live_extra import …` / `import manim_live_extra`）。
 * 本机 manim CLI 只有标准 Manim——命中即拦在真跑之前，别等到渲染中途才 ModuleNotFoundError。
 * 这道门只能放这里：浏览器的 check() 跑在我们自己的适配层上，扩展在它眼里完全合法。
 */
const EXTRAS_IMPORT = /(?:^|\n)\s*(?:from\s+manim_live_extra\s+import|import\s+manim_live_extra\b)/

// ---- 场景代码的处理 ----------------------------------------------------------

/**
 * 从源码里找 Scene 子类的类名（manim 命令行要指名渲染哪个场景）。
 * 认 `class X(<基类>)`，基类是 Scene 本尊、点路径结尾（three_d_scene.Scene）或它的具名子类
 * （ThreeDScene / MovingCameraScene…——名字以 Scene 收尾）；找到多个取第一个。
 */
export function sceneClassName(python: string): string | null {
  const matches = [...python.matchAll(/^\s*class\s+([A-Za-z_]\w*)\s*\(\s*([A-Za-z_][\w.]*)\s*\)/gmu)]
  const scene = matches.find((match) => /(?:^|\.)\w*Scene$/u.test(match[2]!))
  return scene?.[1] ?? null
}

/** 只写了 construct 体的源码包上标准外壳（与工具侧「只写 construct 体也收」的口径一致）。语句在 construct 里，缩进两层。 */
export function wrapConstructBody(body: string): string {
  const indented = body
    .split('\n')
    .map((line) => (line.trim().length > 0 ? `        ${line}` : line))
    .join('\n')
  return ['from manim import *', '', 'class ManimExportScene(Scene):', '    def construct(self):', indented, ''].join('\n')
}

/** 组装 manim 命令行：一律 execFile + 写死的参数数组，用户源码走临时文件、不进命令行（无注入面）。 */
export function buildRenderArgs(sourceFile: string, sceneName: string, quality: string, mediaDir: string): string[] {
  return ['-q' + quality, '--media_dir', mediaDir, sourceFile, sceneName]
}

// ---- 工厂 --------------------------------------------------------------------

export interface LocalExportOptions {
  /** 成片去向；缺省用户「下载」文件夹（`~/Downloads`，不存在会建）。 */
  outputDir?: string
  /** 就绪门用的探测函数；缺省 ../machine/probe.ts 的真身（跑真命令）。 */
  probe?: ProbeFn
  /** 在 PATH 里找可执行文件；缺省 ../machine/probe.ts 的真身。 */
  resolve?: (tool: string) => string | null
  /** 就绪结论缓存时长；缺省 30 秒。 */
  readinessTtlMs?: number
}

export interface LocalExport {
  /**
   * 环境必要条件备齐没有。必要项里任何一项不是 ok 就算没备齐，并带回缺什么（按钮悬停提示直接用）。
   * 可选能力（LaTeX / dvisvgm）也一起测出来，调用方想提示「导公式还需装 LaTeX」有据可依。
   */
  exportReadiness(options?: { maxAgeMs?: number }): Promise<ExportReadiness>
  /** 测试与调用方主动失效缓存（比如设置页刚跑完「重新检测」）。 */
  invalidateReadiness(): void
  /**
   * 导出一段 Manim Python 为 mp4。
   * @returns `{ ok: true, file, quality }` 或 `{ ok: false, reason, error?, missing? }`；
   *   `reason`：`input`（源码为空）/ `environment`（必要条件没备齐）/ `render`（manim 跑了但失败）。
   */
  exportVideo(options?: { python?: string; quality?: string; timeoutMs?: number; workRoot?: string }): Promise<LocalExportResult>
  /** 在系统的文件浏览器里定位一个导出好的文件（见 revealExportedFile 的注释）。 */
  revealExportedFile(target: string, options?: { run?: CommandRunner; checkOnly?: boolean }): Promise<RevealResult>
  /** 成片去向（默认 `~/Downloads`）；就绪门与定位校验共用这一处边界。 */
  outputDir(): string
}

export function createLocalExport(options: LocalExportOptions = {}): LocalExport {
  const probe: ProbeFn = options.probe ?? probeCheck
  const resolve = options.resolve ?? resolveExecutable
  const readinessTtlMs = options.readinessTtlMs ?? READINESS_TTL_MS
  const outputDir = (): string => options.outputDir ?? join(homedir(), 'Downloads')

  let readinessCache: { at: number; value: ExportReadiness } | null = null

  async function exportReadiness(callOptions: { maxAgeMs?: number } = {}): Promise<ExportReadiness> {
    const maxAgeMs = callOptions.maxAgeMs ?? readinessTtlMs
    if (readinessCache !== null && Date.now() - readinessCache.at < maxAgeMs) return readinessCache.value
    const ids = [...REQUIRED_CHECKS, 'latex', 'dvisvgm']
    const checks = await Promise.all(ids.map((id) => probe(id)))
    const missing: ExportMissing[] = checks
      .filter((result): result is NonNullable<typeof result> => result !== null && result.status !== 'ok' && REQUIRED_CHECKS.includes(result.id))
      .map((result) => ({ id: result.id, detail: result.detail || (result.status === 'missing' ? '未安装' : '出错') }))
    const value: ExportReadiness = { ready: missing.length === 0, missing }
    readinessCache = { at: Date.now(), value }
    return value
  }

  /** 导出目录（缺省「下载」）。目录确保存在。 */
  async function ensureOutputDir(): Promise<string> {
    const dir = outputDir()
    await mkdir(dir, { recursive: true })
    return dir
  }

  /**
   * 在系统的文件浏览器里定位一个文件（导出成功后点路径就走这里）。
   *
   * 为什么只认导出目录里的文件：这个动作会**代替用户去操作系统**，路径又是从页面来的。
   * 放开就等于给了一条「随便指个路径就替你打开」的通路。限定在导出目录（「下载」）之内，
   * 越界的一律拒绝——协议上多做一步，攻击面就归零。
   *
   * `checkOnly`：只回答「还在不在、在不在导出目录里」，**一条系统命令都不跑**。页面恢复
   * 上次导出记录时要问这个——记录是上次会话写的，文件早被移走删掉也是常事，不能拿它当真。
   *
   * 失败时给机器可读的 `code`（`missing` / `outside` / `failed`）：页面按它决定说什么话，
   * 不必去猜错误文案里的字。
   */
  async function revealExportedFile(target: string, callOptions: { run?: CommandRunner; checkOnly?: boolean } = {}): Promise<RevealResult> {
    const run = callOptions.run ?? runCommand
    if (typeof target !== 'string' || target.length === 0) return { ok: false, code: 'missing', error: '路径为空' }
    const dir = await ensureOutputDir()
    let inside: string | null = null
    let real: string | null = null
    try {
      // 两边都先解掉软链再比（macOS 上 /var 就是 /private/var 的软链，不解析会误判越界）
      real = await realpath(target)
      inside = await realpath(dir)
    } catch {
      return { ok: false, code: 'missing', error: '文件不在了（可能已被移走或删掉）' }
    }
    if (real !== inside && !real.startsWith(inside + sep)) {
      return { ok: false, code: 'outside', error: '只能打开导出目录里的文件' }
    }
    if (callOptions.checkOnly === true) return { ok: true, code: '', error: '' }
    // macOS 用 open -R 选中文件；Windows 用 explorer /select,；Linux 没有「选中」这回事，开所在目录
    const [file, args] = process.platform === 'darwin'
      ? ['open', ['-R', real]]
      : process.platform === 'win32'
        ? ['explorer', [`/select,${real}`]]
        : ['xdg-open', [dirname(real)]]
    const outcome = await run(file, args, 10_000)
    if (outcome.error !== null) {
      return { ok: false, code: 'failed', error: tail(outcome.stderr) || outcome.error.message }
    }
    return { ok: true, code: '', error: '' }
  }

  async function exportVideo(callOptions: { python?: string; quality?: string; timeoutMs?: number; workRoot?: string } = {}): Promise<LocalExportResult> {
    const { python } = callOptions
    const timeoutMs = callOptions.timeoutMs ?? EXPORT_TIMEOUT_MS
    const workRoot = callOptions.workRoot ?? tmpdir()
    if (typeof python !== 'string' || python.trim().length === 0) {
      return { ok: false, reason: 'input', error: 'python 不能为空' }
    }
    if (EXTRAS_IMPORT.test(python)) {
      return {
        ok: false,
        reason: 'input',
        error:
          '这段代码用了引擎扩展（import manim_live_extra）——标准 Manim 没有这些图形，本机 manim CLI 渲不了。' +
          '两条路：改用浏览器逐帧导出（能渲扩展），或把扩展图形换成标准 Manim 写法',
      }
    }
    const q = QUALITIES.has(callOptions.quality ?? '') ? callOptions.quality! : DEFAULT_QUALITY

    const readiness = await exportReadiness()
    if (!readiness.ready) {
      return { ok: false, reason: 'environment', missing: readiness.missing, error: '本机环境没有备齐，无法导出' }
    }

    const manimPath = resolve('manim')
    if (manimPath === null) {
      // 刚刚的 readiness 还说 ready——只可能被并发清了缓存之类，按环境问题回
      return { ok: false, reason: 'environment', missing: [{ id: 'manim', detail: 'PATH 里找不到 manim' }], error: 'PATH 里找不到 manim' }
    }

    const sceneName = sceneClassName(python)
    const source = sceneName === null ? wrapConstructBody(python) : python
    const className = sceneName ?? 'ManimExportScene'

    // 临时工作目录：源码与 media 都落在这里，渲染完只把 mp4 拷走，整目录删掉
    const workDir = await mkdtemp(join(workRoot, 'manim-export-'))
    const mediaDir = join(workDir, 'media')
    const sourceFile = join(workDir, 'scene.py')
    await writeFile(sourceFile, source, 'utf8')
    try {
      const outcome = await runCommand(manimPath, buildRenderArgs(sourceFile, className, q, mediaDir), timeoutMs)
      if (outcome.error !== null) {
        const detail = outcome.error.killed === true
          ? `${Math.round(timeoutMs / 60000)} 分钟没渲染完，已放弃`
          : tail(outcome.stderr || outcome.stdout) || outcome.error.message
        return { ok: false, reason: 'render', error: detail }
      }
      const videos = await findVideos(mediaDir)
      if (videos.length === 0) {
        const partials = await findVideos(mediaDir, { includePartial: true })
        return {
          ok: false,
          reason: 'render',
          error: partials.length > 0
            ? `manim 只留下了 ${partials.length} 段渲染碎片，没有拼成成片`
            : 'manim 跑完了，但没有产出视频文件',
        }
      }
      // 成片优先，绝不拿碎片充数（碎片目录已在 findVideos 里排除）
      const produced = pickFinalVideo(videos, className)
      const stamp = new Date().toISOString().replace(/[-:]/gu, '').replace(/\..+$/u, '')
      const target = join(await ensureOutputDir(), `manim-${className}-${stamp}.mp4`)
      await copyFile(produced, target)
      return { ok: true, file: target, quality: q }
    } finally {
      await rm(workDir, { recursive: true, force: true }).catch(() => {})
    }
  }

  return {
    exportReadiness,
    invalidateReadiness() {
      readinessCache = null
    },
    exportVideo,
    revealExportedFile,
    outputDir,
  }
}

// ---- 内部工具 ----------------------------------------------------------------

/** 跑一条命令等它结束；超时 / 非零退出都不抛，由调用方看 outcome。 */
const runCommand: CommandRunner = (file, args, timeoutMs) => {
  return new Promise((resolve) => {
    execFile(file, args, {
      timeout: timeoutMs,
      windowsHide: true,
      maxBuffer: 16 * 1024 * 1024,
    }, (error, stdout, stderr) => {
      resolve({ error: error as (Error & { killed?: boolean }) | null, stdout: String(stdout), stderr: String(stderr) })
    })
  })
}

/** 命令报错里最值钱的是最后几行（manim 的异常栈顶在那儿），前面的进度条噪声裁掉。 */
function tail(text: string, keep = 6): string {
  const lines = String(text).split('\n').map((line) => line.trimEnd()).filter((line) => line.trim().length > 0)
  return lines.slice(-keep).join('\n').slice(0, 2000)
}

/**
 * manim 分段渲染的碎片目录。开着缓存（默认）时它会在成片旁边留下**每一段动画**的小 mp4，
 * 成片则是同一层那个 `<场景名>.mp4`。挑选产物时必须把碎片排除掉——踩过一次：
 * 按路径排序取「最后一个」，而 `partial_movie_files`（小写 p）排在 `SecantToTangent.mp4`
 * （大写 S）之后，于是导出的是一段一秒的碎片，用户看到的是「动画不完整」。
 */
const PARTIAL_DIR = 'partial_movie_files'

/**
 * 递归找 mp4。`includePartial` 只给报错信息用：成片找不到时，要能说清
 * 「是碎片还在但没拼成片」还是「压根没产出」，这两件事用户能做的事不一样。
 */
async function findVideos(root: string, { includePartial = false } = {}): Promise<string[]> {
  const found: string[] = []
  const walk = async (dir: string): Promise<void> => {
    let entries
    try {
      entries = await readdir(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const entry of entries) {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!includePartial && entry.name === PARTIAL_DIR) continue
        await walk(path)
      } else if (entry.isFile() && entry.name.endsWith('.mp4')) found.push(path)
    }
  }
  await walk(root)
  return found
}

/**
 * 从候选里挑成片：名字就是场景名的那份优先；实在认不出（用户自己改了输出名之类），
 * 退而取**最大**的那个——manim 的正片永远比任何单段碎片大。
 */
function pickFinalVideo(candidates: string[], sceneName: string): string {
  const named = candidates.find((path) => basename(path) === `${sceneName}.mp4`)
  if (named !== undefined) return named
  let best = candidates[0]!
  let bestSize = -1
  for (const path of candidates) {
    try {
      const size = statSync(path).size
      if (size > bestSize) {
        bestSize = size
        best = path
      }
    } catch {
      // 读不到大小就跳过（清理当中/权限问题），别的候选继续
    }
  }
  return best
}
