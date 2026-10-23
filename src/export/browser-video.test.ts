/**
 * 导出画质只有两个可调参数，钉在这儿免得被「顺手改小」：
 *
 * 1. 帧率必须跟屏幕一致（60）——30fps 下点沿曲线走、文字上浮都有台阶，成片比屏幕上更显眼；
 * 2. 码率随**像素数 × 帧率**走，不能写死。写死一个数时，分辨率一变就会偏糊，
 *    而这是最不容易在开发机上发现的那类退化（小窗预览看着还行）。
 */
import { describe, expect, it } from 'vitest'
import { bitrateFor, fitCanvasForExport } from './browser-video.ts'

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

  it('同分辨率下 30fps 的码率约为 60fps 的一半（档位调低要真的省字节，不只是省帧数）', () => {
    expect(bitrateFor(1920, 1080, 30) / bitrateFor(1920, 1080, 60)).toBeCloseTo(0.5, 1)
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

describe('fitCanvasForExport：成片像素 = 档位像素（按 dpr 折算）', () => {
  it('dpr=1、1280×720 的卡选 1080p：resize 到 1920×1080', () => {
    const { scene, resizes } = sceneStub(1280, 720)
    const plan = fitCanvasForExport(scene, 1080, 1)
    expect(resizes[0]).toEqual([1920, 1080])
    expect([plan.width, plan.height]).toEqual([1920, 1080])
  })

  it('dpr=2、640×360 的卡选 720p：画布本来就是 1280×720，一次都不 resize', () => {
    // 这是默认档的常见情形（视网膜屏 + 卡片 640 宽）：渲染像素正好等于成片像素，不白烧四倍。
    const { scene, resizes } = sceneStub(640, 360)
    const plan = fitCanvasForExport(scene, 720, 2)
    expect(resizes).toEqual([])
    expect([plan.width, plan.height]).toEqual([1280, 720])
  })

  it('dpr=2、640×360 的卡选 1080p：按 CSS 960×540 放（画布正好 1920×1080，不是 3840×2160）', () => {
    const { scene, resizes } = sceneStub(640, 360)
    const plan = fitCanvasForExport(scene, 1080, 2)
    expect(resizes[0]).toEqual([960, 540])
    expect([plan.width, plan.height]).toEqual([1920, 1080])
  })

  it('画布本来就比档位大：收回来（档位是承诺，全屏的卡不该偷偷出 1440p）', () => {
    const { scene, resizes } = sceneStub(2560, 1440)
    const plan = fitCanvasForExport(scene, 720, 1)
    expect(resizes[0]).toEqual([1280, 720])
    expect([plan.width, plan.height]).toEqual([1280, 720])
  })

  it('非 16:9 按短边等比缩，不越出档位像素框', () => {
    const { scene, resizes } = sceneStub(1000, 1000)
    fitCanvasForExport(scene, 1080, 1)
    expect(resizes[0]).toEqual([1080, 1080])
  })

  it('还原：换回原 CSS 尺寸，并 seek 到末尾把画面留在终态', () => {
    const { scene, resizes, seeks } = sceneStub(640, 360)
    const plan = fitCanvasForExport(scene, 1080, 2)
    plan.restore()
    expect(resizes[1]).toEqual([640, 360])
    expect(seeks).toEqual([4])
  })

  it('像素取偶数（H.264 按宏块对齐，奇数只会被编码器补齐）', () => {
    const { scene, resizes } = sceneStub(801, 601)
    const plan = fitCanvasForExport(scene, 720, 1)
    expect(plan.width % 2).toBe(0)
    expect(plan.height % 2).toBe(0)
    expect(resizes).toHaveLength(1)
  })

  it('比率不可信（0 / NaN / 负数）时当 1 处理，不把画布算成 0 宽', () => {
    for (const ratio of [0, Number.NaN, -2]) {
      const { scene, resizes } = sceneStub(1280, 720)
      const plan = fitCanvasForExport(scene, 1080, ratio)
      expect([plan.width, plan.height]).toEqual([1920, 1080])
      expect(resizes[0]).toEqual([1920, 1080])
    }
  })

  it('没有 resize 能力（无头 / 老场景）—— 安静跳过，尺寸交给调用方看实际画布', () => {
    const { scene } = sceneStub(1280, 720, { resize: undefined })
    const plan = fitCanvasForExport(scene, 1080, 1)
    expect([plan.width, plan.height]).toEqual([0, 0])
    expect(() => plan.restore()).not.toThrow()
  })

  it('改尺寸自己失败了 —— 退回原尺寸导出，不算导出失败', () => {
    const { scene } = sceneStub(1280, 720, {
      resize: () => {
        throw new Error('WebGL context lost')
      },
    })
    const plan = fitCanvasForExport(scene, 1080, 1)
    expect([plan.width, plan.height]).toEqual([0, 0])
    expect(() => plan.restore()).not.toThrow()
  })
})
