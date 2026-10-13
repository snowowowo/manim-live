// playground 的「Node 侧 API」测试通道（仅开发期，挂在 vite 的中间件上）。
//
// 为什么要有它：文档站里「本机探测 / 包管理 / Node 入口」三页也是核心包的公开 API，而 playground
// **对文档里每一个 API 负责**——它们只能在 Node 里跑，vite 开发服务器正好就是 Node，把它当宿主
// 是最直接的「真环境」（与 DSH 插件里那几条路由是同一份实现，只是目录不同）。
//
// 路由（都在 /__pg/ 前缀下，不与真实业务路由相撞）：
//   GET  /__pg/machine/plan          → probePlan()（秒回：只列要测什么）
//   GET  /__pg/machine/probe?id=…    → probeCheck(id)（跑那一项真命令）
//   GET  /__pg/packages              → createPyodideSupply().inventory(cacheDir)
//   POST /__pg/packages/cache        → cachePackages(cacheDir, names)（按 lock 校验下载落盘）
//   POST /__pg/node/check  {code}    → runPython(code, createDryRunBridge()) 的结论（Node 干跑）
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join } from 'node:path'
import type { Plugin } from 'vite'
import {
  createDryRunBridge, createPyodideSupply, probeCheck, probePlan, runPython, setPyodideLoader,
} from '../src/node.ts'

function readBody(request: IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    request.on('data', (chunk: Buffer) => chunks.push(chunk))
    request.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    request.on('error', reject)
  })
}

function json(response: ServerResponse, status: number, value: unknown): void {
  response.statusCode = status
  response.setHeader('content-type', 'application/json; charset=utf-8')
  response.end(JSON.stringify(value))
}

const message = (error: unknown): string => (error instanceof Error ? error.message : String(error))

export function devApi(pkgRoot: string): Plugin {
  // 随包目录与缓存目录：与页面那侧（assetRoutes 的 /pyodide/ 镜像）是同一对——
  // 清单读的就是浏览器正在取的那批文件，缓存也落在同一个 corpus/pyodide-cache。
  const pyodideDir = join(pkgRoot, 'assets', 'pyodide')
  const cacheDir = join(pkgRoot, 'corpus', 'pyodide-cache')

  let supply: ReturnType<typeof createPyodideSupply> | null = null
  const getSupply = (): ReturnType<typeof createPyodideSupply> => (supply ??= createPyodideSupply({ pyodideDir }))
  let loaderInstalled = false

  return {
    name: 'manim-live:dev-api',
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        const url = request.url ?? ''
        if (!url.startsWith('/__pg/')) {
          next()
          return
        }
        void (async () => {
          try {
            if (url.startsWith('/__pg/machine/plan') && request.method === 'GET') {
              json(response, 200, probePlan())
              return
            }
            if (url.startsWith('/__pg/machine/probe') && request.method === 'GET') {
              const id = new URL(url, 'http://localhost').searchParams.get('id') ?? ''
              const result = await probeCheck(id)
              if (result === null) {
                json(response, 404, { error: `不认识的探测项 ${id}` })
                return
              }
              json(response, 200, result)
              return
            }
            if (url.startsWith('/__pg/packages/cache') && request.method === 'POST') {
              const body = JSON.parse(await readBody(request)) as { names?: unknown }
              const names = Array.isArray(body.names)
                ? body.names.filter((name): name is string => typeof name === 'string' && name.length > 0)
                : []
              if (names.length === 0) {
                json(response, 400, { error: 'names 不能为空' })
                return
              }
              json(response, 200, { results: await getSupply().cachePackages(cacheDir, names) })
              return
            }
            if (url.startsWith('/__pg/packages') && request.method === 'GET') {
              json(response, 200, getSupply().inventory(cacheDir))
              return
            }
            if (url.startsWith('/__pg/node/check') && request.method === 'POST') {
              const body = JSON.parse(await readBody(request)) as { code?: unknown }
              const code = typeof body.code === 'string' ? body.code : ''
              if (code.trim().length === 0) {
                json(response, 400, { error: 'code 不能为空' })
                return
              }
              if (!loaderInstalled) {
                // Node 干跑要一份 Pyodide：装载器只认随包目录 + 本地缓存（口径同插件宿主那条）。
                setPyodideLoader(getSupply().createNodeLoader(cacheDir))
                loaderInstalled = true
              }
              try {
                await runPython(code, createDryRunBridge())
                json(response, 200, { ok: true })
              } catch (error) {
                // 预检不通过是**结论**不是故障：200 + ok:false + 原因（与浏览器侧 check 同一纪律）。
                json(response, 200, { ok: false, error: message(error) })
              }
              return
            }
            json(response, 404, { error: '未知的 dev-api 路由' })
          } catch (error) {
            console.error(`[dev-api] ${url}:`, error)
            json(response, 500, { error: message(error) })
          }
        })()
      })
    },
  }
}
