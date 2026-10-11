# examples — 框架集成最小验证项目

四个最小项目验证 `manim-live` 在各框架下的真实可用性，全部使用**当前最新版本**（2026-10-11 真机验证通过）。每个项目自持依赖，对本地包用 `link:../..`：

| 目录 | 框架与版本 | 验证内容 |
| --- | --- | --- |
| `vanilla/` | 原生 JS + Vite 8 | 快速开始的最小流程原样可跑；渲染成功 |
| `react/` | React 19 + TypeScript 7 + Vite 8 | 文档里的 `ManimStage` 组件（StrictMode 双挂载）渲染成功；严格模式 `tsc` 类型检查通过 |
| `vue/` | Vue 3.5 + Vite 8 | 文档里的 `onMounted` 写法渲染成功；`vue-tsc` 类型检查通过（typescript 钉 5.x——vue-tsc 暂不支持 TS 7） |
| `next/` | Next.js 16（App Router，React 19） | `next build`（Turbopack）静态预渲染通过——**服务器组件顶层 import 本包并读取常量是安全的**；`'use client'` 组件内 `useEffect` 建画布，浏览器端渲染成功 |

## 运行

```bash
cd examples/<目录>
pnpm install
pnpm dev        # vanilla/react/vue：vite；next：next dev（端口 5301–5304）
```

页面跑通后标题会变成 `VV-OK`（失败为 `VV-ERR`）。

首次运行浏览器会从 CDN 拉取运行时（约 13 MB），之后走 HTTP 缓存。本目录不进 npm 产物（`files` 白名单之外）；本包源码改动通过 link 直接生效，无需重新安装。
