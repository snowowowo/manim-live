// 取包失败这条路：**报错文案是有合同的部分**。
//
// 这条路的坑全在文案上：Pyodide 取不到包时抛的是 `TypeError: Failed to fetch`——
// 而浏览器侧取 wheel 带 SRI 校验，「文件不在」与「网络不通」抛的是**同一句话**
// （实测四路对照见 src/engine/pyodide.ts 的 diagnosePackageNames）。
// 所以核心包这边必须做到：诊断器给出的真因能**整句替掉**那句按宿主代取写的兜底建议。
//
// 这个文件用替身运行时，不碰真 Pyodide——`runtime.test.ts` 那套走真 Pyodide，慢且只该验语法。
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  PyRuntimeError,
  packageFailureMessage,
  runPython,
  setPackageDiagnoser,
  setPyodideLoader,
  type PyodideRuntime,
} from './runtime.ts'
import { createRecordingBridge } from './bridge.ts'

afterEach(() => {
  setPackageDiagnoser(null)
})

/**
 * 一个只实现「取包那一步」的替身：给定的包一律取不到，其余动作不会被走到。
 *
 * `runPythonAsync` 是 no-op 而不是抛——**`getRuntime()` 会先拿真 Python 片段 bootstrap**
 * （BRIDGE_BOOTSTRAP / MANIM_MODULE_SETUP），替身跑不过那两段。取包失败时用户代码根本走不到，
 * 所以这里什么都不做正好；真是「取包没失败」，测试自己的收尾断言会喊出来。
 */
function stubRuntime(failing: string[]): PyodideRuntime {
  return {
    async runPythonAsync() {},
    async loadPackage() {},
    async loadPackagesFromImports(_code, options) {
      for (const name of failing) {
        // 真实失败消息就是这两行成对出现（原样抄的），包名只在标题里。
        options?.errorCallback?.(`The following error occurred while loading ${name}:`)
        options?.errorCallback?.('TypeError: Failed to fetch')
      }
    },
    setStdout() {},
    globals: { set() {} },
  }
}

async function runAndCatch(code: string, failing: string[]): Promise<PyRuntimeError> {
  setPyodideLoader(async () => stubRuntime(failing))
  try {
    await runPython(code, createRecordingBridge(), { drive: false })
  } catch (error) {
    if (error instanceof PyRuntimeError) return error
    throw error
  }
  throw new Error('本该抛 PyRuntimeError')
}

describe('取包失败：诊断器问出来的真因要替掉兜底建议', () => {
  it('诊断器给话 → 用它，不再贴「之后离线也能用」那句', async () => {
    setPackageDiagnoser(async (names) => {
      expect(names).toEqual(['pandas', 'pytz'])
      return '/pyodide/ 下没有 pandas-2.2.3-….whl——静态目录里有什么就只能取什么。'
    })
    const error = await runAndCatch('import pandas\nimport pytz', ['pandas', 'pytz'])
    expect(error.message).toContain('（pandas、pytz）')
    expect(error.message).toContain('Failed to fetch')
    expect(error.message).toContain('静态目录里有什么就只能取什么')
    expect(error.message).not.toContain('之后离线也能用')
  })

  it('诊断器缺席 / 返 null / 自己抛 → 都退回兜底文案，失败本身不许被盖掉', async () => {
    const fallback = await runAndCatch('import pandas', ['pandas'])
    expect(fallback.message).toContain('之后离线也能用')

    setPackageDiagnoser(async () => null)
    expect((await runAndCatch('import pandas', ['pandas'])).message).toContain('之后离线也能用')

    setPackageDiagnoser(async () => {
      throw new Error('探针自己挂了')
    })
    const survived = await runAndCatch('import pandas', ['pandas'])
    expect(survived.message).toContain('Failed to fetch')
    expect(survived.message).not.toContain('探针自己挂了')
  })

  it('包名一个都认不出时不去麻烦诊断器（没名字可问）', async () => {
    const diagnose = vi.fn(async () => '不该被调用')
    setPackageDiagnoser(diagnose)
    setPyodideLoader(async () => {
      const runtime = stubRuntime([])
      runtime.loadPackagesFromImports = async (_code, options) => {
        options?.errorCallback?.('network is down')
      }
      return runtime
    })
    const error = await (async () => {
      try {
        await runPython('import pandas', createRecordingBridge(), { drive: false })
      } catch (caught) {
        return caught as PyRuntimeError
      }
      throw new Error('本该抛 PyRuntimeError')
    })()
    expect(error.message).toContain('network is down')
    expect(diagnose).not.toHaveBeenCalled()
  })
})

describe('packageFailureMessage：hint 只替尾句，不动前半句', () => {
  it('没给 hint 时保持原样（宿主代取那条路上这句是真的）', () => {
    const message = packageFailureMessage([
      'The following error occurred while loading scipy:',
      'TypeError: Failed to fetch',
    ])
    expect(message).toContain('（scipy）')
    expect(message).toContain('TypeError: Failed to fetch')
    expect(message).toContain('之后离线也能用')
  })

  it('给了 hint 就整句换掉', () => {
    const message = packageFailureMessage(
      ['The following error occurred while loading scipy:', 'TypeError: Failed to fetch'],
      '连不上 /pyodide/：这个地址必须真能打开。',
    )
    expect(message).toContain('（scipy）')
    expect(message).not.toContain('之后离线也能用')
    expect(message.endsWith('这个地址必须真能打开。')).toBe(true)
  })

  it('hint 为 null（诊断器问不出来）等同于没给', () => {
    const failures = ['The following error occurred while loading scipy:', 'boom']
    expect(packageFailureMessage(failures, null)).toBe(packageFailureMessage(failures))
  })
})
