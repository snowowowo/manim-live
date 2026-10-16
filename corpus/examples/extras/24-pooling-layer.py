"""池化层 PoolingLayer

@expect 三张 2×2 的特征图方块，横向并排。
@note 引擎扩展车道（from manim_live_extra import …）：标准 Manim 没有此图形——本机 CLI 导出会被前置门拒绝，只能浏览器渲染 / 逐帧导出。
"""

from manim import *
from manim_live_extra import PoolingLayer


class PoolingLayerScene(Scene):
    def construct(self):
        layer = PoolingLayer(num_feature_maps=3, map_size=2)
        self.play(Create(layer))
        self.wait(0.3)
