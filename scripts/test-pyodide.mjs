// 测试用的 Pyodide 装载器：把随包 wheel 先铺进一个临时缓存目录，再用它当 packageCacheDir。
//
// 两条都是实测踩出来的，缺一不可：
//
// ① **必须给 packageCacheDir**：默认值就是 indexURL，不给的话按需下载的 wheel 会写进随包的
//    `assets/pyodide/`（实测：跑一次 import pandas 就多出 6 个 whl、约 21 MB，把发布产物弄脏）。
// ② **必须先铺随包 wheel**：packageCacheDir 一旦给出，Node 侧 Pyodide 就**只从那里读**、不再回看
//    indexURL —— 不铺的话连随包的 numpy / sympy 都被当成缺包去 CDN 取（实测输出
//    `Didn't find package sympy-…whl locally, attempting to load from …`），
//    一条用例从毫秒变 8 秒、还依赖联网。
//
// 三份运行时测试（runtime / headless / examples）共用这一份，免得各写各的又漂移。
// 命名空间把缓存目录按文件分开：vitest 默认并行跑多个文件，共用一个目录会有并发写入的竞争。
import { copyFile, link, mkdir, readdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

/** scripts/ → 本包根。 */
const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')

/**
 * 随包 Pyodide 目录。
 *
 * 注意：核心包**不带**资源（Pyodide 20 MB / KaTeX 1.2 MB 随插件发，见顶层设计 §2.4），
 * 所以这里默认找的是 `<包根>/assets/pyodide`——开发检出里它是指向插件 `assets/pyodide` 的**软链**
 * （`node scripts/setup-assets.mjs` 建；不复制那 20 MB）。想指到别处就设 `MANIM_PYODIDE_DIR`。
 */
export const PYODIDE_DIR = process.env.MANIM_PYODIDE_DIR?.trim() || join(PKG_ROOT, 'assets', 'pyodide')

/** 某份测试专用的缓存目录（临时目录，跑完不清理——第二次跑就是「缓存命中」那条路）。 */
export function testCacheDir(namespace) {
  return join(tmpdir(), `manim-live-test-pyodide-${namespace}`)
}

/** 把随包 wheel 在缓存目录里就位（硬链优先，跨卷退复制）。 */
export async function seedBundledPackages(cacheDir) {
  await mkdir(cacheDir, { recursive: true })
  const wheels = (await readdir(PYODIDE_DIR)).filter((name) => name.endsWith('.whl'))
  for (const name of wheels) {
    const source = join(PYODIDE_DIR, name)
    try {
      await link(source, join(cacheDir, name))
    } catch {
      await copyFile(source, join(cacheDir, name))
    }
  }
  return cacheDir
}

/**
 * 造一个指向随包 Pyodide 的装载器，交给 `setPyodideLoader`。
 * 随包件全部本地命中；语料里 `import` 了别的库时，Node 侧会回落官方 CDN 并缓存进这个临时目录。
 */
export function testPyodideLoader(namespace) {
  return async () => {
    const cacheDir = await seedBundledPackages(testCacheDir(namespace))
    const { loadPyodide } = await import(pathToFileURL(join(PYODIDE_DIR, 'pyodide.mjs')).href)
    return loadPyodide({ indexURL: PYODIDE_DIR, packageCacheDir: cacheDir })
  }
}
