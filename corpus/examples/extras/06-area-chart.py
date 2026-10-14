"""扩展图表：面积图 AreaChart

@expect 两条填充到基线的面积带（颜色不同、部分重叠），随 x 起伏。
@note 引擎扩展车道：标准 Manim 没有此图形；本机 CLI 导出会被前置门拒绝。
"""

from manim import *
from manim_live_extra import AreaChart


class AreaChartScene(Scene):
    def construct(self):
        chart = AreaChart(values=[[1, 3, 2, 4, 3, 5], [2, 2, 3, 2, 4, 3]])
        self.play(Create(chart))
        self.wait(0.3)
