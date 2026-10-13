/**
 * 本机导出（createLocalExport）的行为边界。
 *
 * 为什么值得测：这是核心包里唯一**真刀真枪调本机命令**的路径，搞错的表现都很伤——
 * 环境没备齐就放行（用户点了按钮等半天换来一声报错）、渲染失败被吞成「没有产出」、
 * mp4 拷进不知道哪儿去了。所以这里把每一层都钉住：
 *  - 场景识别：完整文件认类名、只写 construct 体的包上外壳（与工具侧口径一致）；
 *  - 就绪门：必要条件没备齐直接回「缺什么」，**不许**走到渲染那一步；
 *  - 真导出：假 manim（一个往 media 目录写 mp4 的脚本）走通全链路——源码落盘、mp4 拷进
 *    注入的导出目录、工作目录删干净；
 *  - 渲染失败：非零退出要把 manim 的报错带回来，不能只说「失败」两个字；
 *  - 定位：只认导出目录里的文件、checkOnly 不跑命令。
 *
 * 探测与去向都是**注入**的（工厂选项）：测试既不依赖这台机器装没装东西，也不碰真实的
 * 「下载」目录。真 manim 的全链路验收不在单元测试里——那是 `MANIM_EXPORT=1` 的档（见文件末尾）。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, delimiter, join } from 'node:path'
import { buildRenderArgs, createLocalExport, sceneClassName, wrapConstructBody, type LocalExport, type LocalExportOptions } from './local.ts'
import type { EnvResult } from '../machine/types.ts'

type ProbeValues = Record<string, { status: 'ok' | 'missing' | 'error'; version?: string; detail?: string }>

const READY: ProbeValues = {
  python3: { status: 'ok', version: 'Python 3.14' },
  manim: { status: 'ok', version: 'Manim Community v0.22.0' },
  manimModule: { status: 'ok', version: '0.22.0' },
  ffmpeg: { status: 'ok', version: 'ffmpeg version 9.0' },
  latex: { status: 'missing', detail: 'PATH 里找不到 latex' },
  dvisvgm: { status: 'missing', detail: 'PATH 里找不到 dvisvgm' },
}

/** 替身探测：按表回答；没给的表项当场抛（测试写漏了要立刻知道，不当成「没装」）。 */
function probeFrom(values: ProbeValues): LocalExportOptions['probe'] {
  return async (id: string): Promise<EnvResult | null> => {
    const value = values[id]
    if (value === undefined) throw new Error(`测试没给 ${id} 的探测结果`)
    return { id, status: value.status, path: '/fake/' + id, version: value.version ?? '', detail: value.detail ?? '' }
  }
}

// 场景里必须有 play：manim 对没有动画的场景只存 PNG、不出 mp4（这不是 bug，是它的规则——
// 导出模块对这种情况回「没有产出视频文件」也是对的）。
const FULL_FILE = ['from manim import *', '', 'class Demo(Scene):', '    def construct(self):', '        self.play(Write(Circle()))', ''].join('\n')

let home = ''
let downloads = ''

beforeEach(() => {
  home = mkdtempSync(join(tmpdir(), 'manim-export-home-'))
  downloads = join(home, 'Downloads')
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
  rmSync(home, { recursive: true, force: true })
})

/** 每个用例一套新实例：就绪缓存互不串台（搬迁前靠 invalidateReadiness 手工清，现在由工厂天然隔离）。 */
function makeExport(values: ProbeValues = READY, options: Partial<LocalExportOptions> = {}): LocalExport {
  return createLocalExport({ probe: probeFrom(values), outputDir: downloads, ...options })
}

describe('场景代码的处理', () => {
  it('完整文件：认出 Scene 子类的类名', () => {
    expect(sceneClassName(FULL_FILE)).toBe('Demo')
  })

  it('Scene 的子类（ThreeDScene 等）也算场景', () => {
    expect(sceneClassName('class T(ThreeDScene):\n    def construct(self):\n        pass\n')).toBe('T')
  })

  it('点路径基类（x.Scene）也算场景；非 Scene 类不认', () => {
    expect(sceneClassName('class T(manim.Scene):\n    def construct(self):\n        pass\n')).toBe('T')
    expect(sceneClassName('class Helper(ValueTracker):\n    pass\n')).toBeNull()
  })

  it('只写 construct 体：认不出类名，交给外壳去包', () => {
    expect(sceneClassName('self.add(Circle())\nself.wait(1)\n')).toBeNull()
  })

  it('外壳：import * 在顶、语句缩进四格、类名固定（导出走这条的产物与工具侧口径一致）', () => {
    const wrapped = wrapConstructBody('self.add(Circle())\n\nself.wait(1)\n')
    expect(wrapped.startsWith('from manim import *\n')).toBe(true)
    expect(wrapped).toContain('class ManimExportScene(Scene):')
    expect(wrapped).toContain('    def construct(self):')
    expect(wrapped).toContain('        self.add(Circle())')
    // 空行不缩进（缩了 Python 也不报错，但生成的文件不该是脏的）
    expect(wrapped).toContain('\n\n')
  })

  it('命令行组装：质量档、media 目录、源文件、场景名各就各位', () => {
    expect(buildRenderArgs('/w/scene.py', 'Demo', 'h', '/w/media')).toEqual([
      '-qh', '--media_dir', '/w/media', '/w/scene.py', 'Demo',
    ])
  })
})

