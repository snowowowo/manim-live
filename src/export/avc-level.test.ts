/**
 * 这组测试钉的是「1080p 导出为什么不再报 Level 3.1 超限」：
 *
 * 上游把 AVC 等级写死成 3.1（上限 1280×720），所以浏览器在 configure() 就拒绝 1920×1080。
 * 我们只在导出期间把等级字节抬高，其余一字不动。测试分两层：
 * 1. 纯函数：按宏块数算等级、只换 level 字节；
 * 2. 包装：真的换掉 `VideoEncoder` 里拿到的配置，且不管成功/抛错/嵌套都还原。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { adaptAvcCodec, avcLevelFor, withAvcLevelAdapted } from './avc-level.ts'

describe('avcLevelFor：等级按宏块数选（浏览器就是这么算的）', () => {
  it('720p 正好是 Level 3.1 的边界（120×45 = 3600 宏块）', () => {
    expect(avcLevelFor(1280, 720)).toBe(31)
  })

  it('1080p 要 Level 4.0 —— 报错里那个 1920×1088 = 8160 宏块', () => {
    expect(avcLevelFor(1920, 1080)).toBe(40)
  })

  it('再过一档：1440p 要 Level 5.0', () => {
    expect(avcLevelFor(2560, 1440)).toBe(50)
  })

  it('720p 多 16 像素高就跨档（1088 高 = 3680 宏块 > 3600）', () => {
    expect(avcLevelFor(1280, 736)).toBe(32)
  })

  it('尺寸未知时不动（回落到上游原来的 3.1）', () => {
    expect(avcLevelFor(0, 0)).toBe(31)
    expect(avcLevelFor(Number.NaN, 720)).toBe(31)
  })
})

describe('avcLevelFor：帧率也是硬上限（MaxMBPS）', () => {
  it('1080p60 = 8160×60 = 489600 宏块/秒，Level 4.0（245760）不够，要 4.2', () => {
    // 这就是为什么真机成片 SPS 里写的是 4.2：编码器自己按帧率抬了，只是不认我们传的串。
    expect(avcLevelFor(1920, 1080, 60)).toBe(42)
  })

  it('1080p30 仍是 4.0（8160×30 = 244800 刚好在 245760 以内）', () => {
    expect(avcLevelFor(1920, 1080, 30)).toBe(40)
  })

  it('720p30 一动不动（3600×30 = 108000，正好卡满 3.1）', () => {
    expect(avcLevelFor(1280, 720, 30)).toBe(31)
  })

  it('720p60 要 3.2（帧尺寸还是 3.1，但每秒宏块翻倍到 216000）', () => {
    expect(avcLevelFor(1280, 720, 60)).toBe(32)
  })

  it('不传帧率 / 传 0 / 传 NaN：只按帧尺寸算（宁可少抬）', () => {
    expect(avcLevelFor(1920, 1080)).toBe(40)
    expect(avcLevelFor(1920, 1080, 0)).toBe(40)
    expect(avcLevelFor(1920, 1080, Number.NaN)).toBe(40)
  })
})

describe('adaptAvcCodec：只换最后那个等级字节', () => {
  it('1080p：avc1.42001f（3.1）→ avc1.420028（4.0）', () => {
    expect(adaptAvcCodec('avc1.42001f', 1920, 1080)).toBe('avc1.420028')
  })

  it('720p：等级已经够，原样返回（连字符串都不新建）', () => {
    const codec = 'avc1.42001f'
    expect(adaptAvcCodec(codec, 1280, 720)).toBe(codec)
  })

  it('档位/约束位一律不动：High Profile 的 64001f → 640028', () => {
    expect(adaptAvcCodec('avc1.64001f', 1920, 1080)).toBe('avc1.640028')
  })

  it('等级本来就够高 —— 不往下降', () => {
    expect(adaptAvcCodec('avc1.640033', 1920, 1080)).toBe('avc1.640033')
  })

  it('1080p60：抬到 4.2（0x2a），不是只抬到 4.0', () => {
    expect(adaptAvcCodec('avc1.42001f', 1920, 1080, 60)).toBe('avc1.42002a')
  })

  it('不是 AVC（vp9 / av01 / hev1）不碰', () => {
    expect(adaptAvcCodec('vp09.00.10.08', 1920, 1080)).toBe('vp09.00.10.08')
    expect(adaptAvcCodec('av01.0.04M.08', 1920, 1080)).toBe('av01.0.04M.08')
    expect(adaptAvcCodec('hev1.1.6.L93.B0', 1920, 1080)).toBe('hev1.1.6.L93.B0')
  })
})

/** 假编码器：只记 configure 收到的配置，不真编码。 */
class FakeEncoder {
  static readonly instances: FakeEncoder[] = []
  static configured: VideoEncoderConfig[] = []

  configured: VideoEncoderConfig | null = null

  constructor(_init?: unknown) {
    FakeEncoder.instances.push(this)
  }

  configure(config: VideoEncoderConfig): void {
    this.configured = config
    FakeEncoder.configured.push(config)
  }

  static isSupported(): boolean {
    return true
  }

  static async isConfigSupported(config: VideoEncoderConfig) {
    return { supported: true, config }
  }
}

