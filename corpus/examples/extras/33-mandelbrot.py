"""曼德博集 MandelbrotSet

@expect 一块完整的分形图：心形主体加周边小圆盘，边界有色带。
@note 引擎扩展车道（from manim_live_extra import …）：标准 Manim 没有此图形——本机 CLI 导出会被前置门拒绝，只能浏览器渲染 / 逐帧导出。
"""

from manim import *
from manim_live_extra import MandelbrotSet


class MandelbrotScene(Scene):
    def construct(self):
        mandelbrot = MandelbrotSet(width=6.0, height=3.6, max_iterations=120)
        self.add(mandelbrot)
        self.wait(0.3)
