"""全连接层 FeedForwardLayer

@expect 一列 4 个圆点，等距竖排。
@note 引擎扩展车道（from manim_live_extra import …）：标准 Manim 没有此图形——本机 CLI 导出会被前置门拒绝，只能浏览器渲染 / 逐帧导出。
"""

from manim import *
from manim_live_extra import FeedForwardLayer


class FeedForwardLayerScene(Scene):
    def construct(self):
        layer = FeedForwardLayer(num_nodes=4, node_radius=0.22, node_spacing=0.9)
        self.play(Create(layer))
        self.wait(0.3)