/** 装一个假编码器到全局，返回「取回原值」的函数。 */
function installFakeEncoder(): () => void {
  const original = (globalThis as { VideoEncoder?: unknown }).VideoEncoder
  ;(globalThis as { VideoEncoder?: unknown }).VideoEncoder = FakeEncoder
  return () => {
    ;(globalThis as { VideoEncoder?: unknown }).VideoEncoder = original
  }
}

afterEach(() => {
  vi.restoreAllMocks()
  FakeEncoder.instances.length = 0
  FakeEncoder.configured = []
})

describe('withAvcLevelAdapted：导出期间才补等级，结束就还原', () => {
  it('1080p 的配置在 configure() 时被换成 Level 4.0', async () => {
    const restore = installFakeEncoder()
    try {
      await withAvcLevelAdapted(async () => {
        const Encoder = (globalThis as { VideoEncoder: new (init?: unknown) => FakeEncoder }).VideoEncoder
        const encoder = new Encoder({})
        encoder.configure({ codec: 'avc1.42001f', width: 1920, height: 1080, bitrate: 15_000_000 })
        expect(encoder.configured?.codec).toBe('avc1.420028')
        // 其它字段原样带过去
        expect(encoder.configured?.bitrate).toBe(15_000_000)
      })
    } finally {
      restore()
    }
  })

  it('配置里的 framerate 会被算进等级（1080p60 → 4.2）', async () => {
    const restore = installFakeEncoder()
    try {
      await withAvcLevelAdapted(async () => {
        const Encoder = (globalThis as { VideoEncoder: new (init?: unknown) => FakeEncoder }).VideoEncoder
        const encoder = new Encoder({})
        encoder.configure({
          codec: 'avc1.42001f',
          width: 1920,
          height: 1080,
          bitrate: 15_000_000,
          framerate: 60,
        })
        expect(encoder.configured?.codec).toBe('avc1.42002a')
        expect(encoder.configured?.framerate).toBe(60)
      })
    } finally {
      restore()
    }
  })

  it('720p 的配置一动不动（同一个对象传下去，不白造）', async () => {
    const restore = installFakeEncoder()
    try {
      await withAvcLevelAdapted(async () => {
        const Encoder = (globalThis as { VideoEncoder: new (init?: unknown) => FakeEncoder }).VideoEncoder
        const encoder = new Encoder({})
        const config = { codec: 'avc1.42001f', width: 1280, height: 720 }
        encoder.configure(config as VideoEncoderConfig)
        expect(encoder.configured).toBe(config)
      })
    } finally {
      restore()
    }
  })

  it('isConfigSupported 也按抬过等级的串去问', async () => {
    const restore = installFakeEncoder()
    const spy = vi.spyOn(FakeEncoder, 'isConfigSupported')
    try {
      await withAvcLevelAdapted(async () => {
        const Encoder = (globalThis as unknown as { VideoEncoder: typeof FakeEncoder }).VideoEncoder
        await Encoder.isConfigSupported({ codec: 'avc1.42001f', width: 1920, height: 1080 })
      })
      expect(spy.mock.calls[0]?.[0].codec).toBe('avc1.420028')
    } finally {
      restore()
    }
  })

  it('跑完还原：全局还是原来那个编码器', async () => {
    const restore = installFakeEncoder()
    try {
      await withAvcLevelAdapted(async () => {})
      expect((globalThis as unknown as { VideoEncoder: unknown }).VideoEncoder).toBe(FakeEncoder)
    } finally {
      restore()
    }
  })

  it('抛错也还原（不然整页的 WebCodecs 都被换成壳）', async () => {
    const restore = installFakeEncoder()
    try {
      await expect(
        withAvcLevelAdapted(async () => {
          throw new Error('编码器炸了')
        }),
      ).rejects.toThrow('编码器炸了')
      expect((globalThis as unknown as { VideoEncoder: unknown }).VideoEncoder).toBe(FakeEncoder)
    } finally {
      restore()
    }
  })

  it('嵌套/并发：中途那层不会提前还原，最后一个退出才还原', async () => {
    const restore = installFakeEncoder()
    try {
      let patchInsideInner: unknown
      await withAvcLevelAdapted(async () => {
        await withAvcLevelAdapted(async () => {
          patchInsideInner = (globalThis as unknown as { VideoEncoder: unknown }).VideoEncoder
          expect(patchInsideInner).not.toBe(FakeEncoder)
        })
        // 内层退出后仍然处于被包装状态
        expect((globalThis as unknown as { VideoEncoder: unknown }).VideoEncoder).toBe(patchInsideInner)
      })
      expect((globalThis as unknown as { VideoEncoder: unknown }).VideoEncoder).toBe(FakeEncoder)
    } finally {
      restore()
    }
  })

  it('没有 WebCodecs（只剩 MediaRecorder）—— 什么都不动，照常执行', async () => {
    const original = (globalThis as { VideoEncoder?: unknown }).VideoEncoder
    delete (globalThis as { VideoEncoder?: unknown }).VideoEncoder
    try {
      const run = vi.fn(async () => 'ok')
      await expect(withAvcLevelAdapted(run)).resolves.toBe('ok')
      expect(run).toHaveBeenCalledTimes(1)
      expect((globalThis as { VideoEncoder?: unknown }).VideoEncoder).toBeUndefined()
    } finally {
      ;(globalThis as { VideoEncoder?: unknown }).VideoEncoder = original
    }
  })
})
