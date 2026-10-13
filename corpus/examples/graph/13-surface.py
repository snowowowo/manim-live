"""参数曲面：Surface

@expect 一块由 u·v 张成的马鞍形曲面（棋盘格双色），配三根坐标轴，斜视角一眼是 3D。
@note 2026-10-13 随 manim-web 0.36 从 reject 转正（0.3.24 没有 Surface）。
      CE 的 func 收 (u, v) 返回一个点——适配层把它包成 manim-web 要的 (u, v) => [x, y, z]，
      实参常写成 axes.c2p(…)，返回值是 ndarray，过桥前先降成普通数组（见 manim-shim 的 _surface）。
"""

from manim import *


class SurfaceScene(ThreeDScene):
    def construct(self):
        axes = ThreeDAxes()
        surface = Surface(lambda u, v: axes.c2p(u, v, u * v), u_range=[-2, 2], v_range=[-2, 2])
        self.add(axes, surface)
