"""神经网络 NeuralNetwork

@expect 三层节点从左到右排开、相邻层之间连满线，整体在画面中央。
@note 引擎扩展车道（from manim_live_extra import …）：标准 Manim 没有此图形——本机 CLI 导出会被前置门拒绝，只能浏览器渲染 / 逐帧导出。
"""

from manim import *
from manim_live_extra import NeuralNetwork, FeedForwardLayer


class NeuralNetworkScene(Scene):
    def construct(self):
        net = NeuralNetwork(
            [
                FeedForwardLayer(num_nodes=3),
                FeedForwardLayer(num_nodes=4),
                FeedForwardLayer(num_nodes=2),
            ],
            layer_spacing=2.0,
        )
        net.scale(0.8)
        self.play(Create(net))
        self.wait(0.3)
