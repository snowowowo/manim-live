/**
 * 导出画质只有两个可调参数，钉在这儿免得被「顺手改小」：
 *
 * 1. 帧率必须跟屏幕一致（60）——30fps 下点沿曲线走、文字上浮都有台阶，成片比屏幕上更显眼；
 * 2. 码率随**像素数 × 帧率**走，不能写死。写死一个数时，分辨率一变就会偏糊，
 *    而这是最不容易在开发机上发现的那类退化（小窗预览看着还行）。
 */
import { describe, expect, it } from 'vitest'
import { bitrateFor, upscaleForExport } from './browser-video.ts'

describe('bitrateFor：码率跟着像素与帧率走', () => {
  it('720p 给足（≥6Mbps），不再是上游的 5Mbps 默认值', () => {
    expect(bitrateFor(1280, 720)).toBeGreaterThanOrEqual(6_000_000)
  })

  it('1080p 明显高于 720p（像素多了 2.25 倍）', () => {
    expect(bitrateFor(1920, 1080)).toBeGreaterThan(bitrateFor(1280, 720))
    expect(bitrateFor(1920, 1080) / bitrateFor(1280, 720)).toBeCloseTo(2.25, 1)
  })

  it('有上限：再大也不超过 32Mbps（教学动画没有可见收益，只让文件难分享）', () => {
    expect(bitrateFor(7680, 4320)).toBe(32_000_000)
  })

  it('尺寸还不知道时给一个能用的兜底值，不抛错', () => {
    expect(bitrateFor(0, 0)).toBe(8_000_000)
  })
})

/** 场景替身：只记 resize 与 seek 的调用，不碰真渲染。 */
function sceneStub(width: number, height: number, overrides: Record<string, unknown> = {}) {
  const resizes: Array<[number, number]> = []
  const seeks: number[] = []
  return {
    scene: {
      getWidth: () => width,
      getHeight: () => height,
      resize: (w: number, h: number) => {
        resizes.push([w, h])
      },
      seek: (time: number) => {
        seeks.push(time)
      },
      getTimelineDuration: () => 4,
      ...overrides,
    },
    resizes,
    seeks,
  }
}

describe('upscaleForExport：导出真的按 1080p 渲染', () => {
  it('720p 的画布放大到 1920×1080（等比）', () => {
    const { scene, resizes } = sceneStub(1280, 720)
    upscaleForExport(scene)
    expect(resizes[0]).toEqual([1920, 1080])
  })

  it('还原时换回原尺寸，并 seek 到末尾把画面留在终态', () => {
    const { scene, resizes, seeks } = sceneStub(1280, 720)
    const restore = upscaleForExport(scene)
    restore()
    expect(resizes[1]).toEqual([1280, 720])
    expect(seeks).toEqual([4])
  })

  it('本来就有 1080p 或更大 —— 不动它，也不多渲染一遍', () => {
    const { scene, resizes } = sceneStub(1920, 1080)
    const restore = upscaleForExport(scene)
    restore()
    expect(resizes).toEqual([])
  })

  it('非 16:9 按短边放大，不越出 1920×1080 的框', () => {
    const { scene, resizes } = sceneStub(1000, 1000)
    upscaleForExport(scene)
    expect(resizes[0]).toEqual([1080, 1080])
  })

  it('没有 resize 能力（无头 / 老场景）—— 安静跳过，不抛错', () => {
    const { scene } = sceneStub(1280, 720, { resize: undefined })
    expect(() => upscaleForExport(scene)()).not.toThrow()
  })

  it('放大自己失败了 —— 退回原尺寸导出，不算导出失败', () => {
    const { scene } = sceneStub(1280, 720, {
      resize: () => {
        throw new Error('WebGL context lost')
      },
    })
    const restore = upscaleForExport(scene)
    expect(() => restore()).not.toThrow()
  })
})
