/**
 * 可选依赖的**占位桩**：manim-web 0.36 的 dist 里有一处裸动态 import（讲义导出的可选依赖
 * pptxgenjs，上游自己用 try/catch 兜着）。Vite 的依赖预打包（esbuild）不认源码里的
 * @vite-ignore 注释，会硬解析这个裸名——包没装就整页红屏（2026-10-13 升级时踩到）。
 *
 * 所以 playground 的 vite 配置把 `pptxgenjs` alias 到这个文件：预打包能解析到东西，
 * 而真去取它时抛这一句、由上游的 catch 转成它自己的提示（「装 pptxgenjs 或传 pptxFactory」）。
 * **想真导 PPTX 时**：`pnpm add -D pptxgenjs`，然后删掉 vite.config.ts 里那条 alias。
 */
throw new Error('pptxgenjs 未安装——playground 用占位桩顶住了预打包；真要用请装包并删 alias（见本文件头）')
