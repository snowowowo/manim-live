import { defineConfig } from 'vitepress'

// base 与部署地址对齐：仓库是 github.com/snowowowo/manim-live，项目页即
// https://snowowowo.github.io/manim-live/ 。换自定义域名（或改成 <user>.github.io
// 用户页）时改这一处即可——正文里的图片全是相对路径，vite 构建时自动带上 base。
export default defineConfig({
  base: '/manim-live/',
  lang: 'zh-CN',
  // README.md 是给「改文档的人」看的说明（怎么装依赖、base 在哪改），不是正文——别渲染成页面。
  srcExclude: ['README.md'],
  title: 'manim-live',
  description: '在浏览器里用真 Python 跑 Manim 代码并渲出一幅画面——纯逻辑，零框架、零宿主。',

  themeConfig: {
    outline: 'deep',
    search: { provider: 'local' },
    socialLinks: [{ icon: 'github', link: 'https://github.com/snowowowo/manim-live' }],
    footer: {
      message: 'MIT licensed · Manim 与 Pyodide 各依其自身许可（见「安装」）',
      copyright: 'Copyright © 2026 manim-live contributors',
    },
    docFooter: { prev: '上一页', next: '下一页' },
    lastUpdated: { text: '上次更新' },
  },

  nav: [
    { text: '指南', link: '/guide/installation', activeMatch: '/guide/' },
    { text: '示例', link: '/examples/' },
    { text: 'API', link: '/api/' },
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
    { text: '示例', items: [{ text: '渲染成品画廊', link: '/examples/' }] },
    { text: 'API', items: [{ text: '公开接口', link: '/api/' }] },
  ],
})