describe('就绪门', () => {
  it('必要条件没备齐：回 environment 与缺什么，且**不碰渲染**', async () => {
    const local = makeExport({
      ...READY,
      ffmpeg: { status: 'missing', detail: 'PATH 里找不到 ffmpeg' },
      manimModule: { status: 'missing', detail: "ModuleNotFoundError: No module named 'manim'" },
    })
    const result = await local.exportVideo({ python: FULL_FILE })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('environment')
    expect(result.missing?.map((item) => item.id).sort()).toEqual(['ffmpeg', 'manimModule'])
  })

  it('LaTeX / dvisvgm 缺席**不算**必要条件：缺的名单里不许出现它们', async () => {
    // 必要性全过（LaTeX 那两项不在必要条件里），但找 manim 命令失败——导出停在 environment，
    // 关键是缺的名单里只有 manim，没有 latex / dvisvgm
    const local = makeExport(READY, { resolve: () => null })
    const result = await local.exportVideo({ python: FULL_FILE })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('environment')
    expect(result.missing?.map((item) => item.id)).toEqual(['manim'])
  })

  it('结论带 TTL 缓存：TTL 内不重复探测（几十张卡各问一遍不能各跑一遍 manim --version）', async () => {
    const calls: string[] = []
    const local = createLocalExport({
      outputDir: downloads,
      probe: async (id) => {
        calls.push(id)
        return probeFrom(READY)!(id)
      },
    })
    await local.exportReadiness()
    await local.exportReadiness()
    expect(calls).toHaveLength(6) // 4 必要 + 2 可选，各一次
  })

  it('空源码当场拒，连探测都不跑', async () => {
    const calls: string[] = []
    const local = createLocalExport({
      outputDir: downloads,
      probe: async (id) => {
        calls.push(id)
        return probeFrom(READY)!(id)
      },
    })
    const result = await local.exportVideo({ python: '   ' })
    expect(result).toMatchObject({ ok: false, reason: 'input' })
    expect(calls).toEqual([])
  })
})

