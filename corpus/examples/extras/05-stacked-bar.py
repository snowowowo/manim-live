"""扩展图表：堆叠柱状图 StackedBarChart

@expect 三根柱子，每根由两段颜色堆成（下蓝上绿），带图例。
@note 引擎扩展车道：标准 Manim 没有此图形；本机 CLI 导出会被前置门拒绝。
"""

from manim import *
from manim_live_extra import StackedBarChart


class StackedBarScene(Scene):
    def construct(self):
        chart = StackedBarChart(values=[[3, 4, 2], [2, 1, 4]], series_names=["线上", "线下"])
        self.play(Create(chart))
        self.wait(0.3)
