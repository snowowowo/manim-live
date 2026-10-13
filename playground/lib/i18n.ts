// 页面上的字。集中在这里而不是散在组件里——理由很实际：这一页要讲的是「核心包能独立跑」，
// 文案里到处都是「零框架」「自托管 Pyodide」这类口径，散着写必然会各处漂移。
//
// 为什么不用插件那套 `t(key)` 查表：那边是宿主 locale 注入（键是字符串、返回值要做缺省回退），
// 这一页是自立的单语页。**直接导出带类型的一棵树**，`T.renderAll` 拼错了当场编译不过，
// 比运行时回退到 `undefined` 好；将来要加语言，把 zh 换掉即可（带参数的几条是函数，不是占位符）。
//
// 约定：说明性的长文案一律进 `*Hint`，挂在悬浮提示上；页面上只留控件本身。
export const T = {
  title: 'manim-live · playground',
  lead:
    '真浏览器里跑真 Python + 真 manim-web——这一页是核心包 API 的第二个消费者（第一个是 DSH 插件），' +
    '用的渲染路径与插件里的聊天卡片完全同一条。页面本身用 React + Tailwind，' +
    '但那只是演示页的选择：核心包零框架依赖，换 Vue / Svelte / 裸 DOM 同样能接。',

  // ---- 顶栏 ----
  layoutLabel: '版式',
  layoutList: '清单',
  layoutListHint: '竖向分组清单：左侧一列，按分组折叠，组头带 N/M 与失败数',
  layoutGallery: '平铺',
  layoutGalleryHint: '语料平铺成网格：一眼看全一组，靠缩略图与状态色定位',
  layoutDocs: '文档',
  layoutDocsHint: '文档式三栏：左导航 · 中正文（说明 / 源码 / 截图）· 右活画布',

  themeLabel: '主题',
  themeDark: '暗',
  themeLight: '亮',

  navLabel: '分节',
  navHint:
    '按使用方式分两组：工作台四件事都要画布；运行环境是一页不要画布的读数台。' +
    '不与文档站一一对应——文档讲 API，这里讲怎么用。',
  navGroupWork: '工作台',
  navGroupDiag: '诊断',
  viewCorpus: '语料',
  viewFree: '自由代码',
  viewSession: '会话',
  viewPlayback: '时间轴',
  viewEnv: '运行环境',

  // ---- 自由代码（吸收了旧「渲染器」节的 check；warmup/indexURL 的读数在「运行环境」节） ----
  freeSectionHint:
    '写一段 Manim Python 的完整工作流：预检（check()，干跑、不碰画布）→ 渲染（run，每次一块新画布）→' +
    '导出（收集模式排时间轴，交给 manim-web 的导出器逐帧出图）。onLoading 的活演示也在这：' +
    '代码里写个 import pandas，取包遮罩与状态行就是它的真实回调。',
  freeCheckBtn: '预检',
  freeCheckOk: '预检通过',
  freeCheckFail: (message: string) => `预检未过：${message}`,
  freeCheckEmpty: '写一段代码再预检',

  // ---- 运行环境节（合并旧「环境状态」，收下预热控制；四块卡片同页）----
  envSectionHint:
    '一页不要画布的读数台，四块各说各的事实：environmentStatus() 读页面内状态（浏览器能力 / ' +
    'Pyodide 运行时 / KaTeX / 按需取包，onEnvironmentStatus 订阅变化）；本机探测真跑命令问装没装；' +
    '包库存读 Node 侧缓存清单；Node 干跑经 dev-api 真调 manim-live/node。' +
    '每一格都是真数据或真按钮的结论——没有一格是纯说明文字。',
  envWarmTitle: 'Pyodide 运行时',
  envWarm: '运行时',
  envWarmupNow: '重新预热',
  envStatusTitle: '环境状态 · environmentStatus()',
  envStatusSubscribed: 'onEnvironmentStatus 已订阅',
  statusRefresh: '重新读一遍',
  statusBrowser: '浏览器能力',
  statusRuntime: 'Pyodide 运行时',
  statusKatex: 'KaTeX 样式',
  statusFetch: '按需取包',

  // ---- 导出（自由代码节的动作组；2026-10-13 起是逐帧导出，不再是录屏）----
  exportProbeBtn: '探测导出器 probe()',
  exportProbeReady: (note: string) => `可用：${note}`,
  exportRunBtn: '导出（逐帧）',
  exportCancelBtn: '取消（signal.abort）',
  exportNeedRender: '先渲染一次，画布上有东西才值得导',
  exportLogTitle: '过程播报（onProgress）',
  exportCancelled: '已取消导出',

  // ---- 运行环境节的后三块（经 vite 开发中间件真跑 Node 入口）----
  machineTitle: '本机探测 · probePlan / probeCheck',
  machineHint:
    '跑真命令问这台机器装了没有：计划秒回（只列要测什么），每项一条探测。经 playground 的 vite 中间件调核心包 Node 入口——与 DSH 插件里的那条路由同一份实现。',
  machinePlanBtn: '取探测计划',
  machineProbeAll: '逐项跑一遍',
  machineRunning: '探测中…',

  packagesTitle: '包库存 · createPyodideSupply',
  packagesHint:
    '按需包的供给线（清单 / 预缓存 / 清缓存）的 Node 侧——经 vite 中间件挂在开发机上：随包目录 + corpus/pyodide-cache 就是它的两个目录。',
  packagesInventoryBtn: '读包清单',
  packagesCacheBtn: '取这个包',
  packagesStateBundled: '随包',
  packagesStateCached: '已缓存',
  packagesStateAbsent: '缺（要用得联网）',

  nodeTitle: 'Node 干跑 · runPython + createDryRunBridge',
  nodeHint:
    'manim-live/node 的 runPython + createDryRunBridge：不开画布、不碰 DOM，直接在 Node 里把代码干跑一遍——DSH 插件里工具预检用的就是这条。',
  nodeCheckBtn: '在 Node 里干跑',


  switchedSection: '已切换分节（上一节的画面与错误已清）',
  replay: '重播',
  replayHint: 'surface.replay()：作废当前画布、建一块新的，把同一段代码从头真播一遍（会换 canvas 元素，这是它的契约）。',
  replayNone: '先渲染一次再重播',
  replayRunning: '重播中…',
  replayDone: '重播完成',
  replayFailed: '重播失败',
  surfaceState: 'surface 读数',
  commonRunning: '执行中…',
  commonFailed: (message: string) => `失败：${message}`,

  // ---- 会话视图（surface.createSession：黑板的「边讲边加」用的这一层）----
  sessionTitle: '会话 · 分步追加',
  sessionHint:
    '对应 surface.createSession()：顶层语句一段一段追加，变量跨段保留、失败自动回滚。' +
    '开会话 = 建会话（画布复位）；预检 = check()（毫秒级干跑，不碰画布）；追加 = append()（上画布，失败回滚）；结束 = dispose()。',
  segmentLabel: '这一段（顶层语句）',
  sessionOpen: '开会话',
  sessionOpenAgain: '重开会话',
  sessionCheckBtn: '预检',
  sessionAppendBtn: '追加',
  sessionEndBtn: '结束会话',
  sessionReady: '会话已开，写一段追加试试（变量跨段保留）',
  sessionOpenFail: '开会话失败',
  sessionNone: '还没有会话——先点「开会话」',
  sessionChecking: '预检中…',
  sessionCheckOk: '预检通过',
  sessionCheckFail: '预检未过',
  sessionAppending: '追加执行中…',
  sessionAppended: (n: number) => `已入档，共 ${n} 步`,
  sessionAppendFail: '追加失败（已自动回滚）',
  sessionEnded: '会话已结束',
  sessionCount: (n: number) => `已提交 ${n} 段`,
  sessionSourceLabel: 'source() 投影（已提交段的文件形态）',
  sessionEmptyStage: '开会话后，画布在这里一步步长出来',

  // ---- 时间轴视图（surface.createPlayback：整段收集、帧级回看）----
  timelineTitle: '时间轴 · 整段收集',
  timelineHint:
    '对应 surface.createPlayback()：整段代码收进一条时间轴（不实时播），收完可拖到任意时刻、逐帧步进。' +
    '回看是按时刻重算，不是录像；没有动画的语句（set_color 这类）在收集时立即生效，往回拖跨过它们不还原。',
  timelineBuild: '收集时间轴',
  timelineBuilding: '正在收集时间轴…',
  timelineBuilt: (d: number) => `时间轴就绪：共 ${d.toFixed(1)} 秒`,
  timelineBuildFail: '收集失败',
  timelinePlay: '播放',
  timelinePause: '暂停',
  timelinePrev: '上一帧',
  timelineNext: '下一帧',
  timelineSeek: '定位时刻',
  timelineEmptyStage: '点「收集时间轴」，然后拖动、逐帧回看',

  searchPlaceholder: '搜标题 / id / 文件名…',
  searchClear: '清空搜索',
  searchEmpty: '没有匹配的语料',
  filterLabel: '筛选',
  filterAll: '全部',
  filterPending: '未跑',
  filterFailed: '未通过',
  filterPassed: '已通过',

  warmup: '正在预热 Pyodide…（首次要下载运行时）',
  ready: '就绪',
  readyHint: '——点「渲染」，或从左侧挑一条语料。',
  warmupDone: 'Pyodide 已就绪',
  warmupFailed: '预热失败',
  corpusEmpty: '没找到语料',
  corpusEmptyHint: '先在包根跑一次 pnpm install——语料在 corpus/examples/ 下，随仓库检出带着。',
  corpusBroken: '语料读不了',

  // ---- 工具条 ----
  renderAll: '全部渲染',
  renderAllHint:
    '依次渲染尚未通过的语料（已通过的跳过）。批量一律走极速——不等 run_time 与 wait，' +
    '否则两百多条要几分钟。中途点「停止」会停下，进度已经存下来了。',
  stopAll: '停止',
  stopAllHint: '停下这一轮渲染',
  copyReport: '复制结果',
  copyReportHint: '复制成一份回执：每条的文件路径、结果、报错与源码',
  copyReportDone: '已复制到剪贴板',
  copyReportEmpty: '还没有结果',
  clearRecord: '清除记录',
  clearRecordHint: '清掉已保存的渲染结果与自定义代码，下次从头开始（人工标注不动）',
  fastOn: '极速',
  fastHint:
    '极速：不等 run_time 与 wait，直接落到终态。跑全套语料用；看动画过程请关掉。' +
    'updater 驱动的轨迹仍会被推进，不会变成空的。',
  clearCache: '清除已下载的库',
  clearCacheHint:
    '把 Pyodide 缓存里已经下载的第三方库删掉。想再看一次「首次下载」的过程用它；' +
    '已经加载进当前页面的库要刷新页面才会卸掉。',
  runGroup: '渲染本组',
  runGroupHint: '按顺序渲染这一组里尚未通过的语料（走极速，不等动画）',
  collapseGroup: '收起分组',
  expandGroup: '展开分组',
  netBadge: '需联网',
  rejectBadge: '应被拒',
  browserBadge: '仅浏览器',

  // ---- 进度 ----
  countIdle: '尚未跑过',
  count: (passed: number, failed: number, total: number): string =>
    `${passed} / ${total} 通过 · ${failed} 失败`,
  batchProgress: (done: number, total: number): string => `${done} / ${total}`,
  marksCount: (passed: number, failed: number): string => `人工 ✓${passed} ✗${failed}`,

  // ---- 右侧预览 ----
  expectLabel: '预期',
  expectHint: '这条语料应该看到什么。自动结果只说明「没炸」；画得对不对，要对着这句话看。',
  expectMissing: '（这条语料还没写预期表现——对照 Manim 文档与常识核）',
  markTitle: '人工验证',
  markHint: '看完动画手动标一下对不对。标注单独保存（刷新还在），可单独清除，不影响自动渲染结果。',
  markPass: '对',
  markFail: '不对',
  markUnmark: '清除本条标注',
  marksClear: '清除人工标注',
  marksClearHint: '清掉全部人工验证标注（自动渲染结果不动）',
  previewEmpty: '从左边的语料里点一条，或切到「自定义代码」写一段——结果出现在这里。',
  rendering: '渲染中…',
  renderingFast: '极速落终态…',
  loadingPackages: (names: string): string =>
    `正在取包：${names}…（首次用到要联网，之后就存在本机了）`,
  noStage: '画布还没挂上——先把页面切到语料视图再试',
  renderDone: (fast: boolean): string => `渲染完成（${fast ? '极速' : '真时序'}）`,
  renderFailed: '渲染失败',
  checkFailed: '预检未通过',
  stopped: '已停止',
  timeout: '渲染超时（60 秒没有返回）',
  cancelled: '已作废',
  render: '渲染',
  renderHint: '重新渲染当前这条（内容会自动保存，下次进来还在）',
  rerun: '重跑',

  // ---- 上次截图 / 上一轮真机结果 ----
  shotLabel: '上次截图',
  shotHint:
    '这条语料上一次真渲染出来的画面，由 scripts/shot-corpus.mjs 落盘、与语料同名存放在 corpus/shots/ 下。' +
    '自动结果只说「没炸」、预期只说「应该长什么样」，中间那一步——画面到底对不对——看这张图；' +
    '重跑截图脚本会覆盖同名文件，所以这里永远是当前这版。点开可看原尺寸（1280×720）。',
  shotMissing: '还没截过图',
  lastRunLabel: '上一轮真机结果',
  lastRunHint:
    '上一次全量截图时这条的真实结果（来自 corpus/shots/index.json，同一次真机跑出来的）。' +
    '它读的是盘上的记录，不是刚刚这次——两边对不上，往往正是「改了代码但没重截」。',
  lastRunOk: '通过',
  lastRunFail: '未通过',
  inkLabel: (percent: string): string => `墨迹 ${percent}`,

  // ---- 自由代码 ----
  sourceTitle: '自定义代码',
  sourceHint:
    '优先写完整的 Manim Python 文件（from manim import * + class X(Scene): def construct(self): …）；' +
    '只写 construct 体也收。标准 Python 3 语法都可用。',
  freeLabel: '自定义代码',
  clearCode: '还原起手样本',
  clearCodeHint: '把编辑器内容换回起手样本（当前的会被覆盖）',

  // ---- 导出（2026-10-13 起逐帧，不再是录屏）----
  exportVideo: '导出（逐帧）',
  exportHint:
    '收集模式把当前代码跑一遍、排进时间轴，交给 manim-web 自带的导出器逐帧出图' +
    '（WebCodecs 优先，退 MediaRecorder）——可复现，不受实时掉帧影响。',
  exportRecording: '正在排时间轴并逐帧编码…',
  exportProbing: '正在检查这台浏览器能不能导…',
  exportMissing: (missing: string): string => `这台浏览器导不了：缺少 ${missing}`,
  exportFailed: (message: string): string => `导出失败：${message}`,
  exportDone: (name: string, mime: string): string => `已导出 ${name}（${mime}）`,
  exportNotBlob: '这个接入者返回的不是浏览器可下载的结果',
  exportNoSurface: '编辑器里有代码才谈得上导',

  // ---- 文档版式 ----
  docPath: '文件',
  docGroup: '分组',
  docId: '条目 id',
  docSource: '源码',
  docMarks: '人工标注',
  docsNav: '语料导航',
}

export type Wording = typeof T