describe('真导出（假 manim 脚本）', () => {
  let work = ''
  let scratch = ''
  let fakeManim = ''

  beforeEach(() => {
    work = mkdtempSync(join(tmpdir(), 'manim-export-case-'))
    // 注入的暂存根：导出把源码与 media 都落在它下面。
    // 为什么不直接扫全局临时目录去断言「清理干净」——那样会跟任何同时在跑的导出撞车
    // （开发时手工跑一次验收，就能让这一格红给你看，实测发生过）。
    scratch = join(work, 'scratch')
    mkdirSync(scratch, { recursive: true })
    mkdirSync(join(work, 'bin'))
    fakeManim = join(work, 'bin', 'manim')
  })

  afterEach(() => {
    rmSync(work, { recursive: true, force: true })
  })

  /**
   * 假 manim：按 `--media_dir` 往 media 目录里写产物。
   *  - `ok`          → 碎片 + 成片都写（真 manim 开着缓存时就是这样）
   *  - `partialOnly` → 只留碎片、没拼成成片（导出必须报错）
   *  - `fail`        → 非零退出并把报错写进 stderr
   *  - `silent`      → 正常退出但什么都不写
   */
  function installFakeManim(behavior: 'ok' | 'fail' | 'silent' | 'partialOnly' = 'ok'): void {
    const head = [
      '#!/usr/bin/env node',
      'const args = process.argv.slice(2)',
      'const mdir = args[args.indexOf("--media_dir") + 1]',
      'const fs = require("node:fs")',
      'const dir = mdir + "/videos/scene/1080p60"',
    ]
    const script = behavior === 'fail'
      ? [
          '#!/usr/bin/env node',
          'process.stderr.write("Traceback (most recent call last):\\n")',
          'process.stderr.write("ValueError: too many circles\\n")',
          'process.exit(1)',
        ]
      : behavior === 'silent'
        ? [...head, 'fs.mkdirSync(dir, { recursive: true })']
        : behavior === 'partialOnly'
          ? [
              ...head,
              'fs.mkdirSync(dir + "/partial_movie_files/Demo", { recursive: true })',
              'fs.writeFileSync(dir + "/partial_movie_files/Demo/aaa.mp4", "fragment")',
            ]
          : [
              ...head,
              // 真 manim 就是这样：碎片留在 partial_movie_files 里，成片在它外面那一层。
              // 碎片路径按字典序排在成片**之后**——曾经的挑选逻辑正是被这一点骗了，
              // 拷走的是一段一秒的碎片，用户看到的是「动画不完整」。
              'fs.mkdirSync(dir + "/partial_movie_files/Demo", { recursive: true })',
              'fs.writeFileSync(dir + "/partial_movie_files/Demo/zzz-fragment.mp4", "fragment")',
              'fs.writeFileSync(dir + "/Demo.mp4", "full-cut")',
            ]
    writeFileSync(fakeManim, script.join('\n') + '\n')
    chmodSync(fakeManim, 0o755)
  }

  /** 把假 manim 放上 PATH 第一位：真身 resolveExecutable 按序找，第一个命中就是它，不会摸到这台机器上真装的那份。 */
  function withFakeManimOnPath<T>(run: () => Promise<T>): Promise<T> {
    const saved = process.env.PATH
    process.env.PATH = [join(work, 'bin'), saved ?? ''].join(delimiter)
    return run().finally(() => {
      process.env.PATH = saved
    })
  }

  it('全链路：源码落盘 → 假 manim 渲染 → mp4 拷进导出目录 → 工作目录删干净', async () => {
    installFakeManim('ok')
    const local = makeExport()
    await withFakeManimOnPath(async () => {
      const result = await local.exportVideo({ python: FULL_FILE, workRoot: scratch })
      expect(result.ok).toBe(true)
      if (!result.ok) return
      expect(result.file.startsWith(downloads)).toBe(true)
      expect(basename(result.file)).toMatch(/^manim-Demo-\d{8}T\d{6}\.mp4$/u)
      expect(result.quality).toBe('h')
      expect(existsSync(result.file)).toBe(true)
      // 拿到的必须是**成片**而不是碎片：同目录里那份碎片按字典序排在后面，
      // 曾经的「排序取最后一个」正是这样把一秒的碎片当成了整片
      expect(readFileSync(result.file, 'utf8')).toBe('full-cut')
      // 暂存根清干净：导出的一次性目录不许留下
      expect(readdirSync(scratch)).toEqual([])
    })
  })

  it('渲染失败（非零退出）：把 manim 的报错带回来', async () => {
    installFakeManim('fail')
    const local = makeExport()
    await withFakeManimOnPath(async () => {
      const result = await local.exportVideo({ python: FULL_FILE })
      expect(result.ok).toBe(false)
      if (result.ok) return
      expect(result.reason).toBe('render')
      expect(result.error).toContain('ValueError: too many circles')
    })
  })

  it('跑完但没有 mp4：不算成功，也不许假装成功', async () => {
    installFakeManim('silent')
    const local = makeExport()
    await withFakeManimOnPath(async () => {
      const result = await local.exportVideo({ python: FULL_FILE })
      expect(result).toMatchObject({ ok: false, reason: 'render' })
      if (result.ok) return
      expect(result.error).toContain('没有产出视频')
    })
  })

  it('只剩碎片、没拼成成片：如实报错，绝不拿碎片充数', async () => {
    installFakeManim('partialOnly')
    const local = makeExport()
    await withFakeManimOnPath(async () => {
      const result = await local.exportVideo({ python: FULL_FILE })
      expect(result).toMatchObject({ ok: false, reason: 'render' })
      if (result.ok) return
      expect(result.error).toContain('碎片')
    })
  })
})

