import { defineConfig } from 'vitepress'

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

        sidebar: [
          {
            text: 'Guide',
            items: [
              { text: 'Installation', link: '/en/guide/installation' },
              { text: 'Quick Start', link: '/en/guide/quick-start' },
              { text: 'Using in Frameworks', link: '/en/guide/frameworks' },
              { text: 'Three Contracts You Must Know', link: '/en/guide/contracts' },
              { text: 'Where Third-Party Packages Come From', link: '/en/guide/packages' },
              { text: 'Dry-Run Precheck in Node', link: '/en/guide/node' },
            ],
          },
          {
            text: 'Examples',
            items: [{ text: 'Rendered Gallery', link: '/en/examples/' }],
          },
          {
            text: 'API',
            items: [{ text: 'Public API', link: '/en/api/' }],
          },
          {
            text: 'Development',
            items: [{ text: 'Development & Debugging', link: '/en/dev/' }],
          },
        ],

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
