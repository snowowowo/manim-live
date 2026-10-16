"""曲面 Surface3D

@expect 一块向上翘起的抛物面，配三根坐标轴。
@note 与 CE 的 Surface 同类但走扩展车道（manim-web 的 Surface3D）——标准 Manim 没有这个名字。
@note 引擎扩展车道（from manim_live_extra import …）：标准 Manim 没有此图形——本机 CLI 导出会被前置门拒绝，只能浏览器渲染 / 逐帧导出。
"""

from manim import *
from manim_live_extra import Surface3D


class Surface3DScene(ThreeDScene):
    def construct(self):
        axes = ThreeDAxes()
        surface = Surface3D(
            func=lambda u, v: axes.c2p(u, v, 0.4 * (u * u - v * v)),
            u_range=[-2, 2],
            v_range=[-2, 2],
        )
        self.add(axes, surface)