describe('在文件浏览器里定位导出文件', () => {
  /** 假 runner：只记下被调用的命令，绝不真弹 Finder。 */
  function spyRunner(): { calls: Array<{ file: string; args: string[] }>; run: (file: string, args: string[]) => Promise<{ error: null; stdout: string; stderr: string }> } {
    const calls: Array<{ file: string; args: string[] }> = []
    const run = (file: string, args: string[]) => {
      calls.push({ file, args })
      return Promise.resolve({ error: null, stdout: '', stderr: '' })
    }
    return { calls, run }
  }

  it('导出目录里的文件：按平台调对命令（macOS 是 open -R 选中它）', async () => {
    const local = makeExport()
    const file = join(downloads, 'manim-Demo-20261010T100000.mp4')
    mkdirSync(downloads, { recursive: true })
    writeFileSync(file, 'mp4-bytes')
    const { calls, run } = spyRunner()
    const result = await local.revealExportedFile(file, { run })
    expect(result.ok).toBe(true)
    expect(calls).toHaveLength(1)
    if (process.platform === 'darwin') {
      expect(calls[0]?.file).toBe('open')
      expect(calls[0]?.args[0]).toBe('-R')
    }
  })

  it('导出目录之外一律拒绝：不能拿页面上的路径当「替你操作系统」的通路', async () => {
    const local = makeExport()
    const outside = mkdtempSync(join(tmpdir(), 'manim-outside-'))
    const file = join(outside, 'secret.mp4')
    writeFileSync(file, 'x')
    const { calls, run } = spyRunner()
    try {
      const result = await local.revealExportedFile(file, { run })
      expect(result.ok).toBe(false)
      expect(result.code).toBe('outside')
      expect(result.error).toContain('只能打开导出目录里的文件')
      expect(calls).toEqual([]) // 拒绝了就一条命令都不许跑
    } finally {
      rmSync(outside, { recursive: true, force: true })
    }
  })

  it('文件已经不在了：如实回，不抛', async () => {
    const local = makeExport()
    const { run } = spyRunner()
    const result = await local.revealExportedFile(join(downloads, 'gone.mp4'), { run })
    expect(result.ok).toBe(false)
    expect(result.code).toBe('missing')
    expect(result.error).toContain('文件不在了')
  })

  it('空路径当场拒', async () => {
    const local = makeExport()
    const { run } = spyRunner()
    expect(await local.revealExportedFile('', { run })).toMatchObject({ ok: false, code: 'missing' })
  })

  it('checkOnly 只回答在不在：一条系统命令都不跑（恢复导出记录时用它核对）', async () => {
    const local = makeExport()
    const file = join(downloads, 'manim-Demo-20261010T100000.mp4')
    mkdirSync(downloads, { recursive: true })
    writeFileSync(file, 'mp4-bytes')
    const { calls, run } = spyRunner()
    expect(await local.revealExportedFile(file, { run, checkOnly: true })).toMatchObject({ ok: true })
    expect(calls).toEqual([])
    // 不在的文件同样给 missing，且照样不跑命令
    expect(await local.revealExportedFile(join(downloads, 'gone.mp4'), { run, checkOnly: true }))
      .toMatchObject({ ok: false, code: 'missing' })
    expect(calls).toEqual([])
  })

  it('命令跑失败：code 是 failed，带回它自己的报错', async () => {
    const local = makeExport()
    const file = join(downloads, 'manim-Demo-20261010T100000.mp4')
    mkdirSync(downloads, { recursive: true })
    writeFileSync(file, 'mp4-bytes')
    const run = () => Promise.resolve({ error: new Error('spawn failed'), stdout: '', stderr: 'nope' })
    const result = await local.revealExportedFile(file, { run })
    expect(result).toMatchObject({ ok: false, code: 'failed' })
    expect(result.error).toContain('nope')
  })
})

/**
 * 真 manim 的全链路（要用**真装的** manim 渲染一段、真的往临时导出目录里落一个 mp4）：
 * `MANIM_EXPORT=1 pnpm test` 才跑。单元档已用假 manim 钉住了每一层的行为，这一档是端到端的存照。
 */
const REAL = process.env.MANIM_EXPORT === '1' && process.platform !== 'win32'

describe.skipIf(!REAL)('真 manim 导出（MANIM_EXPORT=1 才跑）', () => {
  it('渲染一段简单动画并落到临时导出目录', async () => {
    // 探测是替身、manim 本身是真的；搜索路径里的 ~/.local/bin（manim 的软链常在那儿）要自己接回来
    const realLocalBin = join(process.env.HOME ?? '', '.local', 'bin')
    const savedPath = process.env.PATH
    process.env.PATH = [realLocalBin, savedPath ?? ''].join(delimiter)
    try {
      const local = makeExport()
      const result = await local.exportVideo({ python: FULL_FILE, quality: 'l' })
      console.info('[manim-export] result:', result)
      expect(result.ok).toBe(true)
      if (result.ok) {
        expect(result.file.startsWith(downloads)).toBe(true)
        expect(existsSync(result.file)).toBe(true)
        rmSync(result.file, { force: true })
      }
    } finally {
      process.env.PATH = savedPath
    }
  }, 120_000)
})
