# API 参考：低层导出

这些同样是公开导出，但属于实现零件：常规集成不会用到。需要它们的场景通常是编写截图脚本、API 探针，或为某个宿主实现适配层——即由调用方自行接管画布或解释器时。语义以 `.d.ts` 与源码注释为准。

## 直接驱动运行时

- `runPython(python, bridge, options?)`：在 Pyodide 里真实解释执行一段 Python，绘制动作全部发送到给定的桥上。浏览器入口与 Node 入口都导出它。
- `setPyodideLoader(loader)`：注入取数加载器。`createManimRenderer()` 内部已调用，只有完全不经由工厂、自行接管运行时时才需要。
- `warmupRuntime()`：运行时预热的原语，`renderer.warmup()` 调用的就是它。
- `PyRuntimeError`：用户代码或运行时的错误，消息里带还原后的行号。
- `PyRunCancelled`：执行到它时调用方已作废。不是错误，不向用户显示。
- `DEFAULT_PYODIDE_INDEX_URL`：官方 CDN 默认值的常量。

## 桥与支持面

- `createManimWebBridge(options)`：真桥，把绘制动作落到 manim-web 的场景上。选项接收 `fast`（极速档）与 `sceneFor`（3D 场景的创建方式）。
- `createRecordingBridge()`：记录桥，把每个绘制动作录成 op 而不绘制。截图脚本与 API 探针使用它。
- `createDryRunBridge()`：空桥，代码被真实解释执行但不产出画面，预检使用它。
- `planMethod` / `planAnimate` / `planCreate`：支持面 SSOT 的规划函数——一个 Manim CE 调用如何映射到 manim-web、缺少什么、如何补齐，均由这里定义。
- `PY_API_MAP` / `PY_ANIMATE_METHODS`：支持面表本体（生成的），即哪些写法被支持、如何落地。
- `resolveSceneKind` / `SCENE_FAMILY`：场景族判定——`class X(ThreeDScene)` 需要一块真 3D 场景。
- `THREE_D_CAMERA_DEFAULTS` / `FRAME_HEIGHT`：3D 相机默认值与标准 frame 高度（画面高度恒为 8 单位）。
- `canonicalPackageName(name)`：包名归一化，浏览器与 Node 两端共用同一份实现。
- `HANDLE_KEY` / `GROUP_KEY` / `ANIMATE_KIND`：桥协议里的键名常量。

## 画布内部

- `loadManim()`：加载 manim-web 运行时。
- `createScene(container, manim, width, height, options?)`：创建一个场景（含上游补丁与 frame 归一化）。
- `createSceneSlot(container, manim, width, height, options?)`：创建一块**会被更换**的场景槽：初始为 2D，执行到 3D 场景时更换为真 3D 画布。
- `SURFACE_CLASS`：核心给容器加的类名常量。
- `injectKatexStyles(baseURL)`：注入 KaTeX 样式，幂等，按 URL 去重。

## 当前版本不提供的能力

逐项列出，便于判断某个界面能否实现。以下是当前版本的已知缺口，不是设计意图：

表中说的是 `run` 与**会话**的实时路径——「播到一半暂停 / 定位 / 逐帧」在另一条路上已经有了：把整段代码交给[时间轴回放](/api/playback)（`surface.createPlayback`），可以帧级定位、播放 / 暂停、按帧步进。

| 需求 | 当前的替代做法 |
| --- | --- |
| 「播放中 / 已暂停」状态与订阅 | 由调用侧维护一个 boolean：`run()` 之前置位，`await` 返回后清除 |
| 进度：第几步、共几步、已播时长 | 无替代；界面只能显示「渲染中」 |
| 播放中快进到最后一步 | 创建画布时传入 `fast: true`，销毁重建并整段重跑 |
| 跳到第 N 步、上一步、下一步 | 无替代 |
| 取消正在执行的那段并保留画布 | 无替代；`dispose()` 会连同画布一起销毁。「停止」按钮通常只是不再等待该 Promise，Python 仍会在队列中执行完毕 |
| 队列深度、自己排在第几 | 无替代；多画布场景需由调用方自行实现调度 |
| 接收用户代码的 `print` | 用低层的 `runPython(code, bridge, { output })` |
| 在 Node 里做预检 | 用 `manim-live/node` 的 `runPython` 与 `createDryRunBridge` 自行组合 |
