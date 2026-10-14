"""扩展图表：日历热图 CalendarHeatmap

@expect 一排按周对齐的格子（日历），颜色深浅随每天的数值变化。
@note 引擎扩展车道：标准 Manim 没有此图形；本机 CLI 导出会被前置门拒绝。
"""

from manim import *
from manim_live_extra import CalendarHeatmap


class CalendarScene(Scene):
    def construct(self):
        data = [{"date": f"2026-06-{day:02d}", "value": (day * 7) % 11} for day in range(1, 29)]
        chart = CalendarHeatmap(data=data)
        chart.move_to(ORIGIN)  # 上游图表类默认从原点往右上构图，不居中会偏出画面
        self.play(Create(chart))
        self.wait(0.3)
