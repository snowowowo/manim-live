"""小提琴图 ViolinPlot

@expect 两把「小提琴」（核密度轮廓）并排，提琴宽度随数据密度起伏。
@note 引擎扩展车道：标准 Manim 没有此图形；本机 CLI 导出会被前置门拒绝。
"""

from manim import *
from manim_live_extra import ViolinPlot


class ViolinPlotScene(Scene):
    def construct(self):
        plot = ViolinPlot(data=[[1, 1.2, 1.3, 2, 2.1, 2.2, 2.9], [1.8, 2.5, 3, 3.1, 3.2, 4, 4.2]])
        self.play(Create(plot))
        self.wait(0.3)
