# 第三方包从哪来、缓存在哪

语料里有几条要 `import pandas` / `matplotlib` / `scipy` / `sklearn` 的。这些包**不随本包发**，
也不随 Pyodide 核心发——它们按需取。这一页把「从哪取、为什么可能取不到、缓存落在哪」说清。

## 先记一条硬事实

读 Pyodide 的 `pyodide.asm.js` 得来（不是猜）：浏览器侧取一个按需包，就是

```js
fetch(new URL(file_name, indexURL), { integrity: 'sha256-' + base64(pkg.sha256) })
```

两个推论：

1. **地址只有 `indexURL` 一个，不会回落官方 CDN**（Pyodide 源码里那条 CDN 回落写在 Node
   分支里，浏览器里是空操作）。`indexURL` 指向的目录里有什么，就只能取什么。
2. 文件不在时，表现是 `TypeError: Failed to fetch`——因为带 SRI 的 fetch 撞上 404 空 body，
   完整性校验必然失败，抛的这句话与「网络不通」**一模一样**。所以见到 `Failed to fetch`
   先别急着怪网络。

## 三种环境，各自的取法

| 环境 | 谁把 wheel 放进 `indexURL` | 缓存落在哪 |
| --- | --- | --- |
| 官方 CDN（默认） | 不用管，CDN 本身就是全的 | 浏览器 HTTP 缓存 |
| 自托管（静态目录） | **你自己**——把用到的 wheel 拷进目录 | 浏览器 HTTP 缓存 |
| 本仓的本地演示台 | vite 中间件代取：随包目录 → 仓内缓存目录 → jsdelivr | 两层（服务端目录 + 浏览器） |

### 默认（官方 CDN）

什么都不用做。首次用到某个包会联网取一次，之后走浏览器 HTTP 缓存。

### 自托管（内网 / 完全离线）

1. 从 Pyodide 发行版把 `pyodide-lock.json` 与用到的 wheel 拷进你的静态目录
   （核心文件 `pyodide.js` / `pyodide.asm.wasm` / `python_stdlib.zip` 当然也要）。
2. wheel 的字节会被 lock 里的 sha256 校验，**换成别的版本会被 SRI 拒掉**——要换版本，
   连 lock 一起换。
3. 缺了哪个包，错误信息会**点名**（见下节），照着补文件即可。

体量参考：`pandas + matplotlib + scipy + scikit-learn + statsmodels` 连同依赖的完整闭包是
**20 个 wheel / 41.3 MB**。核心（约 13 MB）另算。

### 本地演示台（本仓开发用）

`pnpm playground` 起的 vite 开发服务器带一个代取中间件：随包目录里有就直接给，没有就按
lock 的 sha256 校验后从 jsdelivr 取回、落在 `_dev/pyodide-cache/`（gitignored）。取一遍就够，
之后离线也能跑。

## 取包失败时，错误信息会说实话

核心包内置了一份分档诊断，`Failed to fetch` 会被翻译成四种实话之一：

| 档 | 说明 |
| --- | --- |
| 地址下没有这个文件 | `indexURL` 是静态目录，缺谁点谁 |
| 连不上 | 这才是真的网络问题 |
| 代取的那一头自己报错 | 转述服务端原话（比如 502） |
| 字节与 sha256 对不上 | 文件在，但不是 lock 登记的那份 |

前两档长这样：

```
取不到代码里 import 的库（pandas）：Failed to fetch。真因多半不是网络：/pyodide/ 下没有
pandas-2.2.3-…whl 这些文件——这个地址是静态目录，里面有什么就只能取什么……
```

实现的位置：接缝是 `setPackageDiagnoser`（核心包默认给一句通用建议，宿主可以覆盖），
浏览器侧的分档逻辑在 `src/engine/pyodide.ts`。如果你是宿主集成方、有自己的取包路由，
可以注册自己的诊断器。
