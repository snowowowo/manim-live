// 给上游写死的 AVC 等级打补丁。
//
// 起因（真机反馈，2026-10-24）：导出 1080p 直接报
//   The provided resolution (1920x1080) has a coded area (1920*1088=2088960) which exceeds
//   the maximum coded area (921600) supported by the AVC level (3.1) indicated by the codec
//   string (0x1F). You must either specify a lower resolution or higher AVC level.
//
// 原因不在我们这边：manim-web（0.39.4 / 0.40.0 都一样）把 AVC 的 codec 串写死成
// `avc1.42001f`——Baseline Profile、**Level 3.1**。Level 3.1 的宏块上限是 3600 块（= 1280×720），
// 1080p 是 8160 块，浏览器在 `configure()` 那一刻就拒绝，连一帧都编不出来。
// 而它的 `WebCodecsExportOptions` 只有 `codec: 'avc' | 'hevc' | 'vp9' | 'av1'`，没有等级可选，
// 传 `'avc1.420028'` 这种完整串也只会查表失败（表是按 `'avc'` 这种短名索引的）。
//
// 所以这里做一件最小的事：**导出期间**把 `window.VideoEncoder` 换成一个壳，`configure()` 时
// 按实际分辨率把 codec 串里的 level 字节抬到够用（1080p → 0x28 = Level 4.0），别的原样放过。
// 编码本身还是浏览器的原生实现，我们只改一个字符串——不是在重写导出器。
//
// 边界与去留：
//   · 只动 `window.VideoEncoder`，而且只在导出那几百毫秒的窗口内；导出结束（含抛错）立刻还原，
//     并发导出用计数，最后一个退出时才还原。
//   · 只往上抬、不往下降：浏览器/上游哪天自己写对了（等级更高），这里一字不改地放过。
//   · 上游一旦支持等级选项（或默认按分辨率选等级），整个文件删掉，`browser-video.ts` 里那层包装
//     一起删——这是临时补丁，不是我们的功能。

/** H.264 Level 的「最大帧尺寸」，单位是宏块（16×16）。取自 ITU-T H.264 表 A-1 的 MaxFS。 */
const AVC_LEVELS: ReadonlyArray<{ levelIdc: number; maxFrameMacroblocks: number }> = [
  { levelIdc: 10, maxFrameMacroblocks: 99 }, // 1.0
  { levelIdc: 11, maxFrameMacroblocks: 396 }, // 1.1
  { levelIdc: 12, maxFrameMacroblocks: 396 }, // 1.2
  { levelIdc: 13, maxFrameMacroblocks: 396 }, // 1.3
  { levelIdc: 20, maxFrameMacroblocks: 396 }, // 2.0
  { levelIdc: 21, maxFrameMacroblocks: 792 }, // 2.1
  { levelIdc: 22, maxFrameMacroblocks: 1620 }, // 2.2
  { levelIdc: 30, maxFrameMacroblocks: 1620 }, // 3.0
  { levelIdc: 31, maxFrameMacroblocks: 3600 }, // 3.1（= 1280×720，上游默认在这一档）
  { levelIdc: 32, maxFrameMacroblocks: 5120 }, // 3.2
  { levelIdc: 40, maxFrameMacroblocks: 8192 }, // 4.0（= 1920×1088，1080p 落在这一档）
  { levelIdc: 41, maxFrameMacroblocks: 8192 }, // 4.1
  { levelIdc: 42, maxFrameMacroblocks: 8704 }, // 4.2
  { levelIdc: 50, maxFrameMacroblocks: 22080 }, // 5.0
  { levelIdc: 51, maxFrameMacroblocks: 36864 }, // 5.1
  { levelIdc: 52, maxFrameMacroblocks: 36864 }, // 5.2
  { levelIdc: 60, maxFrameMacroblocks: 139264 }, // 6.0
  { levelIdc: 61, maxFrameMacroblocks: 139264 }, // 6.1
  { levelIdc: 62, maxFrameMacroblocks: 139264 }, // 6.2
]

