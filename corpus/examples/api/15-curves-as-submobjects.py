"""把一条曲线拆成子物体：CurvesAsSubmobjects

@expect 一条半圆弧，其中最前面一段被单独染成黄色（证明它真的按段拆成了子物体）。
@note 2026-10-13 随 manim-web 0.36 从 reject 转正（0.3.24 没有 CurvesAsSubmobjects）。
      下标取段（curves[0]）走适配层统一的 INDEX_GETTERS——本条同时钉这条取值路径。
"""

from manim import *


class CurvesAsSubmobjectsScene(Scene):
    def construct(self):
        arc = Arc(radius=2, start_angle=0, angle=PI)
        curves = CurvesAsSubmobjects(arc)
        curves[0].set_color(YELLOW)
        self.add(curves)
