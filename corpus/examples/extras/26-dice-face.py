"""骰子面 DiceFace

@expect 一个圆角方块，上面按 5 点排布五颗圆点。
@note 引擎扩展车道（from manim_live_extra import …）：标准 Manim 没有此图形——本机 CLI 导出会被前置门拒绝，只能浏览器渲染 / 逐帧导出。
"""

from manim import *
from manim_live_extra import DiceFace


class DiceFaceScene(Scene):
    def construct(self):
        dice = DiceFace(value=5, size=1.6, dot_radius=0.09)
        self.play(Create(dice))
        self.wait(0.3)
