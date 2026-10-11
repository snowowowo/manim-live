# 在 Node 里干跑预检

本页面向要在 CI 里预检 Manim 代码的场景：Node 入口的用法与预检的能力边界。

浏览器入口需要 DOM，Node 中没有。`manim-live/node` 提供两个纯 Node 的入口，
用于**不碰 DOM 的干跑预检**——典型场景是 CI：先在 CI 中对 AI 生成的代码预检一遍，
未通过的无需送入浏览器。

## 两个入口

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

### createDryRunBridge 提供一份「不绘制任何内容」的桥

Manim 代码会被 Python 解释器真实执行（类型错误、拼错的类名、取不到的包均能拦截），
仅不产出画面。

### warmup 在 Node 侧同样可用

用于在进程中预热 Pyodide 的下载，避免 CI 的第一步耗时在 13 MB 的下载上。

## 能力边界

::: warning 预检无法拦截「画面错误」
预检能拦截「代码错误」，无法拦截「代码正确但画面错误」——字形、WebGL、3D 光照等
只有真实浏览器才能暴露的问题，仍需真机验证（本仓的做法是 `pnpm playground` +
`pnpm check:playground` 烟测）。
:::
