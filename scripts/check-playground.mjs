// playground 真机烟测：起 vite → 无头 Chromium 打开 → 等就绪 → 点渲染 → 断言画布非空且无 console error。
//
// 为什么必须有它：有一类 bug **只在真浏览器存在**（KaTeX 字形路径、真 WebGL、真 DOM），
// `pnpm test` 全绿也照样坏。3D 尤其属这一类。这条冒烟就是「核心包能独立跑」的活证明，
// 也是跨框架冒烟（顶层设计 §14.2 第 9 条）里那条 smoke 断言的本地版。
//
// 它认的 DOM 有四个：`#status`（等预热、等这一轮出结果）、`#render`（触发一次）、
// `#stage canvas`（量墨迹）、`.stage-skel`（极速档盖在画布上的骨架层）。
// **改版式不能丢这几个**——它们就是这条断言的全部抓手。另外还按无障碍名点了两个控件：
// 「极速」（两个同名的，取第一个）与左侧竖导航的分节名（「画布」「语料与测试台」，见 components/api-nav.tsx）。名字改了这里也要跟着改。
// 页面是 React 写的，但这一条与框架无关：换任何前端框架，只要这几个抓手还在、行为还对，它照样过。
//
// 运行：node scripts/check-playground.mjs [--keep] [--shot 路径]
//   --keep        跑完不关服务器（调试用）
//   --shot 路径   把截图存下来（默认 _tmp/playground.png）
import { spawn } from 'node:child_process'
import { mkdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const PORT = 5199
const URL = `http://localhost:${PORT}/`

/** 版式名 → 截图文件名用的英文短名（中文名进不了文件名也不便查找）。 */
const SLUG = { 清单: 'list', 平铺: 'gallery', 文档: 'docs' }

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

  // **让每次跑都从同一个起点开始。**
  //
  // playground 把结果 / 档位 / 主题 / 版式 / 自由代码全落 localStorage（这是对的功能），
  // 但同源同端口的上一轮会把它们留下来：上一次跑到最后停在全速档，这一轮一进来就是全速，
  // 于是「点极速，看骨架出现」变成「点极速，把它关掉」——断言莫名其妙地挂（实测踩过）。
  // 真机断言必须**幂等**：不清存储，它就在检验「上次跑剩下什么」。
  await page.addInitScript(() => window.localStorage.clear())

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

  /**
   * 画布上的墨迹比例：把 canvas 缩绘到一小块 2D 画布上，数非透明像素。
   *
   * 为什么不用截图比像素：「跑通」与「画出来了」是两件事，而这条判据要在**极速档**下也用
   * （那时画布上是终态、没有动画在跑）。直接读 WebGL 画布的绘制缓冲最省事，也不受骨架层遮挡影响
   * （骨架是压在画布**上面**的一层 DOM，不属于 canvas 自己的像素）。
   */
  const inkRatio = (size) => page.evaluate((edge) => {
    const canvas = document.querySelector('#stage canvas')
    if (!(canvas instanceof HTMLCanvasElement)) return -1
    const probe = document.createElement('canvas')
    probe.width = edge
    probe.height = Math.round(edge * 9 / 16)
    const ctx = probe.getContext('2d')
    if (ctx === null) return -1
    ctx.drawImage(canvas, 0, 0, probe.width, probe.height)
    const data = ctx.getImageData(0, 0, probe.width, probe.height).data
    let inked = 0
    for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 8) inked += 1
    return inked / (probe.width * probe.height)
  }, size)

  /** 等**这一轮**出结果（渲染完成 / 失败 / 预检未通过），返回状态文本。用 seq 消除时序歧义，见 ②。 */
  const waitTerminal = async () => {
    const from = Number(await page.getAttribute('#status', 'data-render-seq') ?? '0')
    await page.waitForFunction(
      (seq) => {
        const element = document.getElementById('status')
        if (element === null) return false
        if (Number(element.getAttribute('data-render-seq') ?? '0') <= seq) return false
        const text = element.textContent ?? ''
        return text.includes('渲染完成') || text.includes('渲染失败') || text.includes('预检未通过')
      },
      from,
      { timeout: 180_000 },
    )
    return (await page.textContent('#status')) ?? ''
  }

  /** 点左边清单里的一条语料（按标题子串找），等这一轮跑完，返回状态文本。 */
  const playExample = async (title) => {
    await page.locator(`button:has-text("${title}")`).first().click()
    return waitTerminal()
  }

  /** 极速开关（工具条与预览面板各有一个同名键，取第一个）。 */
  const fastToggle = page.getByRole('button', { name: '极速' }).first()
  const fastOn = async () => (await fastToggle.getAttribute('aria-pressed')) === 'true'
  /** 把极速拨到想要的那一档——**先读再决定点不点**，不做盲目的「点一下翻转」。 */
  const setFast = async (want) => {
    if ((await fastOn()) !== want) {
      await fastToggle.click()
      await page.waitForTimeout(200)
    }
  }

  // ① 预热完成（Pyodide 真的起来了）
  await page.waitForFunction(
    () => document.getElementById('status')?.textContent?.includes('就绪') === true,
    undefined,
    { timeout: 120_000 },
  )
  console.log('✓ Pyodide 预热完成')

  // ② 点渲染，等**这一轮**出结果。
  //
  // 为什么记一个序号而不是只等文本：页面上那句「渲染完成」可能是上一轮留下的，
  // 而「点下去 → 状态翻成『渲染中』」之间有一帧空档，轮询正好会读到旧值。
  // `#status` 上的 data-render-seq 每开始一次、每结束一次都 +1，于是「比我记下的那个大」
  // 就是「这一轮真的走完了」，不靠时序运气。
  const before = Number(await page.getAttribute('#status', 'data-render-seq') ?? '0')
  const clickedAt = Date.now()
  await page.click('#render')
  await page.waitForFunction(
    (from) => {
      const element = document.getElementById('status')
      if (element === null) return false
      if (Number(element.getAttribute('data-render-seq') ?? '0') <= from) return false
      const text = element.textContent ?? ''
      return text.includes('渲染完成') || text.includes('渲染失败') || text.includes('预检未通过')
    },
    before,
    { timeout: 180_000 },
  )
  const elapsed = Date.now() - clickedAt
  const status = await page.textContent('#status')
  if (status?.includes('渲染完成') !== true) throw new Error(`渲染没成功：${status}`)
  console.log(`✓ ${status}（${(elapsed / 1000).toFixed(1)}s）`)

  // ②b 「点一条就开演」的**延迟**回归网。
  //
  // 这条是冲着一个真踩过的坑立的：`render()` 返回的那个 Promise 与 `runJob()` 曾经互相等
  // 对方兑现，而它只有 `TIMEOUT_MS`（60 秒）的超时兜底能解开——于是每点一条都要干等
  // **63.7 秒**才开演（实测 63.7s / 63.5s，两条语料各一次）。用户看到的现象就是
  // 「点下去没反应」，而他报的「点击就应当自动测试播放」指的正是这个。
  //
  // 阈值取 20 秒：正常 2.5~4 秒，留五倍余量给慢机器，而那个 bug 的表现是 60 秒起步——
  // 绝不会漏。这一条比任何单测都有价值：它量的就是「用户按下去到看见东西」的真实时长。
  const SLOW_CLICK_MS = 20_000
  if (elapsed > SLOW_CLICK_MS) {
    throw new Error(`点一下到出结果花了 ${(elapsed / 1000).toFixed(1)}s（上限 ${SLOW_CLICK_MS / 1000}s）——像又落回超时兜底了`)
  }
  console.log(`✓ 点击响应：${(elapsed / 1000).toFixed(1)}s，远低于上限 ${SLOW_CLICK_MS / 1000}s`)

  // ③ 画布上真有墨（非空）——「跑通」不等于「画出来了」
  const ink = await inkRatio(640)
  console.log(`  画布墨迹：${(ink * 100).toFixed(1)}%`)
  if (ink <= 0.001) throw new Error('画布是空的——渲染没画出东西')

  // ④ 三种版式都过一遍，并断言**画布没被重建**。
  //
  // 这条断言是「三种版式共用同一块画布」的活证明：版式只换摆法，不该把画布拆了重来
  // （拆了的表现是「切一下版式，动画没了、要重跑一遍」）。判据用 DOM 节点身份——
  // canvas 还是同一个对象才算复用，光看「有没有 canvas」是看不出重建的。
  const hasCanvas = await page.evaluate(() => {
    const canvas = document.querySelector('#stage canvas')
    if (canvas === null) return false
    window.__probeCanvas = canvas
    return true
  })
  if (!hasCanvas) throw new Error('#stage 里没有 canvas')

  for (const layout of ['平铺', '文档', '清单']) {
    await page.getByRole('tab', { name: layout, exact: true }).click()
    await page.waitForTimeout(150)
    const survived = await page.evaluate(() => {
      const canvas = document.querySelector('#stage canvas')
      return canvas !== null && canvas === window.__probeCanvas
    })
    if (!survived) throw new Error(`切到「${layout}」版式后画布被重建了——版式不该动画布`)
    console.log(`✓ 版式「${layout}」：画布复用，没重建`)
    // 每种版式各留一张：改完版式对着图看，比在脑子里推快得多（存 _tmp/，不入库）
    mkdirSync(join(PKG_ROOT, '_tmp'), { recursive: true })
    writeFileSync(join(PKG_ROOT, '_tmp', `playground-${SLUG[layout]}.png`), await page.screenshot())
  }

  mkdirSync(dirname(shotPath), { recursive: true })
  const shot = await page.screenshot()
  writeFileSync(shotPath, shot)
  console.log(`✓ 截图：${shotPath}`)

  // ⑤ 极速档下画布上得有**骨架层**。
  //
  // 为什么值得断言：极速只是把动画时长压到 0，每个 play 仍然各画一帧——不盖住就会频闪出
  // 一串中间态（DSH 实验场为这件事专门做了一层骨架屏）。它不是装饰，是「极速看着像坏了吗」
  // 的答案。点极速开关会**立刻按新档位重跑当前这条**（见 use-playground 的契约 ②），
  // 所以骨架紧接着就该出现。
  // 先断言起点确实是关的：存储已清，这一条同时守住「清存储那步真的生效了」。
  if (await fastOn()) throw new Error('开局就不是真时序档——localStorage 没清干净，后面的档位断言全不可信')
  //
  // ⚠️ 骨架是个**瞬时**状态——极速渲染多快它就存在多久（小语料实测不到 300ms）。
  // 所以必须**先把观察架好、再触发**：反过来写（先点、再 waitForSelector）会在
  // 轮询第一次落地之前它就已经消失了，断言必挂（实测踩过，现场 dump 出来是
  // `skel:0 / status:"渲染完成（极速）"`——那一轮早跑完了）。
  // 顺带：这里直接点键而**不走 setFast 那个辅助**——辅助里有 `waitForTimeout` 与两次
  // 读属性往返，那几百毫秒足够让骨架过去了。
  const skeletonSeen = page.waitForSelector('.stage-skel', { timeout: 15_000 })
  await fastToggle.click()
  try {
    await skeletonSeen
  } catch {
    throw new Error('极速档下没看到骨架层——中间态会频闪出来')
  }
  console.log('✓ 极速档下盖了骨架层')
  // 跑完骨架该收掉，画布上要留下终态
  await page.waitForFunction(() => document.querySelector('.stage-skel') === null, undefined, { timeout: 180_000 })
  await page.waitForTimeout(200)
  const fastInk = await inkRatio(320)
  if (fastInk <= 0.001) throw new Error('极速档跑完画布是空的——骨架收掉了但没落终态')
  console.log('✓ 骨架收掉后画布上有终态画面')

  // ⑥ 预检没过时**不留画布**。
  //
  // 口径来自 DSH：那边「未通过预检」的卡片根本没有画布（头 + 说明就完了）。
  // 这里原来写反了顺序——先建画布再预检，于是台上留着一块不明所以的黑。
  await page.getByRole('tab', { name: '画布', exact: true }).click()
  // 代码框已换成 CodeMirror（见 components/code-editor.tsx 文件头契约）：往可编辑区里填。
  await page.locator('[aria-label="自定义代码"] .cm-content').fill('这是语法错(((  # 预检就该当场拒掉')
  // 序号**必须在点之前**读：点下去 `#status` 会先翻成「渲染中」并 +1，
  // 之后再读就成了一条永远够不到的门槛。
  const rejectFrom = Number(await page.getAttribute('#status', 'data-render-seq') ?? '0')
  await page.click('#render')
  await page.waitForFunction(
    (from) => {
      const element = document.getElementById('status')
      if (element === null) return false
      if (Number(element.getAttribute('data-render-seq') ?? '0') <= from) return false
      return (element.textContent ?? '').includes('预检未通过')
    },
    rejectFrom,
    { timeout: 120_000 },
  )
  const canvasLeft = await page.evaluate(() => document.querySelector('#stage canvas') !== null)
  if (canvasLeft) throw new Error('预检没过却仍在台上留了一块画布')
  console.log('✓ 预检未通过：不留画布，只留一句说得清的错')

  // ⑦ 「无限叠加」：第二次渲染必须换一块新画布。
  //
  // 用户报的现场是「点第一个播放，它不会清除；点第二个，会在原本第一个的基础上叠加，
  // 这样无限叠加下去」。根因是复用了同一块画布：manim-web 的 `Scene.clear()` 会连 3D 灯光
  // 一起摘掉（不能用来原地清空），适配层的 `Scene.__init__` 也不清场——于是 `self.add(...)`
  // 就是往上一幅画上继续加。DSH 卡片的解法是**每次 run 都新建一块画布**，这里照做。
  //
  // 两件事一起断言：
  //   ① 结构上——第二次渲染后 canvas 不是同一个 DOM 节点（复用 = 必然叠加）；
  //   ② 行为上——先渲一幅密的（坐标系 + 曲线）、再渲一幅疏的（一个圆）。若是复用旧画布往上加，
  //      疏的那幅画完，墨迹不会比密的少。
  await page.getByRole('tab', { name: '语料与测试台', exact: true }).click()
  await setFast(false) // 真时序下量墨迹：极速会把中间态压掉，画面反而更难比
  await playExample('坐标系 + 函数曲线')
  const denseInk = await inkRatio(640)
  await page.evaluate(() => { window.__probeCanvas = document.querySelector('#stage canvas') })
  await playExample('画一个圆')
  const swapped = await page.evaluate(() => {
    const canvas = document.querySelector('#stage canvas')
    return canvas !== null && canvas !== window.__probeCanvas
  })
  const lightInk = await inkRatio(640)
  console.log(`  叠加核对：密 ${(denseInk * 100).toFixed(1)}% → 疏 ${(lightInk * 100).toFixed(1)}%，画布${swapped ? '已换新' : '还是同一块'}`)
  if (!swapped) throw new Error('第二次渲染没换新画布——这正是「无限叠加」的成因')
  if (lightInk >= denseInk * 0.8) {
    throw new Error(`渲完一个圆还剩 ${(lightInk * 100).toFixed(1)}% 墨（密的那幅是 ${(denseInk * 100).toFixed(1)}%），像叠在上一幅上`)
  }
  console.log('✓ 不叠加：第二次渲染换了新画布，上一幅的墨一点没留')

  // ⑧ 导出（录屏）产出**非空**文件。
  //
  // 这条是冲着一个「不报错的错」立的：原来录出来的 `manim.webm` 是 **110 字节**，
  // 而全程没有一个异常——因为 `Surface.replay()` 会重建场景、**连带换掉 canvas 元素**，
  // 而录制流是在 `replay()` **之前**就 `captureStream()` 抓住旧 canvas 的。
  // 现在改成「先建一块新画布，再在这块上跑一遍」，录制期间 canvas 元素不变。
  //
  // 阈值 2 KB：正常 30 KB 上下，空文件是 110 字节——中间隔了三个数量级，不会误判。
  const downloadPromise = page.waitForEvent('download', { timeout: 180_000 })
  await page.getByRole('button', { name: '导出（录屏）' }).click()
  const download = await downloadPromise
  const exportFile = join(PKG_ROOT, '_tmp', 'check-export.webm')
  mkdirSync(join(PKG_ROOT, '_tmp'), { recursive: true })
  await download.saveAs(exportFile)
  const { size } = statSync(exportFile)
  console.log(`  导出：${download.suggestedFilename()}，${(size / 1024).toFixed(0)} KB`)
  if (size < 2048) throw new Error(`导出的文件太小，像没录上：${size} 字节`)
  console.log('✓ 导出（录屏）产出可下载的非空文件')
  await page.waitForFunction(
    () => (document.getElementById('status')?.textContent ?? '').includes('已导出'),
    undefined,
    { timeout: 60_000 },
  )

  // ⑨ 批量一组**不会卡在超时兜底上**。
  //
  // 同一个死锁的另一张脸：`runBatch` 里也是「`await render()` 之后才 `runJob()`」，
  // 所以每一组都要按「条数 × 60 秒」才算得完。这里跑最小的一组（语法综合，6 条），
  // 修好后是 2~3 秒，修前是 360 秒——阈值 90 秒足够分辨，也不怕慢机器。
  await setFast(true) // 批量固定走极速，页面上也先拨过去，免得首页那次「切档重跑」混进来
  const groupHead = page.locator('div').filter({
    has: page.getByRole('button', { name: '渲染本组' }),
  }).filter({ hasText: '语法综合（离线）' })
  const runThisGroup = groupHead.last().getByRole('button', { name: '渲染本组' })
  const batchStartedAt = Date.now()
  await runThisGroup.click()
  await page.waitForFunction(() => /通过 · \d+ 失败/.test(document.body.innerText), undefined, { timeout: 90_000 })
  const batchSecs = (Date.now() - batchStartedAt) / 1000
  const counter = await page.locator('span').filter({ hasText: /通过 · \d+ 失败/ }).first().textContent()
  console.log(`  批量（语法综合 6 条）：${batchSecs.toFixed(1)}s，工具条「${counter?.trim()}」`)
  if (batchSecs > 90) throw new Error(`一组 6 条跑了 ${batchSecs.toFixed(1)}s，像还在等超时兜底`)
  console.log('✓ 批量一组跑完，没卡在超时兜底上')

  // ⑩ 左侧竖导航的新分节：会话（createSession）端到端。
  //
  // 为什么纳入烟测：这两个分节是 playground「对文档里每个 API 负责」的落点，
  // 而单元回归只到核心包一层——页面接线（竖导航 → 面板 → pg 动作 → 状态行）是另一段会断的路。
  const waitStatusText = (needle, timeout = 120_000) => page.waitForFunction(
    (text) => (document.getElementById('status')?.textContent ?? '').includes(text),
    needle,
    { timeout },
  )
  await page.getByRole('tab', { name: '会话', exact: true }).click()
  await page.getByRole('button', { name: '开会话', exact: true }).click()
  await waitStatusText('会话已开')
  await page.locator('[aria-label="这一段（顶层语句）"] .cm-content').fill('dot = Dot(point=[-2, 0, 0], color=RED)\nself.add(dot)')
  await page.getByRole('button', { name: '追加', exact: true }).click()
  await waitStatusText('已入档')
  console.log('✓ 会话分节：开会话 → 追加入档')

  // ⑪ 时间轴回放分节（createPlayback）：收集 → 播放推进 → 逐帧读数。
  await page.getByRole('tab', { name: '时间轴回放', exact: true }).click()
  // 用**真机炸过的那段原样代码**（Axes + Create×2 + MathTex Write）：
  // 当时的报错是 `VGroup.setPoints: expected 443…got 886`（收集分支提前跑了「play 之后」的补丁）。
  const tlSample = [
    'ax = Axes(x_range=[-2, 2, 1], y_range=[-2, 2, 1])',
    'circle = Circle(radius=1)',
    'circle.move_to(ax.c2p(0, 0, 0))',
    'self.add(ax, circle)',
    'self.play(Create(ax), Create(circle))',
    'eq = MathTex(latex=["x^2", "+", "y^2", "=", "1"], font_size=34)',
    'eq.move_to(ax.c2p(0, 1.5, 0))',
    'self.play(Write(eq))',
  ].join('\n')
  await page.locator('[aria-label="时间轴 · 整段收集"] .cm-content').fill(tlSample)
  await page.getByRole('button', { name: '收集时间轴', exact: true }).click()
  await waitStatusText('时间轴就绪')
  await page.getByRole('button', { name: '播放', exact: true }).click()
  // 等时刻真的走起来（读数到 0.3 秒以上；toFixed(1) 粒度足够）
  await page.waitForFunction(() => {
    const text = document.getElementById('tl-time')?.textContent ?? ''
    return Number(text.split('/')[0]?.trim() ?? '0') > 0.3
  }, undefined, { timeout: 30_000 })
  const seeked = await page.textContent('#tl-time')
  console.log(`  时间轴：播放推进到 ${seeked?.trim()}`)
  if (seeked === null || seeked.trim().length === 0) throw new Error('时间轴读数没出来')
  console.log('✓ 时间轴回放分节：收集 → 播放推进（帧级读数在动）')

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
