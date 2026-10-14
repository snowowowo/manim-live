"""扩展图表：雷达图 RadarChart

@expect 五边形网格上叠一个数据多边形（五个维度数值不一），维度带标签。
@note 引擎扩展车道：标准 Manim 没有此图形；本机 CLI 导出会被前置门拒绝。
"""

from manim import *
from manim_live_extra import RadarChart


class RadarChartScene(Scene):
    def construct(self):
        chart = RadarChart(
            data=[0.9, 0.6, 0.75, 0.5, 0.8],
            categories=["速度", "准确", "成本", "覆盖", "易用"],
        )
        self.play(Create(chart))
        self.wait(0.3)
