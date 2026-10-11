/**
 * 语料格式（`corpus-format.ts`）的边界：这一段是**两栖**的——Node 侧读盘、浏览器侧（playground）
 * 读 bundler 给的字符串，两边都靠它把「一段文本」翻译成「一条语料是什么意思」。
 * 所以它错了不是一个页面出错，而是**回归网与演示页对同一份语料给出两套说法**。
 *
 * 最后一条是交叉核：盘上真有的截图，条条都得能认回来——语料改名、截图忘改名就会在这儿露出来。
 */
import { existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  GROUPS, buildCorpus, exampleId, parseExampleHeader, shotPath, type CorpusSource,
} from './corpus-format.ts'
import { collectCorpus, corpusRoot, shotsRoot } from '../testbench/corpus.ts'

const source = (over: Partial<CorpusSource> = {}): CorpusSource => ({
  group: 'basic',
  name: '01-circle.py',
  file: 'corpus/examples/basic/01-circle.py',
  python: '"""画一个圆\n\n@expect 一个圆\n"""\n',
  ...over,
})

describe('parseExampleHeader', () => {
  it('认全六种元数据', () => {
    const header = parseExampleHeader('a/b.py', [
      '"""画一个正方形',
      '',
      '@reject Table',
      '@expect 一个青色方块，四边等长。',
      '@browser',
      '@note 2026-10-09 事故：方块的边压住了标签',
      '@note 第二条备注',
      '@template 要画方块加边长标注时就照它抄',
      '"""',
      'from manim import *',
    ].join('\n'))
    expect(header).toEqual({
      title: '画一个正方形',
      reject: true,
      errorIncludes: 'Table',
      expectation: '一个青色方块，四边等长。',
      browser: true,
      notes: ['2026-10-09 事故：方块的边压住了标签', '第二条备注'],
      template: '要画方块加边长标注时就照它抄',
    })
  })

  it('只有标题时其余都是缺省', () => {
    expect(parseExampleHeader('a/b.py', '"""就一个圆\n"""\n')).toEqual({
      title: '就一个圆',
      notes: [],
      reject: false,
      browser: false,
    })
  })

  it('标题取第一行非空文本（前面空行不算）', () => {
    expect(parseExampleHeader('a/b.py', '"""\n\n   真正的标题\n"""\n').title).toBe('真正的标题')
  })

  it('@reject 不带关键词时不留 errorIncludes', () => {
    const header = parseExampleHeader('a/b.py', '"""这条该被拒\n@reject\n"""\n')
    expect(header.reject).toBe(true)
    expect(header.errorIncludes).toBeUndefined()
  })

  it('@expect / @template 后面是空的就不算写过', () => {
    const header = parseExampleHeader('a/b.py', '"""标题\n@expect\n@template   \n"""\n')
    expect(header.expectation).toBeUndefined()
    expect(header.template).toBeUndefined()
  })

  it('缺 docstring 抛（不能静默丢掉一条回归）', () => {
    expect(() => parseExampleHeader('a/b.py', 'from manim import *\n')).toThrow(/缺少开头的模块 docstring/)
  })

  it('docstring 是空的也抛', () => {
    expect(() => parseExampleHeader('a/b.py', '"""\n\n"""\n')).toThrow(/第一行要写标题/)
  })
})

describe('id 与截图路径', () => {
  it('排序前缀不进 id，扩展名去掉', () => {
    expect(exampleId('basic', '01-circle.py')).toBe('basic-circle')
    expect(exampleId('reject', '24-special-three-d-scene.py')).toBe('reject-special-three-d-scene')
  })

  it('没有排序前缀时原样', () => {
    expect(exampleId('basic', 'circle.py')).toBe('basic-circle')
  })

  it('截图与语料同名同目录，只换扩展名', () => {
    expect(shotPath('basic', '01-circle.py')).toBe('basic/01-circle.png')
    expect(shotPath('math-group', '07-cayley.py')).toBe('math-group/07-cayley.png')
  })
})

