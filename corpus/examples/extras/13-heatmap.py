"""标量场热图 HeatMap

@expect 一片按函数值着色的色块（中心亮、向外渐变），色带连续无网格线。
@note 引擎扩展车道：标准 Manim 没有此图形；本机 CLI 导出会被前置门拒绝。
      func 收 (x, y) 返回一个数——与 Surface 的（返回点）不同，返回标量无需过桥包装。
"""

from manim import *
from manim_live_extra import HeatMap


class HeatMapScene(Scene):
    def construct(self):
        field = HeatMap(func=lambda x, y: (x * x + y * y) / 25)
        self.play(FadeIn(field))
        self.wait(0.3)
