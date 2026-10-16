"""箱线图 BoxPlot

@expect 两组并排的箱线图（箱 + 须 + 离群点），左组数据整体高于右组。
@note 引擎扩展车道：标准 Manim 没有此图形；本机 CLI 导出会被前置门拒绝。
"""

from manim import *
from manim_live_extra import BoxPlot


class BoxPlotScene(Scene):
    def construct(self):
        plot = BoxPlot(data=[[62, 65, 68, 70, 72, 74, 76, 90], [40, 44, 48, 50, 52, 56, 58, 71]])
        self.play(Create(plot))
        self.wait(0.3)
