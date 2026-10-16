"""三维向量 Vector3D

@expect 从原点伸出的带箭头向量，落在三根坐标轴之间。
@note 引擎扩展车道（from manim_live_extra import …）：标准 Manim 没有此图形——本机 CLI 导出会被前置门拒绝，只能浏览器渲染 / 逐帧导出。
"""

from manim import *
from manim_live_extra import Vector3D


class Vector3DScene(ThreeDScene):
    def construct(self):
        axes = ThreeDAxes()
        vector = Vector3D(end=[2, 1.5, 1.2], color=YELLOW)
        self.add(axes, vector)
