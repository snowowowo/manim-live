# 在 Node 里干跑预检

浏览器入口要 DOM；Node 里没有。`manim-live/node` 提供两个纯 Node 的入口，
用于**不碰 DOM 的干跑预检**——典型场景是 CI：先在 CI 里把 AI 生成的代码预检一遍，
不过的压根不用送浏览器。

```ts
import { runPython, createDryRunBridge } from 'manim-live/node'

// 干跑：语法错 / 未定义名 / 实测缺失的 manim-web 能力，当场抛 PyRuntimeError。
try {
  await runPython(python, createDryRunBridge())
  console.log('预检通过')
} catch (error) {
  console.error('预检未通过：', error instanceof Error ? error.message : error)
}
```

`createDryRunBridge()` 给的是一份「什么都不画」的桥：Manim 代码会真的被 Python 解释器执行
（所以类型错误、拼错的类名、取不到的包都拦得住），只是不产出画面。

::: warning 它替代不了真机
预检拦得住「代码是错的」，拦不住「代码是对的但画面是错的」——字形、WebGL、3D 光照这类
只有真浏览器才暴露的问题，仍然要靠真机验证（本仓的做法是 `pnpm playground` +
`pnpm check:playground` 烟测）。
:::

`warmup()` 在 Node 侧同样可用，用于把 Pyodide 的下载预热在进程里。
