"""扩展图表：环图 DonutChart

@expect 中空的三色圆环（占比 3:2:1），中间能看到画布底色。
@note 引擎扩展车道：标准 Manim 没有此图形；本机 CLI 导出会被前置门拒绝。
"""

from manim import *
from manim_live_extra import DonutChart


class DonutChartScene(Scene):
    def construct(self):
        chart = DonutChart(values=[3, 2, 1], labels=["A", "B", "C"])
        self.play(Create(chart))
        self.wait(0.3)
