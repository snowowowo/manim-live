import { describe, expect, it } from 'vitest'
import { environmentStatus, onEnvironmentStatus } from './environment.ts'
import { createManimRenderer } from '../index.ts'
import { runPython, setPyodideLoader, warmupRuntime, type PyodideRuntime } from '../py/runtime.ts'
import { createDryRunBridge } from '../py/dry-run-bridge.ts'

function fakeRuntime(overrides: Partial<PyodideRuntime> = {}): PyodideRuntime {
  return {
    runPythonAsync: async () => undefined,
    loadPackage: async () => undefined,
    setStdout: () => {},
    globals: { set: () => {} },
    ...overrides,
  }
}

describe('environmentStatus（Node 侧）', () => {
  it('无 DOM 时能力探测如实报缺，且不抛', () => {
    const status = environmentStatus()
    expect(status.capabilities.wasm).toBe(true)
    expect(status.capabilities.webgl).toBe(false)
    expect(status.capabilities.videoExport).toBe(false)
    expect(status.katex.phase).toBe('unconfigured')
    // 未配置 KaTeX 是配置选择、不是故障：不进全局 hints（它只在 check() 的 warnings 里出声）
    expect(status.hints).toEqual([])
  })

  it('运行时生命周期：loading → ready，订阅者按序收到', async () => {
    const phases: string[] = []
    const unsubscribe = onEnvironmentStatus((status) => phases.push(status.runtime.phase))
    setPyodideLoader(async () => fakeRuntime())
    await warmupRuntime()
    unsubscribe()
    expect(phases).toEqual(['loading', 'ready'])
    expect(environmentStatus().runtime.phase).toBe('ready')
    expect(environmentStatus().runtime.error).toBeUndefined()
  })

  it('启动失败进 error 并给 hint；重试成功即清掉', async () => {
    setPyodideLoader(async () => {
      throw new Error('脚本 404')
    })
    await expect(warmupRuntime()).rejects.toThrow()
    const failed = environmentStatus()
    expect(failed.runtime.phase).toBe('error')
    expect(failed.runtime.error).toContain('脚本 404')
    expect(failed.hints.some((hint) => hint.includes('Pyodide 运行时启动失败'))).toBe(true)

    setPyodideLoader(async () => fakeRuntime())
    await warmupRuntime()
    const recovered = environmentStatus()
    expect(recovered.runtime.phase).toBe('ready')
    expect(recovered.runtime.error).toBeUndefined()
    expect(recovered.hints).toEqual([])
  })

  it('取包进展与失败原因进 packages', async () => {
    const seen: string[][] = []
    const unsubscribe = onEnvironmentStatus((status) => seen.push(status.packages.fetching))
    setPyodideLoader(async () =>
      fakeRuntime({
        loadPackagesFromImports: async (_code, options) => {
          options?.messageCallback?.('Loading pandas')
          options?.errorCallback?.('The following error occurred while loading pandas:\nboom')
        },
      }),
    )
    await expect(runPython('import pandas', createDryRunBridge())).rejects.toThrow(/pandas/)
    unsubscribe()
    expect(seen).toContainEqual(['pandas'])
    const status = environmentStatus()
    expect(status.packages.fetching).toEqual([])
    expect(status.packages.lastError).toContain('pandas')
    expect(status.hints).toContain(status.packages.lastError)
  })
})

describe('check() 的 warnings', () => {
  it('代码含公式而未配置 KaTeX：给一条警告，且不改变 ok 的语义', async () => {
    const renderer = createManimRenderer()
    const result = await renderer.check('from manim import *\nMathTex("x^2")')
    expect(result.warnings).toHaveLength(1)
    expect(result.warnings![0]).toContain('katexBaseURL')
  })

  it('配置了 katexBaseURL 或代码不含公式：warnings 缺席', async () => {
    const configured = createManimRenderer({ katexBaseURL: '/katex/' })
    expect((await configured.check('from manim import *\nMathTex("x^2")')).warnings).toBeUndefined()
    const plain = createManimRenderer()
    expect((await plain.check('from manim import *\nCircle()')).warnings).toBeUndefined()
  })
})
