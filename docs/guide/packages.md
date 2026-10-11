# 第三方包

部分代码需要 `import pandas`、`matplotlib`、`scipy`、`sklearn`。这些包不随本包分发，也不随 Pyodide 核心分发，而是按需获取。本页讲清获取来源、失败原因与缓存位置——部署到内网或离线环境之前应读。

## 取包机制

以下结论取自 Pyodide 的 `pyodide.asm.js` 源码，不是推断：浏览器侧获取一个按需包的过程是

```js
fetch(new URL(file_name, indexURL), { integrity: 'sha256-' + base64(pkg.sha256) })
```

两个推论：

1. **地址只有 `indexURL` 一个，不会回落到官方 CDN**（Pyodide 源码中的 CDN 回落位于 Node 分支，浏览器中为空操作）。只能取到 `indexURL` 指向的目录里存在的文件。
2. 文件不存在时表现为 `TypeError: Failed to fetch`——带 SRI 的 fetch 遇到 404 空 body，完整性校验必然失败，抛出的错误信息与「网络不通」**完全一致**。因此遇到 `Failed to fetch` 应先检查静态目录，而非网络。

## 两种部署环境

| 环境 | 谁把 wheel 放进 `indexURL` | 缓存位置 |
| --- | --- | --- |
| 官方 CDN（默认） | 无需处理，CDN 本身即完整 | 浏览器 HTTP 缓存 |
| 自托管（静态目录） | **使用者**——将用到的 wheel 拷入目录 | 浏览器 HTTP 缓存 |

本仓库的本地演示台采用第三种取法——vite 中间件代理获取，属开发期行为，见[开发与调试](/dev/)。

### 官方 CDN（默认）

无需任何配置。首次使用某个包时联网获取一次，之后走浏览器 HTTP 缓存。

### 自托管（内网或完全离线）

1. 从 Pyodide 发行版将 `pyodide-lock.json` 与用到的 wheel 拷入静态目录；核心文件 `pyodide.js`、`pyodide.asm.wasm`、`python_stdlib.zip` 亦不可缺少。
2. wheel 的字节由 lock 中的 sha256 校验，**更换其他版本会被 SRI 拒绝**——换版本时须连同 lock 一起换。
3. 缺少哪个包，错误信息会**明确指出**（见下节），按提示补齐文件即可。

体量参考（本仓演示台的取包缓存实测）：`pandas + matplotlib + scipy + scikit-learn + statsmodels` 及其完整依赖闭包为 **19 个 wheel 加 1 个 openblas 压缩包，合计约 73 MB**，核心（约 13 MB）另计。

## 失败时的错误信息

核心包内置分档诊断，`Failed to fetch` 会被翻译为以下四类之一：

| 档 | 说明 |
| --- | --- |
| 地址下没有该文件 | `indexURL` 是静态目录，缺少哪个会明确指出 |
| 无法连接 | 真正的网络问题 |
| 代理获取的一端自身报错 | 转述服务端原始信息（如 502） |
| 字节与 sha256 不符 | 文件存在，但与 lock 登记的版本不一致 |

前两档的示例：

```
取不到代码里 import 的库（pandas）：Failed to fetch。真因多半不是网络：/pyodide/ 下没有
pandas-2.2.3-…whl 这些文件——这个地址是静态目录，里面有什么就只能取什么……
```

扩展位置：接缝为 `setPackageDiagnoser`（核心包默认提供一句通用建议，宿主可覆盖），浏览器侧的分档逻辑位于 `src/engine/pyodide.ts`。宿主集成方如有自己的取包路由，可注册自定义诊断器。
