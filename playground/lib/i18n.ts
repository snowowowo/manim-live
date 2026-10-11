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

  viewLabel: '视图',
  viewExamples: '语料',
  viewFree: '自定义代码',

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

  // ---- 导出（录屏） ----
  exportVideo: '导出（录屏）',
  exportHint:
    '用真实时间把当前画布从头录一遍，存成浏览器可下载的文件（webm）。' +
    '录的是实时过程，所以时长与动画一样长——极速档下没有过程可录，请先关掉极速。',
  exportRecording: '录屏中（实时，与动画等长）…',
  exportProbing: '正在检查这台浏览器能不能录…',
  exportMissing: (missing: string): string => `这台浏览器录不了：缺少 ${missing}`,
  exportFailed: (message: string): string => `导出失败：${message}`,
  exportDone: (name: string, mime: string): string => `已导出 ${name}（${mime}）`,
  exportNotBlob: '这个接入者返回的不是浏览器可下载的结果',
  exportNoSurface: '先渲染一条，有画面才谈得上录',

  // ---- 文档版式 ----
  docPath: '文件',
  docGroup: '分组',
  docId: '条目 id',
  docSource: '源码',
  docMarks: '人工标注',
  docsNav: '语料导航',
}

export type Wording = typeof T