describe('buildCorpus', () => {
  it('一条来源都没有 → 空表（正式安装的常态，不抛）', () => {
    expect(buildCorpus([])).toEqual({ groups: [], examples: [] })
  })

  it('未登记的分组抛错（新加的文件夹不能被静默漏掉）', () => {
    expect(() => buildCorpus([source({ group: 'nope' })])).toThrow(/未登记的分组：nope/)
  })

  it('登记了却没语料，在 requireComplete 下抛错', () => {
    expect(() => buildCorpus([source()], { requireComplete: true })).toThrow(/ctor\/ 里没有 \.py/)
  })

  it('默认不要求完整：只给一部分也收得下（登记表外的组不出现）', () => {
    const corpus = buildCorpus([source()])
    expect(corpus.groups.map((group) => group.id)).toEqual(['basic'])
    expect(corpus.examples.map((item) => item.id)).toEqual(['basic-circle'])
  })

  it('按登记顺序排组、组内按文件名排，元数据逐项落下', () => {
    const corpus = buildCorpus(
      [
        // ctor 在 GROUPS 里排在 basic 之后：故意倒着给
        source({ group: 'ctor', name: '02-b.py', file: 'ctor/02-b.py', python: '"""B\n@reject Line\n"""' }),
        source({ group: 'ctor', name: '01-a.py', file: 'ctor/01-a.py', python: '"""A\n@expect 画的是 A\n@note 有原因\n"""' }),
        source({ group: 'basic', name: '01-circle.py' }),
      ],
      { hasShot: (shot) => shot === 'ctor/01-a.png' },
    )
    expect(corpus.groups.map((group) => group.id)).toEqual(['basic', 'ctor'])
    expect(corpus.examples.map((item) => item.id)).toEqual(['basic-circle', 'ctor-a', 'ctor-b'])
    const [circle, a, b] = corpus.examples
    expect(circle).toMatchObject({ group: 'basic', title: '画一个圆', expect: 'ok', file: 'corpus/examples/basic/01-circle.py' })
    expect(circle!.shot).toBeUndefined()
    expect(a).toMatchObject({ title: 'A', expect: 'ok', expectation: '画的是 A', note: '有原因', shot: 'ctor/01-a.png' })
    expect(b).toMatchObject({ title: 'B', expect: 'reject', errorIncludes: 'Line' })
    expect(b!.shot).toBeUndefined()
  })

  it('整组需要联网时，组与组内每条都带上 network', () => {
    const corpus = buildCorpus(
      [source({ group: 'basic' }), source({ group: 'net', name: '01-np.py', python: '"""用 numpy\n"""' })],
    )
    expect(corpus.groups.find((group) => group.id === 'net')?.network).toBe(true)
    expect(corpus.examples.find((item) => item.id === 'net-np')?.network).toBe(true)
    expect(corpus.examples.find((item) => item.id === 'basic-circle')?.network).toBeUndefined()
  })

  it('@browser 与 @template 原样透传', () => {
    const corpus = buildCorpus([
      source({ group: 'basic', python: '"""要 DOM\n@browser\n@template 要画 SVG 时照它抄\n"""' }),
    ])
    expect(corpus.examples[0]).toMatchObject({ browser: true, template: '要画 SVG 时照它抄' })
  })
})

describe('盘上的真语料', () => {
  const corpus = collectCorpus()

  it('登记表覆盖全部目录，且每条都认得出来', () => {
    if (corpus.examples.length === 0) return // 从 tarball 里跑：没语料，跳过
    expect(corpus.groups.map((group) => group.id)).toEqual(GROUPS.map((group) => group.id))
    const ids = new Set(corpus.examples.map((item) => item.id))
    expect(ids.size).toBe(corpus.examples.length) // id 不许撞
    const root = corpusRoot()
    for (const item of corpus.examples) {
      expect(item.file.startsWith('corpus/examples/')).toBe(true)
      expect(existsSync(join(root, item.file.replace('corpus/examples/', '')))).toBe(true)
    }
  })

  it('盘上每张截图都认得回一条语料（语料改名、图忘改名会在这儿露出来）', () => {
    if (corpus.examples.length === 0) return
    const root = shotsRoot()
    if (!existsSync(root)) return
    const known = new Set(corpus.examples.flatMap((item) => (item.shot === undefined ? [] : [item.shot])))
    const orphans: string[] = []
    for (const group of readdirSync(root)) {
      const dir = join(root, group)
      if (!statSync(dir).isDirectory()) continue // index.json 之类
      for (const name of readdirSync(dir)) {
        if (!name.endsWith('.png')) continue
        const rel = `${group}/${name}`
        if (!known.has(rel)) orphans.push(rel)
      }
    }
    expect(orphans).toEqual([])
  })
})
