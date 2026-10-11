// Node 入口（`manim-live/node`）：**不碰 DOM** 的那一半。
//
// 用途两件：① 干跑预检（`runPython` + `createDryRunBridge`），可跑在服务端 / 宿主里；
//          ② 语料装载（Node 侧回归、截图脚本、插件端技能生成的数据源）。
// 这个入口里的任何模块都不应 import DOM / WebGL 相关内容——否则在 Node 里 import 即失败。

// ---- Python 运行时（Pyodide 真 CPython + manim 适配层）----
export {
  runPython,
  toPyRuntimeError,
  setPyodideLoader,
  PyRuntimeError,
  PyRunCancelled,
  packageFailureMessage,
  type RunOptions,
  type PyodideLoader,
  type PyodideRuntime,
} from './py/runtime.ts'

// ---- 桥：真桥（接 manim-web）/ 预检空桥 ----
export {
  createRecordingBridge,
  HANDLE_KEY,
  GROUP_KEY,
  ANIMATE_KIND,
  type AnimationTarget,
  type ManimBridge,
  type RecordingBridge,
  type BridgeOp,
  type AnimationSpec,
} from './py/bridge.ts'
export { createDryRunBridge } from './py/dry-run-bridge.ts'
export {
  createManimWebBridge,
  type ManimNamespace,
  type ManimWebBridgeOptions,
} from './py/manim-bridge.ts'

// ---- 支持面 SSOT：哪些 CE 写法被支持，以及怎么落 ----
export {
  planCreate,
  planAnimation,
  planAnimationOptions,
  planPlayOptions,
  planAttrRead,
  planMethod,
  planAnimate,
  camel,
  camelKeys,
  PROP_READS,
  INDEX_GETTERS,
  PY_API_MAP,
  PY_COLOR_HEX,
  PY_ANIMATE_METHODS,
  type AnimationPlan,
  type MethodCall,
  type MethodPlan,
  type PlayPlan,
  type RatePlan,
  type PyApiEntry,
} from './py/surface.ts'

// ---- 杂项 ----
export { canonicalPackageName } from './py/pkg-names.ts'

// ---- 语料：装载 / 路径 / 分组表 ----
export {
  collectCorpus,
  corpusRoot,
  corpusAvailable,
  shotsRoot,
  shotPath,
  PACKAGE_ROOT,
  GROUPS,
} from './testbench/corpus.ts'
export {
  parseCorpus,
  type Corpus,
  type ExampleGroup,
  type ExampleExpect,
  type ManimExample,
} from './py/examples.ts'
// 格式那一半（不碰 node:）：Node 侧从磁盘读之后，与浏览器侧（vite 的 import.meta.glob）
// 收敛成 Corpus 走的是同一组函数。 exporters / 消费者手上有「一堆源码」时用它。
export {
  buildCorpus,
  exampleId,
  parseExampleHeader,
  type CorpusSource,
  type ExampleHeader,
} from './py/corpus-format.ts'

// ---- 导入失败时的可读文案（子路径记账）----
export { healSubpathBookkeeping, subpathsConsistent, subpathTreeConsistent } from './py/subpath-bookkeeping.ts'
