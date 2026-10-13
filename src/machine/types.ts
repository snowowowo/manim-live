/**
 * 本机探测的**线上形状**：一台机器上有没有那套 manim 命令行工具链。
 * Host 半边（../machine/probe.ts）生产、客户端半边（../machine/client.ts）解析，两边同一份。
 *
 * 与 `engine/environment.ts` 的 `EnvironmentStatus` 是两件事，别混：
 *  - 那个报的是**浏览器里** Pyodide / WASM 运行时的状态（卡片渲染用，读页面内的事实）；
 *  - 这里报的是**本机装没装** manim / FFmpeg / LaTeX（导出 mp4 用，要跑真命令去问）。
 */

/** 一项探测的元信息（Host 只说「测什么、跑哪条命令」，文案在界面那一侧）。 */
export interface EnvCheck {
  id: string
  /** 要在 PATH 里找的可执行文件名。 */
  tool: string
  /** 会跑的命令，原样显示给用户看（「到底测了什么」不该是个谜）。 */
  command: string
}

export interface EnvPlan {
  platform: string
  arch: string
  node: string
  /** Host 实际用来找命令的 PATH（含它补上的常见安装目录）。 */
  path: string
  checks: EnvCheck[]
}

export type EnvStatus = 'ok' | 'missing' | 'error'

export interface EnvResult {
  id: string
  status: EnvStatus
  /** 找到的可执行文件绝对路径；没找到时是 null。 */
  path: string | null
  /** 版本行（status 为 ok 时才有）。 */
  version: string
  /** 没装 / 出错时的说明。 */
  detail: string
}

/** 探测函数的形状：就绪门等消费方注入替身用（真身是 probe.ts 的 `probeCheck`）。 */
export type ProbeFn = (id: string) => Promise<EnvResult | null>
