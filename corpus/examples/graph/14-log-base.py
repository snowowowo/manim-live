"""对数刻度坐标系：LogBase

@expect 一条对数刻度的坐标轴：1 / 10 / 100 / 1000 的间距按对数拉开（越往右越密）。
@note 2026-10-13 随 manim-web 0.36 从 reject 转正（0.3.24 没有 LogBase）。
"""

from manim import *


class LogBaseScene(Scene):
    def construct(self):
        axes = LogBase(base=10, x_range=[1, 1000])
        self.add(axes)
