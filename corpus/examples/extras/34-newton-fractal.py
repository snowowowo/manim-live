"""牛顿分形 NewtonFractal

@expect 一块按三次单位根分区的三色分形，边界处有细密纹理。
@note 引擎扩展车道（from manim_live_extra import …）：标准 Manim 没有此图形——本机 CLI 导出会被前置门拒绝，只能浏览器渲染 / 逐帧导出。
"""

from manim import *
from manim_live_extra import NewtonFractal


class NewtonFractalScene(Scene):
    def construct(self):
        fractal = NewtonFractal(width=6.0, height=3.6)
        self.add(fractal)
        self.wait(0.3)
