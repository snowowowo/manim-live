// playground 的构建配置：React + Tailwind，裸 import 核心包源码。
//
// 它有两个身份（顶层设计 §8.4）：
//   · 开发期——真机验证台：有一类 bug 只在真浏览器存在（KaTeX 字形、真 WebGL、真 DOM），`pnpm test` 绿不代表没坏；
//   · 后期——文档 / 演示页：「活文档」，文档里能跑的示例就是这里在跑的。
//
// **页面的技术栈与它演示的东西无关**：这一页用 React + Tailwind，纯粹是因为演示页要讲版式与状态，
// 而核心包 `manim-live` 本身**零框架依赖**——React / Tailwind 全在 `devDependencies`，
// 不进 `dependencies` / `peerDependencies`，也不进 npm 产物（根 package.json 的 `files` 白名单不含 playground/）。
// 谁说「支持 React 才用 React」，就是让文档的技术栈去绑被文档的东西，反过来才是对的。
//
// 这一页仍是「核心包 API 的第二个消费者」（第一个是 DSH 插件）——只是它自己长得像个正常前端。
import { existsSync, readFileSync, statSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { devApi } from './dev-api.ts'
import { createPyodideMirror, readDigests, readVersion, type PyodideMirrorOptions } from './pyodide-mirror.ts'

const here = fileURLToPath(new URL('.', import.meta.url))
const pkgRoot = resolve(here, '..')

/**
 * Pyodide 按需包的回源落盘处。
 * **不能放进 `assets/`**：那一份是软链到插件仓的目录，把四十多 MB 缓存写进别人的仓库是越界。
 */
const PYODIDE_CACHE_DIR = join(pkgRoot, 'corpus', 'pyodide-cache')

const MIME: Record<string, string> = {
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.wasm': 'application/wasm',
  '.whl': 'application/octet-stream',
  '.zip': 'application/zip',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
  '.png': 'image/png',
}

/**
 * 把开发期的静态资源挂成路由：
 *   /pyodide/*  → <包根>/assets/pyodide/*   （Pyodide 本体与随包 wheel），**缺的按需回源**
 *   /katex/*    → <包根>/assets/katex/*
 *   /shots/*    → <包根>/corpus/shots/*       （语料截图，scripts/shot-corpus.mjs 落盘的）
 *
 * 这些资源不在核心包里（随插件发，见顶层设计 §2.4），所以用软链接过来（scripts/setup-assets.mjs）——
 * 这么挂在页面上正好演示「自托管 Pyodide」那条路（`pyodideIndexURL: '/pyodide/'`）。
 *
 * **只剩 `/pyodide/` 一条被接管成镜像**：自托管目录只随包了 numpy / sympy / mpmath 三个 wheel，
 * 而语料里 `net` / `combo` 两组还要 pandas / matplotlib / scipy / sklearn / statsmodels 这一串。
 * 浏览器侧 Pyodide 只认 `indexURL` 一个地址、**不回落 CDN**，缺的文件只会变成一句
 * `Failed to fetch`（成因与实测见 playground/pyodide-mirror.ts 的文件头）。所以缺的按 lock 的
 * sha256 回源取回、校验、落进 `corpus/pyodide-cache/`——口径与插件仓宿主那条路由**完全一致**。
 *
 * 顺带把「浏览器 HTTP 缓存」这一层也接上了，按**文件名钉没钉版本**分两档：
 *   · lock 登记的产物（wheel / openblas.zip）→ `immutable`：名字带版本、字节由 sha256 钉死，
 *     改内容必然改名，所以可以放心长期缓存；
 *   · 其余静态件（Pyodide 核心、katex、截图）→ `no-cache` + ETag：每次问一声，没改回 304。
 * 此前实测这两档**一个字节都没缓存**（`_tmp/probe-cache-layers.log`）：同一个 3 MB 的 numpy
 * 连取四次都是真下载、CDP 判定「从缓存来的」0 条，第二次开页面光核心件就要 13.29 MB；
 * 现在其中的小件都换成了一次 304（细节与「为什么 wasm 那 9.6 MB 还是重下」写在 sendNegotiated）。
 *
 * 截图走一条固定路由而不是用 glob 把每张图都 eager 进来：
 * 那样 188 张图会各自变成一个模块请求，而这里只需要两件事——**清单**（哪些存在，用非 eager 的
 * glob 取键就够了）与**一个稳定可点开的地址**（原尺寸看图要 `target="_blank"`，哈希过的资源名
 * 很难看，也不好贴进报告）。所以：清单由 glob 给，内容由这条路由给。
 */
function assetRoutes(): Plugin {
  const table: Array<[string, string]> = [
    ['/katex/', join(pkgRoot, 'assets', 'katex')],
    ['/shots/', join(pkgRoot, 'corpus', 'shots')],
  ]
  const pyodideDir = join(pkgRoot, 'assets', 'pyodide')
  const lockPath = join(pyodideDir, 'pyodide-lock.json')

  /**
   * 镜像与 digests 都随第一次请求才建：`pnpm setup:assets` 可能在这页起来之后才跑，
   * 而 digests 得读得到 lock 才有内容。早建只会把「目录还是空的」那一刻钉死。
   */
  let state: { mirror: ReturnType<typeof createPyodideMirror>; digests: Map<string, string> } | null = null
  function pyodideState(): NonNullable<typeof state> {
    if (state === null) {
      const digests = readDigests(lockPath)
      // 上游默认是官方 CDN；`MANIM_PYODIDE_UPSTREAM` 可以把它指到内网镜像去
      // （自建 CDN 的公司多半有这个需求），也方便验证「上游挂了」那条分支。
      const upstream =
        process.env.MANIM_PYODIDE_UPSTREAM ??
        `https://cdn.jsdelivr.net/pyodide/v${readVersion(lockPath, '0.27.7')}/full/`
      const options: PyodideMirrorOptions = {
        localDir: pyodideDir,
        cacheDir: PYODIDE_CACHE_DIR,
        upstream,
        digests,
        log: (text) => console.log(`[pyodide] ${text}`),
      }
      state = { mirror: createPyodideMirror(options), digests }
      console.log(
        `[pyodide] /pyodide/ = 随包目录 → ${PYODIDE_CACHE_DIR} → ${upstream}（lock 登记 ${digests.size} 个产物）`,
      )
    }
    return state
  }

  /** 解 URL 里的文件名；畸形转义不算命——返回 null 交回上层。 */
  function pickName(url: string, prefix: string): string | null {
    try {
      return decodeURIComponent(url.slice(prefix.length).split('?')[0] ?? '')
    } catch {
      return null
    }
  }

  /**
   * 发一份**版本不固定**的静态件：`no-cache` + ETag。
   *
   * 为什么核心件也要吃这一层——实测（`_tmp/probe-cache-layers.log`）：第 2 次开页面总共还传了
   * **13.29 MB**，其中 9.8 MB 是 `pyodide.asm.wasm`、2.3 MB 是 `python_stdlib.zip`、1.2 MB 是
   * `pyodide.asm.js`。加上这一层之后那三份里有两份变成 304（实收 0 字节），总计降到 9.6 MB。
   *
   * `no-cache` **不是**「不缓存」，而是「每次都得问一声」：改完刷新照样立刻看到新的（原来担心的
   * 正是这件事），没改就回 304、一个字节都不用传。ETag 从 `size` + `mtimeMs` 来——同一次会话里
   * 内容变了 mtime 必变，够用；也不用对着 10 MB 的 wasm 现算哈希。
   *
   * 剩那 9.6 MB 是**浏览器自己不肯存**，不是我们少给了头：Chrome 对单条响应有上限，跟着 profile
   * 的缓存容量走。隔离实测（`_tmp/probe-entry-size.mjs`，同一条路由、同样没缓存头、只差体积）：
   * 单独放 6 MiB 刷新时带 `If-None-Match`，单独放 7 MiB 起连这个头都不发——而 `pyodide.asm.wasm`
   * 是 9.64 MiB，正好在门外。（真实 profile 的缓存更大、上限也更高，多半整份都存得下。）
   *
   * 文件名钉版本、字节钉 sha256 的那些（lock 登记的产物）另走 immutable 那一档，见 servePyodide。
   */
  function sendNegotiated(file: string, request: IncomingMessage, response: ServerResponse): void {
    const info = statSync(file)
    const etag = `W/"${info.size.toString(16)}-${Math.floor(info.mtimeMs).toString(16)}"`
    response.setHeader('etag', etag)
    response.setHeader('cache-control', 'no-cache')
    if (request.headers['if-none-match'] === etag) {
      response.statusCode = 304
      response.end()
      return
    }
    response.setHeader('content-type', MIME[extname(file)] ?? 'application/octet-stream')
    response.end(readFileSync(file))
  }

  async function servePyodide(name: string, request: IncomingMessage, response: ServerResponse): Promise<void> {
    const { mirror, digests } = pyodideState()
    const hit = await mirror.resolve(name)
    if (hit === null) {
      // 不在随包目录、不在缓存、也不在 lock 登记表里。最常见的成因：`pnpm setup:assets` 没跑，
      // 或者请求的名字根本不是 Pyodide 发行的产物。
      console.warn(`[pyodide] 没有 ${name}：不在随包目录里，也不在 pyodide-lock.json 的登记表里`)
      response.statusCode = 404
      response.end()
      return
    }
    // 这条头是给诊断用的：一眼看出这份数据是随包的、上次缓存的、还是这轮回源的。
    response.setHeader('x-manim-live-pyodide', hit.source)
    // 缓存头的分寸：**只有 lock 登记过的产物**才 immutable——它们的文件名带版本、
    // 字节由 lock 的 sha256 钉死，改内容必然改名，所以这一层是安全的。
    // 核心件（pyodide.js / asm.wasm / python_stdlib.zip）走 no-cache + ETag：名字里没有版本，
    // 「改完就该看到新的」由每次协商来保证，代价只是没改时的一次 304。
    if (digests.has(name)) {
      response.setHeader('cache-control', 'public, max-age=31536000, immutable')
      response.setHeader('content-type', MIME[extname(name)] ?? 'application/octet-stream')
      response.end(hit.buffer)
      return
    }
    sendNegotiated(hit.path, request, response)
  }

  return {
    name: 'manim-live:dev-assets',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = request.url ?? ''

        if (url.startsWith('/pyodide/')) {
          const name = pickName(url, '/pyodide/')
          if (name === null) {
            response.statusCode = 400
            response.end()
            return
          }
          servePyodide(name, request, response).catch((error: unknown) => {
            // 回源失败 / 校验不过：明确报 502，**别伪装成 404**——
            // 404 到了浏览器里会被 SRI 折成一句 Failed to fetch，什么也说明不了。
            const text = error instanceof Error ? error.message : String(error)
            console.error(`[pyodide] ${text}`)
            response.statusCode = 502
            response.end(text)
          })
          return
        }

        for (const [prefix, base] of table) {
          if (!url.startsWith(prefix)) continue
          const name = pickName(url, prefix)
          if (name === null || name.includes('..')) return next()
          const file = join(base, name)
          if (!existsSync(file) || !statSync(file).isFile()) {
            response.statusCode = 404
            response.end()
            return
          }
          sendNegotiated(file, request, response)
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  root: here,
  // react 在 tailwind 之前：组件里写的类名要先辈出 JSX 来，Tailwind 才扫得到。
  plugins: [react(), tailwindcss(), assetRoutes(), devApi(pkgRoot)],
  server: {
    port: 5173,
    // 允许读到包根（核心包源码 + corpus 的语料与截图）
    fs: { allow: [pkgRoot] },
  },
  resolve: {
    alias: {
      // `@/` = playground 自己（shadcn 那套约定的位置）
      '@': here,
      // 裸 import 核心包**源码**：改一处立刻热更，不必先 pnpm build
      'manim-live': join(pkgRoot, 'src', 'index.ts'),
      // manim-web 0.36 的 dist 里有一处裸动态 import（讲义导出的可选依赖 pptxgenjs，上游用
      // try/catch 兜着）。依赖预打包（esbuild）不认源码里的 @vite-ignore 注释，会硬解析裸名——
      // 包没装就整页红屏（2026-10-13 升级时踩到；同族的 jspdf 上游打成了自己的 chunk，不碍事）。
      // alias 到占位桩：预打包解析得到东西，真取到时由桩抛错、上游 catch 转成它自己的提示。
      // 想真导 PPTX：`pnpm add -D pptxgenjs` 后删掉这条 alias（桩文件头也写了）。
      pptxgenjs: join(here, 'lib', 'optional-stub.ts'),
    },
  },
})
