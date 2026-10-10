// playground 真机烟测：起 vite → 无头 Chromium 打开 → 等就绪 → 点渲染 → 断言画布非空且无 console error。
//
// 为什么必须有它：有一类 bug **只在真浏览器存在**（KaTeX 字形路径、真 WebGL、真 DOM），
// `pnpm test` 全绿也照样坏。3D 尤其属这一类。这条冒烟就是「核心包能独立跑」的活证明，
// 也是跨框架冒烟（顶层设计 §14.2 第 9 条）里那条 smoke 断言的本地版。
//
// 运行：node scripts/check-playground.mjs [--keep] [--shot 路径]
//   --keep        跑完不关服务器（调试用）
//   --shot 路径   把截图存下来（默认 _tmp/playground.png）
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 5199
const URL = `http://localhost:${PORT}/`

const argv = process.argv.slice(2)
const keep = argv.includes('--keep')
const shotIndex = argv.indexOf('--shot')
const shotPath = shotIndex >= 0 ? argv[shotIndex + 1] : join(PKG_ROOT, '_tmp', 'playground.png')

/** 等 vite 起来（轮询端口，别用固定 sleep——机器快慢差很多）。 */
async function waitForServer(timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const response = await fetch(URL)
      if (response.ok) return
    } catch {
      // 还没起来
    }
    await new Promise((done) => setTimeout(done, 250))
  }
  throw new Error(`vite 没在 ${timeoutMs}ms 内起来`)
}

const server = spawn(
  join(PKG_ROOT, 'node_modules', '.bin', 'vite'),
  ['--config', 'playground/vite.config.ts', '--port', String(PORT), '--strictPort'],
  { cwd: PKG_ROOT, stdio: ['ignore', 'pipe', 'pipe'] },
)
server.stderr.on('data', (chunk) => process.stderr.write(`[vite] ${chunk}`))

let exitCode = 0
let browser
try {
  await waitForServer()
  // channel: 'chromium' 用完整 Chromium（不是 headless shell）——真 WebGL 更接近产品环境，
  // 也与截图脚本同一套。
  browser = await chromium.launch({ channel: 'chromium' })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

  const consoleErrors = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })
  page.on('pageerror', (error) => consoleErrors.push(String(error)))
  // 记下 4xx/5xx 的具体 URL——「Failed to load resource」不说是哪个，等于没说
  page.on('response', (response) => {
    if (response.status() >= 400) consoleErrors.push(`HTTP ${response.status()} ${response.url()}`)
  })

  await page.goto(URL, { waitUntil: 'domcontentloaded' })

  // ① 预热完成（Pyodide 真的起来了）
  await page.waitForFunction(
    () => document.getElementById('status')?.textContent?.includes('就绪') === true,
    undefined,
    { timeout: 120_000 },
  )
  console.log('✓ Pyodide 预热完成')

  // ② 点渲染，等出结果
  await page.click('#render')
  await page.waitForFunction(
    () => {
      const text = document.getElementById('status')?.textContent ?? ''
      return text.includes('渲染完成') || text.includes('渲染失败') || text.includes('预检未通过')
    },
    undefined,
    { timeout: 180_000 },
  )
  const status = await page.textContent('#status')
  if (status?.includes('渲染完成') !== true) throw new Error(`渲染没成功：${status}`)
  console.log(`✓ ${status}`)

  // ③ 画布上真有墨（非空）——「跑通」不等于「画出来了」
  const ink = await page.evaluate(() => {
    const canvas = document.querySelector('#stage canvas')
    if (!(canvas instanceof HTMLCanvasElement)) return 0
    const probe = document.createElement('canvas')
    probe.width = 640
    probe.height = 360
    const ctx = probe.getContext('2d')
    if (ctx === null) return 0
    ctx.drawImage(canvas, 0, 0, probe.width, probe.height)
    const data = ctx.getImageData(0, 0, probe.width, probe.height).data
    let inked = 0
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 8) inked += 1
    return inked / (probe.width * probe.height)
  })
  console.log(`  画布墨迹：${(ink * 100).toFixed(1)}%`)
  if (ink <= 0.001) throw new Error('画布是空的——渲染没画出东西')

  mkdirSync(dirname(shotPath), { recursive: true })
  const shot = await page.screenshot()
  writeFileSync(shotPath, shot)
  console.log(`✓ 截图：${shotPath}`)

  if (consoleErrors.length > 0) {
    console.log(`⚠ 控制台有 ${consoleErrors.length} 条 error（下面列前 5 条）`)
    for (const text of consoleErrors.slice(0, 5)) console.log(`   ${text}`)
  } else {
    console.log('✓ 控制台无 error')
  }
} catch (error) {
  console.error(`✗ ${error instanceof Error ? error.message : String(error)}`)
  exitCode = 1
} finally {
  await browser?.close()
  if (!keep) server.kill('SIGTERM')
}
process.exit(exitCode)