/**
 * 这个尺寸至少要哪个 Level（返回 level_idc，例如 40 表示 4.0）。
 *
 * 按**宏块数**算而不是按像素算：浏览器的校验用的是对齐到 16 的 coded size
 * （1080 会被补成 1088，正是报错里那个 1920×1088），照像素算会差一点点而卡在临界。
 *
 * 尺寸未知（0）时返回 31，即上游原来的档位——没信息就不改。
 */
export function avcLevelFor(width: number, height: number): number {
  if (!(width > 0) || !(height > 0)) return 31
  const macroblocks = Math.ceil(width / 16) * Math.ceil(height / 16)
  for (const level of AVC_LEVELS) {
    if (macroblocks <= level.maxFrameMacroblocks) return level.levelIdc
  }
  return AVC_LEVELS[AVC_LEVELS.length - 1]!.levelIdc
}

/** `avc1.` 后面的六位十六进制：`profile_idc` / `constraint_flags` / `level_idc` 各一字节。 */
const AVC_CODEC = /^avc1\.([0-9a-fA-F]{6})$/

/**
 * 把一个 codec 串的 AVC 等级抬到「配得上这个分辨率」的档位；其余情况原样返回同一个字符串
 * （调用方靠 `===` 判断要不要新建配置对象）。
 */
export function adaptAvcCodec(codec: string, width: number, height: number): string {
  const matched = AVC_CODEC.exec(codec)
  if (matched === null) return codec
  const hex = matched[1]!.toLowerCase()
  const current = Number.parseInt(hex.slice(4), 16)
  const needed = avcLevelFor(width, height)
  if (!Number.isFinite(current) || needed <= current) return codec
  // 只换最后那个 level 字节，档位/约束位（Baseline、4:2:0 之类）一概不动。
  return `avc1.${hex.slice(0, 4)}${needed.toString(16).padStart(2, '0')}`
}

/** 把一个配置里需要抬等级的 codec 换掉；不需要就返回原对象。 */
function adaptConfig(config: VideoEncoderConfig): VideoEncoderConfig {
  const codec = adaptAvcCodec(config.codec, config.width, config.height)
  return codec === config.codec ? config : { ...config, codec }
}

/**
 * 造一个「会自己补等级」的 `VideoEncoder`。
 *
 * 用 Proxy 而不是子类：原生实例照旧是浏览器给的，我们只在它身上盖一个 `configure`，
 * 免得子类的构造语义在个别实现上出岔子。
 */
function levelAwareEncoder(Base: typeof VideoEncoder): typeof VideoEncoder {
  const proxy = new Proxy(Base, {
    construct(target, args) {
      const encoder = Reflect.construct(target, args) as VideoEncoder
      const configure = encoder.configure
      encoder.configure = (config: VideoEncoderConfig) => configure.call(encoder, adaptConfig(config))
      return encoder
    },
    get(target, property, receiver) {
      // 上游在透明通道那条路上会先问一句 isConfigSupported，同样得抬等级再问。
      if (property === 'isConfigSupported' && typeof target.isConfigSupported === 'function') {
        return (config: VideoEncoderConfig) => target.isConfigSupported(adaptConfig(config))
      }
      return Reflect.get(target, property, receiver)
    },
  })
  return proxy
}

/** 补丁的嵌套/并发层数：只有最外层上/下补丁，中途进来的直接复用。 */
let depth = 0
let saved: typeof VideoEncoder | undefined

/**
 * 在这个异步区间内让 `window.VideoEncoder` 按分辨率自动补 AVC 等级。
 *
 * 没有 WebCodecs（走 MediaRecorder 那条）时原样执行，什么都不动。
 */
export async function withAvcLevelAdapted<T>(run: () => Promise<T>): Promise<T> {
  const scope = globalThis as unknown as { VideoEncoder?: typeof VideoEncoder }
  const base = scope.VideoEncoder
  if (typeof base !== 'function') return run()

  if (depth === 0) {
    saved = base
    scope.VideoEncoder = levelAwareEncoder(base)
  }
  depth += 1
  try {
    return await run()
  } finally {
    depth -= 1
    if (depth === 0) {
      scope.VideoEncoder = saved ?? base
      saved = undefined
    }
  }
}
