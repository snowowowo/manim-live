"""扩展图表：阶梯图 StepChart

@expect 一条台阶状的折线（数据点之间水平 / 垂直跳变），各点带圆点。
@note 引擎扩展车道：标准 Manim 没有此图形；本机 CLI 导出会被前置门拒绝。
"""

from manim import *
from manim_live_extra import StepChart


class StepChartScene(Scene):
    def construct(self):
        chart = StepChart(values=[1, 1, 3, 3, 2, 2, 5], show_dots=True)
        self.play(Create(chart))
        self.wait(0.3)
