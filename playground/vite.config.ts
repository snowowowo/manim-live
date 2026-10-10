// playground 的构建配置：**零框架**，裸 import 核心包源码。
//
// 它有两个身份（顶层设计 §8.4）：
//   · 开发期——真机验证台：有一类 bug 只在真浏览器存在（KaTeX 字形、真 WebGL、真 DOM），`pnpm test` 绿不代表没坏；
//   · 后期——文档 / 演示页：「活文档」，文档里能跑的示例就是这里在跑的。
//
// **不进 npm 产物**（根 package.json 的 `files` 白名单不含 playground/），它单独部署。
// 它就是「零框架可用」的活证明：这里是核心包 API 的第二个消费者（第一个是 DSH 插件）。
import { existsSync, readFileSync, statSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, type Plugin } from 'vite'

const here = fileURLToPath(new URL('.', import.meta.url))
const pkgRoot = resolve(here, '..')

/**
 * 把开发期的静态资源挂成路由：
 *   /pyodide/*  → <包根>/assets/pyodide/*   （Pyodide 本体与随包 wheel）
 *   /katex/*    → <包根>/assets/katex/*
 * 资源不在核心包里（随插件发，见顶层设计 §2.4），所以用软链接过来（scripts/setup-assets.mjs）。
 * 这么挂在页面上正好演示「自托管 Pyodide」那条路——`pyodideIndexURL: '/pyodide/'`。
 */
function assetRoutes(): Plugin {
  const table: Array<[string, string]> = [
    ['/pyodide/', join(pkgRoot, 'assets', 'pyodide')],
    ['/katex/', join(pkgRoot, 'assets', 'katex')],
  ]
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
  }
  return {
    name: 'manim-live:dev-assets',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = request.url ?? ''
        for (const [prefix, base] of table) {
          if (!url.startsWith(prefix)) continue
          const name = decodeURIComponent(url.slice(prefix.length).split('?')[0] ?? '')
          if (name.includes('..')) return next()
          const file = join(base, name)
          if (!existsSync(file) || !statSync(file).isFile()) {
            response.statusCode = 404
            response.end()
            return
          }
          response.setHeader('content-type', MIME[extname(file)] ?? 'application/octet-stream')
          response.end(readFileSync(file))
          return
        }
        next()
      })
    },
  }
}

export default defineConfig({
  root: here,
  plugins: [assetRoutes()],
  server: {
    port: 5173,
    // 允许读到包根（核心包源码 + _dev 的语料）
    fs: { allow: [pkgRoot] },
  },
  resolve: {
    alias: {
      // 裸 import 核心包**源码**：改一处立刻热更，不必先 pnpm build
      'manim-live': join(pkgRoot, 'src', 'index.ts'),
    },
  },
})
