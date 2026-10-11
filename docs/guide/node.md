# Node 预检

本页面向在 CI 里预检 Manim 代码的场景：Node 入口的用法与预检的能力边界。浏览器入口需要 DOM，Node 中没有；`manim-live/node` 提供不碰 DOM 的干跑预检——先在 CI 里把 AI 生成的代码过一遍，未通过的无需送入浏览器。

## 用法

```ts
import { runPython, createDryRunBridge } from 'manim-live/node'

// 干跑：语法错 / 未定义名 / 实测缺失的 manim-web 能力，抛出 PyRuntimeError。
try {
  await runPython(python, createDryRunBridge())
  console.log('预检通过')
} catch (error) {
  console.error('预检未通过：', error instanceof Error ? error.message : error)
}
```

`createDryRunBridge()` 给出一份「不绘制任何内容」的桥：Manim 代码被 Python 解释器真实执行，类型错误、拼错的类名、取不到的包均能拦截，只是不产出画面。

Node 入口没有单独的预热函数：第一次 `runPython()` 会顺带完成 Pyodide 与适配层的下载初始化（核心约 13 MB），进程里的第一段代码因此明显更慢。

完整的成员清单与类型定义见 [API 参考：Node 入口](/api/node)。

## 能力边界

::: warning 预检无法拦截「画面错误」
预检能拦截「代码错误」，无法拦截「代码正确但画面错误」——字形、WebGL、3D 光照等只有真实浏览器才能暴露的问题，仍需真机验证（本仓的做法是 `pnpm playground` 加 `pnpm check:playground` 烟测）。
:::
