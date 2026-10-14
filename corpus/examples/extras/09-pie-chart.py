"""扩展图表：饼图 PieChart

@expect 一张三块的饼（占比 2:1:1），每块带文字标签。
@note 引擎扩展车道：标准 Manim 没有此图形；本机 CLI 导出会被前置门拒绝。
"""

from manim import *
from manim_live_extra import PieChart


class PieChartScene(Scene):
    def construct(self):
        chart = PieChart(values=[5, 2.5, 2.5], labels=["甲", "乙", "丙"])
        self.play(Create(chart))
        self.wait(0.3)
