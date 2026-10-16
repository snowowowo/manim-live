"""等值线图 ContourPlot

@expect 同心闭合的等值线（马鞍面上若干圈），线密的地方梯度大。
@note 引擎扩展车道：标准 Manim 没有此图形；本机 CLI 导出会被前置门拒绝。
      多变量微积分（梯度 / 山脊 / 鞍点）的直接教具。
"""

from manim import *
from manim_live_extra import ContourPlot


class ContourScene(Scene):
    def construct(self):
        field = ContourPlot(func=lambda x, y: (x * x - y * y) / 8)
        self.play(Create(field))
        self.wait(0.3)
