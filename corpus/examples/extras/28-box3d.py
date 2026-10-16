"""长方体 Box3D

@expect 一根坐标轴上立着一个有明暗面的长方体，斜视角一眼是 3D。
@note 引擎扩展车道（from manim_live_extra import …）：标准 Manim 没有此图形——本机 CLI 导出会被前置门拒绝，只能浏览器渲染 / 逐帧导出。
"""

from manim import *
from manim_live_extra import Box3D


class Box3DScene(ThreeDScene):
    def construct(self):
        axes = ThreeDAxes()
        box = Box3D(width=2.5, height=1.6, depth=1.2)
        self.add(axes, box)
