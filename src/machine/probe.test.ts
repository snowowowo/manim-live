/**
 * 本机探测的离线不变量：找命令（PATH 归一化 + 可执行位）、venv 布局的同层解释器、
 * 计划形状、逐项结果的三态。
 *
 * 用临时目录造「假命令」并把它放 PATH 第一位——不依赖这台机器装没装什么，也不会摸到
 * 真装的 manim / ffmpeg。
 */
import { chmodSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { delimiter, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { probeCheck, probePlan, pythonBesideExecutable, resolveExecutable } from './probe.ts'

const made: string[] = []

function tempDir(tag: string): string {
  const dir = mkdtempSync(join(tmpdir(), `manim-probe-${tag}-`))
  made.push(dir)
  return dir
}

/** 造一个可执行的假命令（打印给定的一行）。 */
function fakeTool(dir: string, name: string, line: string): string {
  const file = join(dir, name)
  writeFileSync(file, `#!/bin/sh\necho "${line}"\n`)
  chmodSync(file, 0o755)
  return file
}

/** 只在这段回调里替身 PATH（searchPath 读 process.env.PATH，其余标准目录照旧追加）。 */
async function withPath<T>(dirs: string[], run: () => Promise<T> | T): Promise<T> {
  const saved = process.env.PATH
  process.env.PATH = dirs.join(delimiter)
  try {
    return await run()
  } finally {
    process.env.PATH = saved
  }
}

afterEach(() => {
  for (const dir of made.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('resolveExecutable', () => {
  it('PATH 里找到可执行文件，回绝对路径', async () => {
    const dir = tempDir('find')
    const tool = fakeTool(dir, 'fake-tool', 'v1')
    await withPath([dir], () => {
      expect(resolveExecutable('fake-tool')).toBe(tool)
    })
  })

  it('有文件但没有可执行位：不算找到（装了却报「没装」最伤信任，这里不能反过来放行）', async () => {
    const dir = tempDir('noexec')
    writeFileSync(join(dir, 'no-exec-tool'), 'data') // 不 chmod
    await withPath([dir], () => {
      expect(resolveExecutable('no-exec-tool')).toBeNull()
    })
  })

  it('哪都没有就回 null', async () => {
    await withPath([tempDir('empty')], () => {
      expect(resolveExecutable('definitely-not-a-real-tool-xyz')).toBeNull()
    })
  })
})

describe('pythonBesideExecutable', () => {
  it('venv 布局：认出 manim 同层的 python3（解链之后的位置，macOS 的 /var → /private/var 也解）', () => {
    const env = tempDir('venv')
    const bin = join(env, 'bin')
    mkdirSync(bin, { recursive: true })
    fakeTool(bin, 'python3', 'Python 3.12.0')
    const manim = fakeTool(bin, 'manim', 'manim v1')
    expect(pythonBesideExecutable(manim)).toBe(join(realpathSync(bin), 'python3'))
  })

  it('不是 venv 布局（同层没有 python3）回 null，交给调用方兜底', () => {
    const dir = tempDir('notvenv')
    expect(pythonBesideExecutable(fakeTool(dir, 'alone', 'x'))).toBeNull()
  })
})

describe('probePlan', () => {
  it('列出全部探测项与要跑的命令，且**不含结果**（所以是秒回的）', () => {
    const plan = probePlan()
    expect(plan.platform).toBe(process.platform)
    expect(plan.path).toContain(delimiter)
    expect(plan.checks.map((check) => check.id)).toEqual(
      expect.arrayContaining(['python3', 'manim', 'manimModule', 'ffmpeg', 'latex', 'dvisvgm']),
    )
    for (const check of plan.checks) {
      expect(check.command.startsWith(check.tool)).toBe(true)
      expect(check.command.length).toBeGreaterThan(check.tool.length)
    }
  })
})

describe('probeCheck', () => {
  it('找到命令并跑通：ok + 命令路径 + 版本行', async () => {
    const dir = tempDir('ok')
    const tool = fakeTool(dir, 'python3', 'Python 3.9.9-test')
    await withPath([dir], async () => {
      const result = await probeCheck('python3')
      expect(result).toMatchObject({ id: 'python3', status: 'ok', path: tool, version: 'Python 3.9.9-test', detail: '' })
    })
  })

  it('不认识的 id 回 null（调用方据此答 404）', async () => {
    expect(await probeCheck('nope')).toBeNull()
  })
})
