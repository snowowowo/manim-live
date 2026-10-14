"""扩展图表：甘特图 GanttChart

@expect 两条时间条（调研在前、开发在后并有交叠），横轴是时间、行带任务名。
@note 引擎扩展车道：标准 Manim 没有此图形；本机 CLI 导出会被前置门拒绝。
      tasks 是字典列表（name / start / end / color），过桥后就是上游要的 GanttTask 数组。
"""

from manim import *
from manim_live_extra import GanttChart


class GanttScene(Scene):
    def construct(self):
        chart = GanttChart(tasks=[
            {"name": "调研", "start": 0, "end": 2, "color": BLUE},
            {"name": "开发", "start": 1.5, "end": 4, "color": GREEN},
        ])
        chart.move_to(ORIGIN)  # 上游图表类默认从原点往右上构图，不居中会偏出画面
        self.play(Create(chart))
        self.wait(0.3)
