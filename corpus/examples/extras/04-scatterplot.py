"""扩展图表：散点图 ScatterPlot

@expect 一片正相关的散点（x 越大 y 越大），坐标轴自动生成。
@note 引擎扩展车道：标准 Manim 没有此图形；本机 CLI 导出会被前置门拒绝。
"""

from manim import *
from manim_live_extra import ScatterPlot


class ScatterPlotScene(Scene):
    def construct(self):
        x = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
        y = [0.1, 0.9, 2.2, 2.8, 4.1, 5.0, 5.9, 7.2, 7.9, 9.1]
        plot = ScatterPlot(x=x, y=y)
        self.play(Create(plot))
        self.wait(0.3)
