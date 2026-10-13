/**
 * 供给线（Host 半边）的离线不变量：lock 目录化不许缺摘要、按名找文件要过归一化。
 * 下载 / 缓存落盘的联网路径不在这里打桩重测——那部分由 dsh-manim-live 的路由测试
 * （HTTP 层）继续钉着，两层各管各的边界。
 */
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { dirname, join as joinPath } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { createPyodideSupply } from './supply.ts'

const REPO_DIR = joinPath(dirname(fileURLToPath(import.meta.url)), '..', '..')
const PYODIDE_DIR = joinPath(REPO_DIR, 'assets', 'pyodide')
const supply = createPyodideSupply({ pyodideDir: PYODIDE_DIR })

describe('lock 目录化', () => {
  it('可下载目录里每条都带着 lock 的 sha256——缺一个字段，预缓存就会「每次都失败」且看不出为什么', () => {
    // 曾经 CATALOG 映射时漏了 sha256，于是下载校验的期望值恒为 undefined、每次预缓存
    // 都必然「校验不过」，报错只说「期望 undefined」。而当时唯一的校验用例只验了
    // 「对不上要报错」——它当然也过，因为 undefined 与任何摘要都对不上。
    const lock = JSON.parse(readFileSync(join(PYODIDE_DIR, 'pyodide-lock.json'), 'utf8')) as {
      packages: Record<string, { file_name: string; sha256: string }>
    }
    const digestOf = new Map(Object.values(lock.packages).map((entry) => [entry.file_name, entry.sha256]))
    // 数量对上：目录就是 lock 里有 whl / zip 产物的那些（别写死数字）
    const downloadable = Object.values(lock.packages).filter((entry) => /\.(whl|zip)$/u.test(entry.file_name))
    expect(supply.catalog).toHaveLength(downloadable.length)
    const broken = supply.catalog.filter((entry) => entry.sha256 !== digestOf.get(entry.fileName))
    expect(broken.map((entry) => entry.name)).toEqual([])
  })

  it('依赖先归一化再落成目录键：depends 里不会出现目录解析不到的名字', () => {
    const names = new Set(supply.catalog.map((entry) => entry.name))
    const broken = supply.catalog.flatMap((entry) => entry.depends.filter((ref) => !names.has(ref)))
    expect(new Set(broken)).toEqual(new Set())
  })

  it('digestOf 与目录一一对应；目录外的名字没有摘要（路由层据此 404）', () => {
    for (const entry of supply.catalog) {
      expect(supply.digestOf(entry.fileName)).toBe(entry.sha256)
    }
    expect(supply.digestOf('definitely-not-a-file.whl')).toBeUndefined()
  })
})

describe('filesForNames：按名挑缓存文件', () => {
  it('名字任一写法都对得上，不在缓存里的静默跳过', () => {
    const cacheDir = mkdtempSync(join(tmpdir(), 'manim-live-supply-'))
    const pillow = supply.catalog.find((entry) => entry.name === 'pillow')
    expect(pillow).toBeDefined()
    writeFileSync(join(cacheDir, pillow!.fileName), 'x')
    // 大小写 / 下划线写法都落到同一个文件；不在缓存里的 pandas 不出现在结果里
    expect(supply.filesForNames(cacheDir, ['Pillow', 'pandas'])).toEqual([pillow!.fileName])
  })

  it('目录没建过 = 没缓存过，回空表（不是错）', () => {
    expect(supply.filesForNames(join(tmpdir(), 'manim-live-supply-none'), ['pillow'])).toEqual([])
  })
})
