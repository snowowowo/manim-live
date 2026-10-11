import { defineConfig } from 'vitepress'

// base 与部署地址对齐：仓库是 github.com/snowowowo/manim-live，项目页即
// https://snowowowo.github.io/manim-live/ 。换自定义域名（或改成 <user>.github.io
// 用户页）时改这一处即可——正文里的图片全是相对路径，vite 构建时自动带上 base。
const BASE = '/manim-live/'

export default defineConfig({
  base: BASE,
  lang: 'zh-CN',
  title: 'manim-live',
  description: '在浏览器里用真 Python 跑 Manim 代码并渲出一幅画面——纯逻辑，零框架、零宿主。',
  // 图标放在 public/ 下。head 里的 href **不会**被自动加 base（它不走 markdown 链接改写），
  // 所以这里手动拼上——顺手把它绑到上面那个 BASE，免得两处各改一次。
  head: [['link', { rel: 'icon', type: 'image/svg+xml', href: `${BASE}favicon.svg` }]],
  // README.md 是给「改文档的人」看的说明（怎么装依赖、base 在哪改），不是正文——别渲染成页面。
  srcExclude: ['README.md'],
  // 每页底部显示「上次更新」：取 git 提交时间。
  lastUpdated: true,

  // 版式：左侧 = 整站目录（下面那段 sidebar，全站一套），右侧 = 当前页的章节大纲。
  // 后者由 outline 控制，默认就有；这里收窄到 h2/h3，免得长文右栏被 h4 灌满。
  themeConfig: {
    // ⚠️ nav / sidebar 必须在 themeConfig 里。写在 defineConfig 顶层是无效的
    // ——不报错、也不出现，页面就是「既没顶部导航、又没左侧目录」（踩过）。
    nav: [
      { text: '指南', link: '/guide/installation', activeMatch: '^/guide/' },
      { text: '示例', link: '/examples/', activeMatch: '^/examples/' },
      { text: 'API', link: '/api/', activeMatch: '^/api/' },
    ],

    sidebar: [
      {
        text: '指南',
        items: [
          { text: '安装', link: '/guide/installation' },
          { text: '快速开始', link: '/guide/quick-start' },
          { text: '在各框架里用', link: '/guide/frameworks' },
          { text: '必须知道的三条契约', link: '/guide/contracts' },
          { text: '第三方包从哪来、缓存在哪', link: '/guide/packages' },
          { text: '在 Node 里干跑预检', link: '/guide/node' },
        ],
      },
      {
        text: '示例',
        items: [{ text: '渲染成品画廊', link: '/examples/' }],
      },
      {
        text: 'API',
        items: [{ text: '公开接口', link: '/api/' }],
      },
      // 开发调试内容单独一小节，排在最后——使用者用不到，别混进上面的使用指南。
      {
        text: '开发',
        items: [{ text: '开发与调试', link: '/dev/' }],
      },
    ],

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

    socialLinks: [{ icon: 'github', link: 'https://github.com/snowowowo/manim-live' }],
    footer: {
      message: 'MIT licensed · Manim 与 Pyodide 各依其自身许可（见「安装」）',
      copyright: 'Copyright © 2026 manim-live contributors',
    },
  },
})
