"""线性刻度坐标系：LinearBase

@expect 一组带刻度的 x / y 坐标轴，刻度等距（线性刻度）。
@note 2026-10-13 随 manim-web 0.36 从 reject 转正（0.3.24 没有 LinearBase）。
"""

from manim import *


class LinearBaseScene(Scene):
    def construct(self):
        axes = LinearBase(x_range=[-4, 4], y_range=[-2, 2])
        self.add(axes)
