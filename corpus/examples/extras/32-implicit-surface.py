"""隐式曲面 ImplicitSurface

@expect 一个由 x²+y²+z²=1 等值面剖出来的球面。
@note 引擎扩展车道（from manim_live_extra import …）：标准 Manim 没有此图形——本机 CLI 导出会被前置门拒绝，只能浏览器渲染 / 逐帧导出。
"""

from manim import *
from manim_live_extra import ImplicitSurface


class ImplicitSurfaceScene(ThreeDScene):
    def construct(self):
        sphere = ImplicitSurface(
            func=lambda x, y, z: x * x + y * y + z * z - 1,
            x_range=[-1.5, 1.5],
            y_range=[-1.5, 1.5],
            z_range=[-1.5, 1.5],
        )
        self.add(sphere)
