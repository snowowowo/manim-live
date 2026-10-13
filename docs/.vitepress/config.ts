import { defineConfig } from 'vitepress'
import { fileURLToPath } from 'node:url'

// base 与部署地址对齐：仓库是 github.com/snowowowo/manim-live，项目页即
// https://snowowowo.github.io/manim-live/ 。换自定义域名（或改成 <user>.github.io
// 用户页）时改这一处即可——正文里的图片全是相对路径，vite 构建时自动带上 base。
const BASE = '/manim-live/'

// i18n 约定（写法照抄 dsh-plugin-template/docs 的 config.ts）：中文是源语言，放在
// 根目录；英文是本地化，放在 en/ 下且目录结构与中文一一对应。两侧只差语言，不差
// 内容——改了中文必须同步改英文。
export default defineConfig({
  base: BASE,
  title: 'manim-live',
  description: '在浏览器里用真 Python 跑 Manim 代码并渲出一幅画面——纯逻辑，零框架、零宿主。',
  // 图标放在 public/ 下。head 里的 href **不会**被自动加 base（它不走 markdown 链接改写），
  // 所以这里手动拼上——顺手把它绑到上面那个 BASE，免得两处各改一次。
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE}favicon.svg` }]],
  // README.md 是给「改文档的人」看的说明（怎么装依赖、base 在哪改），不是正文——别渲染成页面。
  srcExclude: ['README.md'],
  // 每页底部显示「上次更新」：取 git 提交时间。
  lastUpdated: true,

  // 示例页与首页的截图在仓根 corpus/shots/（docs/ 之外）。dev 下 vite 的 fs 白名单默认只放
  // docs/ 自己：解析不到就把相对 URL 原样留在页面上（一点就 404）。把仓根加进白名单，
  // dev 与 build 才能走同一条相对路径（build 不受白名单限制，已验）。
  vite: {
    server: {
      fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] },
    },
  },

  locales: {
    // 中文 = 源语言，页面在根目录。
    root: {
      label: '简体中文',
      lang: 'zh-CN',

      themeConfig: {
        // ⚠️ nav / sidebar 必须在 themeConfig 里。写在 defineConfig 顶层是无效的
        // ——不报错、也不出现，页面就是「既没顶部导航、又没左侧目录」（踩过）。
        nav: [
          { text: '指南', link: '/guide/installation', activeMatch: '^/guide/' },
          { text: '示例', link: '/examples/', activeMatch: '^/examples/' },
          { text: 'API', link: '/api/', activeMatch: '^/api/' },
        ],

        // 侧栏按路径分区：示例章 17 页单独一套，其余页面共用一套。VitePress 用
        // page.relativePath 做前缀匹配、键按段数从多到少排序，所以 '/examples/' 比
        // 兜底的 '/' 先命中；折叠组里若有当前页会自动展开。
        sidebar: {
          '/examples/': [
            { text: '示例画廊', link: '/examples/' },
            // 一页一个语料分组（17 组有截图）；子组顺序与 scripts/gen-examples-docs.mjs 的 SECTIONS 一致。
            {
              text: '基础与语法',
              collapsed: false,
              items: [
                { text: '基础几何', link: '/examples/basic' },
                { text: '构造器参数', link: '/examples/ctor' },
                { text: '方法与改写', link: '/examples/method' },
                { text: '坐标系与数据', link: '/examples/graph' },
                { text: '文字与公式', link: '/examples/text' },
                { text: '语法综合', link: '/examples/syntax' },
              ],
            },
            {
              text: '动画与场景',
              collapsed: false,
              items: [
                { text: '动画', link: '/examples/animate' },
                { text: '更新器与轨迹', link: '/examples/updater' },
                { text: '场景与分组', link: '/examples/scene' },
              ],
            },
            {
              text: '学科讲解',
              collapsed: true,
              items: [
                { text: '高等数学与数学分析', link: '/examples/math-calculus' },
                { text: '线性代数', link: '/examples/math-linear' },
                { text: '概率论与统计', link: '/examples/math-prob' },
                { text: '群论', link: '/examples/math-group' },
                { text: '离散数学', link: '/examples/math-discrete' },
                { text: '讲解场景（模板）', link: '/examples/lesson' },
              ],
            },
            {
              text: '支持面与第三方',
              collapsed: true,
              items: [
                { text: 'API 点名', link: '/examples/api' },
                { text: '综合场景（需联网）', link: '/examples/combo' },
              ],
            },
          ],
          '/': [
            // 信息梯度：开始 = 装好就能用；深入 = 集成细节与机制；API 参考 = 查阅；开发 = 改代码的人才需要。
            {
              text: '开始',
              items: [
                { text: '概述', link: '/guide/overview' },
                { text: '安装', link: '/guide/installation' },
                { text: '快速开始', link: '/guide/quick-start' },
              ],
            },
            {
              text: '深入',
              items: [
                { text: '框架集成', link: '/guide/frameworks' },
                { text: '行为契约', link: '/guide/contracts' },
                { text: '第三方包', link: '/guide/packages' },
                { text: 'Node 预检', link: '/guide/node' },
                { text: '支持面', link: '/guide/support' },
              ],
            },
            {
              text: 'API 参考',
              items: [
                { text: '总览与入口', link: '/api/' },
                { text: '渲染器', link: '/api/renderer' },
                { text: '画布', link: '/api/surface' },
                { text: '会话', link: '/api/session' },
                { text: '时间轴回放', link: '/api/playback' },
                { text: '钩子', link: '/api/hooks' },
              { text: '环境状态', link: '/api/status' },
                { text: '导出', link: '/api/export' },
                { text: '本机探测', link: '/api/machine' },
                { text: '包管理', link: '/api/packages' },
                { text: 'Node 入口', link: '/api/node' },
                { text: '语料与测试台', link: '/api/corpus' },
                { text: '低层导出', link: '/api/internals' },
              ],
            },
            {
              text: '开发',
              items: [{ text: '开发与调试', link: '/dev/' }],
            },
          ],
        },

        outline: { level: [2, 3], label: '本页目录' },
        sidebarMenuLabel: '目录',
        returnToTopLabel: '回到顶部',
        darkModeSwitchLabel: '外观',
        lastUpdated: { text: '上次更新' },
        docFooter: { prev: '上一页', next: '下一页' },

        search: {
          provider: 'local',
          options: {
            translations: {
              button: { buttonText: '搜索文档', buttonAriaLabel: '搜索文档' },
              modal: {
                noResultsText: '没有找到结果',
                resetButtonTitle: '清除',
                footer: { selectText: '选择', navigateText: '切换', closeText: '关闭' },
              },
            },
          },
        },
      },
    },

    // 英文 = 本地化，页面在 en/ 下，目录结构与中文一一对应。
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'manim-live',
      description: 'Run real Python Manim code in the browser and render a scene — pure logic, zero frameworks, zero host.',

      themeConfig: {
        nav: [
          { text: 'Guide', link: '/en/guide/installation', activeMatch: '^/en/guide/' },
          { text: 'Examples', link: '/en/examples/', activeMatch: '^/en/examples/' },
          { text: 'API', link: '/en/api/', activeMatch: '^/en/api/' },
        ],

        // 英文侧栏同样按路径分区；键要带 en/ 前缀（匹配的是 relativePath）。
        sidebar: {
          '/en/examples/': [
            { text: 'Gallery', link: '/en/examples/' },
            // One page per corpus group (the 17 groups with screenshots); section order matches SECTIONS in scripts/gen-examples-docs.mjs.
            {
              text: 'Basics and syntax',
              collapsed: false,
              items: [
                { text: 'Basic shapes', link: '/en/examples/basic' },
                { text: 'Constructor arguments', link: '/en/examples/ctor' },
                { text: 'Methods and rewrites', link: '/en/examples/method' },
                { text: 'Axes and data', link: '/en/examples/graph' },
                { text: 'Text and formulas', link: '/en/examples/text' },
                { text: 'Syntax (offline)', link: '/en/examples/syntax' },
              ],
            },
            {
              text: 'Animation and scenes',
              collapsed: false,
              items: [
                { text: 'Animations', link: '/en/examples/animate' },
                { text: 'Updaters and trails', link: '/en/examples/updater' },
                { text: 'Scenes and groups', link: '/en/examples/scene' },
              ],
            },
            {
              text: 'Subject lessons',
              collapsed: true,
              items: [
                { text: 'Calculus and analysis', link: '/en/examples/math-calculus' },
                { text: 'Linear algebra', link: '/en/examples/math-linear' },
                { text: 'Probability and statistics', link: '/en/examples/math-prob' },
                { text: 'Group theory', link: '/en/examples/math-group' },
                { text: 'Discrete mathematics', link: '/en/examples/math-discrete' },
                { text: 'Lesson scenes (templates)', link: '/en/examples/lesson' },
              ],
            },
            {
              text: 'Support surface and third-party',
              collapsed: true,
              items: [
                { text: 'API roll call (offline)', link: '/en/examples/api' },
                { text: 'Combined pipelines (network)', link: '/en/examples/combo' },
              ],
            },
          ],
          '/': [
            {
              text: 'Getting Started',
              items: [
                { text: 'Overview', link: '/en/guide/overview' },
                { text: 'Installation', link: '/en/guide/installation' },
                { text: 'Quick Start', link: '/en/guide/quick-start' },
              ],
            },
            {
              text: 'In Depth',
              items: [
                { text: 'Framework Integration', link: '/en/guide/frameworks' },
                { text: 'Behavioural Contracts', link: '/en/guide/contracts' },
                { text: 'Third-Party Packages', link: '/en/guide/packages' },
                { text: 'Node Precheck', link: '/en/guide/node' },
                { text: 'Support Surface', link: '/en/guide/support' },
              ],
            },
            {
              text: 'API Reference',
              items: [
                { text: 'Overview and Entry', link: '/en/api/' },
                { text: 'Renderer', link: '/en/api/renderer' },
                { text: 'Canvas', link: '/en/api/surface' },
                { text: 'Session', link: '/en/api/session' },
                { text: 'Playback', link: '/en/api/playback' },
                { text: 'Hooks', link: '/en/api/hooks' },
                { text: 'Environment Status', link: '/en/api/status' },
                { text: 'Export', link: '/en/api/export' },
                { text: 'Machine Probe', link: '/en/api/machine' },
                { text: 'Packages', link: '/en/api/packages' },
                { text: 'Node Entry', link: '/en/api/node' },
                { text: 'Corpus and Test Bench', link: '/en/api/corpus' },
                { text: 'Low-Level Exports', link: '/en/api/internals' },
              ],
            },
            {
              text: 'Development',
              items: [{ text: 'Development & Debugging', link: '/en/dev/' }],
            },
          ],
        },

        outline: { level: [2, 3], label: 'On this page' },
        sidebarMenuLabel: 'Contents',
        returnToTopLabel: 'Back to top',
        darkModeSwitchLabel: 'Appearance',
        lastUpdated: { text: 'Last updated' },
        docFooter: { prev: 'Previous', next: 'Next' },
      },
    },
  },

  themeConfig: {
    socialLinks: [{ icon: 'github', link: 'https://github.com/snowowowo/manim-live' }],
    footer: {
      message: 'MIT licensed · Manim 与 Pyodide 各依其自身许可（见「安装」）',
      copyright: 'Copyright © 2026 manim-live contributors',
    },
  },
})
