# API 参考：钩子

三个可挂的回调与信号。它们都挂在**调用**上而不是对象上：没有「订阅某个对象」的 API，过程信息只能通过这些参数递进来。

环境级的就绪状态（能力 / 运行时 / KaTeX / 取包）不挂在调用上，见[环境状态](/api/status)。

## onLoading(names)

按 `import` 取第三方包时的进展回调。三个挂载点，优先级从低到高：

1. `createManimRenderer({ onLoading })`
2. `createSurface(container, { onLoading })`
3. `run(code, { onLoading })`

```ts
onLoading?: (names: string[]) => void
```

**参数** `names`：正在取的包名；取完再回调一次，给空数组。

**例子**

```ts
const surface = await renderer.createSurface(container, {
  onLoading: (names) => {
    if (names.length === 0) return hideLoading()
    // 随包件与缓存命中都很快，立刻显示会闪一下：延迟约 300 ms 再显示
    window.setTimeout(() => showLoading(names), 300)
  },
})
```

**注意**

- 只覆盖取包，不覆盖渲染进度。「正在渲染」要自己在调用 `run()` 前后记。
- 用户代码的 `print` 不走这里，核心把它写到 `console.info`。

## onProgress(note)

导出过程的阶段播报，挂在 [`exporter.run()`](/api/export) 的请求里。

```ts
onProgress?: (note: string) => void
```

**参数** `note`：一句进展文字，如「正在从头真播并录制…」「录完 32 KB」。

**例子**

```ts
await recorder.run({ python, controller, onProgress: (note) => setStatus(note) })
```

## signal

取消一次导出。只有 `exporter.run()` 接受，`surface.run()` 不接受。

```ts
run(request: ExportRequest, signal?: AbortSignal): Promise<ExportResult>
```

**例子**

```ts
const abort = new AbortController()
stopButton.onclick = () => abort.abort()
await recorder.run({ python, controller }, abort.signal)
```

abort 之后录屏停表，返回 `{ ok: false, reason: 'error', error: '已取消' }`。

**注意**

- 它取消的是导出这一次动作，不是正在跑的渲染。取消「正在跑的那段代码」在当前版本没有对应能力，见[低层导出](/api/internals)末尾的缺口表。
