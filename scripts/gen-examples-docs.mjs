// 示例章页面生成：语料（corpus/examples/）+ 截图（corpus/shots/）→ docs/examples/<组>.md 与 docs/en/examples/<组>.md。
//
// 为什么是生成而不是手写：188 条的标题与预期写在语料的 docstring 里（唯一出处），手写等于抄第二份、必然漂移；
// 代码与截图在页面里**一个字节都不复制**——代码走 VitePress 的 snippet import（`<<< @/../corpus/...`），
// 截图走相对路径直接引 corpus/shots/（构建时由 vite 收进 assets）。
// 英文标题与预期在 docs/examples-i18n.json（人工翻译，id 与语料对齐，双向校验）。
//
// 运行：node scripts/gen-examples-docs.mjs（先 pnpm build；改语料或翻译表后重跑，产物进库）。
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
// 语料装载从构建产物取（与产品同一份逻辑，不另抄一份读语料的代码）：先 `pnpm build`。
import { collectCorpus } from '../dist/node.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const DOCS = join(resolve(HERE, '..'), 'docs')
const i18n = JSON.parse(readFileSync(join(DOCS, 'examples-i18n.json'), 'utf8'))

const { groups, examples } = collectCorpus()
const withShot = examples.filter((item) => item.shot !== undefined)
const byGroup = new Map()
for (const item of withShot) {
  const list = byGroup.get(item.group) ?? []
  list.push(item)
  byGroup.set(item.group, list)
}

// 翻译表与语料双向对齐：漏译或多译都当场抛，不让某条示例在英文页上开天窗。
const shotIds = new Set(withShot.map((item) => item.id))
const missing = [...shotIds].filter((id) => i18n.examples[id] === undefined)
const extra = Object.keys(i18n.examples).filter((id) => !shotIds.has(id))
if (missing.length > 0 || extra.length > 0) {
  throw new Error(
    `examples-i18n.json 与语料不对齐：缺 ${missing.join(', ') || '无'}；多 ${extra.join(', ') || '无'}`,
  )
}

// 侧栏「示例」大组的四个子组（顺序与 docs/.vitepress/config.ts 保持一致）。
const SECTIONS = [
  { zh: '基础与语法', en: 'Basics and syntax', groups: ['basic', 'ctor', 'method', 'graph', 'text', 'syntax'] },
  { zh: '动画与场景', en: 'Animation and scenes', groups: ['animate', 'updater', 'scene'] },
  { zh: '学科讲解', en: 'Subject lessons', groups: ['math-calculus', 'math-linear', 'math-prob', 'math-group', 'math-discrete', 'lesson'] },
  { zh: '支持面与第三方', en: 'Support surface and third-party', groups: ['api', 'combo'] },
]

const GENERATED = '<!-- 本文件由 scripts/gen-examples-docs.mjs 生成，不要手改：改语料或翻译表后重跑脚本。 -->'

function groupTitle(group, locale) {
  return locale === 'zh' ? group.title : i18n.groups[group.id].en
}

function examplePage(group, list, locale) {
  const shots = locale === 'zh' ? '../../corpus/shots/' : '../../../corpus/shots/'
  const codeTab = locale === 'zh' ? '代码' : 'Code'
  const shotTab = locale === 'zh' ? '画面' : 'Rendered'
  const countLine =
    locale === 'zh'
      ? `本页 ${list.length} 条示例。代码引自 \`corpus/examples/${group.id}/\`，截图为真机渲染的终态。`
      : `This page lists ${list.length} examples. The code is imported from \`corpus/examples/${group.id}/\`; the screenshots are end states rendered on real machines.`
  const blocks = list
    .map((item) => {
      const entry = i18n.examples[item.id]
      const title = locale === 'zh' ? item.title : entry.title
      const expect = locale === 'zh' ? item.expectation : entry.expect
      const name = item.file.split('/').pop()
      const lines = ['## ' + title, '']
      if (expect !== undefined && expect !== '') lines.push(expect, '')
      lines.push(
        '::: code-group',
        '',
        // 画面放第一个 tab 并默认激活：内置 code-group 的初始 active 只加给第一个**代码围栏**，
        // 图片块（html_block）拿不到，所以这里手写 active 类（CSS 认 .vp-block.active）。
        `<div class="vp-block active" data-title="${shotTab}">`,
        `<img src="${shots}${item.shot}" alt="${title}" />`,
        '</div>',
        '',
        `<<< @/../corpus/examples/${group.id}/${name}[${codeTab}]`,
        '',
        ':::',
        '',
      )
      return lines.join('\n')
    })
    .join('\n')
  return [GENERATED, '', '# ' + groupTitle(group, locale), '', i18n.groups[group.id].intro[locale], '', countLine, '', blocks].join('\n')
}

function overviewPage(locale) {
  const prose = i18n.overview[locale]
  // 总览页与领域页同深度：docs/examples/ 与 docs/en/examples/。
  const shots = locale === 'zh' ? '../../corpus/shots/' : '../../../corpus/shots/'
  const cards = SECTIONS.flatMap((section) => section.groups)
    .map((id) => {
      const group = groups.find((item) => item.id === id)
      const list = byGroup.get(id) ?? []
      const title = groupTitle(group, locale)
      return `  <a href="./${id}"><figure><img src="${shots}${list[0].shot}" alt="${title}" loading="lazy" /><figcaption>${title} · ${list.length}</figcaption></figure></a>`
    })
    .join('\n')
  return [
    GENERATED,
    '',
    locale === 'zh' ? '# 示例画廊' : '# Gallery',
    '',
    prose.lead,
    '',
    prose.note,
    '',
    '<div class="gallery">',
    cards,
    '</div>',
    '',
  ].join('\n')
}

let written = 0
for (const locale of ['zh', 'en']) {
  const dir = join(DOCS, locale === 'zh' ? 'examples' : join('en', 'examples'))
  mkdirSync(dir, { recursive: true })
  for (const group of groups) {
    const list = byGroup.get(group.id)
    if (list === undefined) continue // 没有截图的组（net / reject）不进示例章
    writeFileSync(join(dir, `${group.id}.md`), examplePage(group, list, locale))
    written += 1
  }
  writeFileSync(join(dir, 'index.md'), overviewPage(locale))
  written += 1
}
console.log(`示例页生成完毕：${written} 个文件（${withShot.length} 条示例 / ${byGroup.size} 组 × 中英）`)
