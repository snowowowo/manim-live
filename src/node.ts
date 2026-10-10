// Node 入口（`manim-live/node`）：**不碰 DOM** 的那一半。
//
// 用途两件：① 干跑预检（`runPython` + `createDryRunBridge`），可跑在服务端 / 宿主里；
//          ② 语料装载（测试台与实验场的数据源）。
// 这个入口里的一切都不该 import DOM / WebGL 相关的东西——否则在 Node 里 import 就会炸。

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

// ---- 语料：装载 / 路径 / 判定（测试台与实验场共用）----
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

// ---- 导入失败时的可读文案（子路径记账）----
export { healSubpathBookkeeping, subpathsConsistent, subpathTreeConsistent } from './py/subpath-bookkeeping.ts'
