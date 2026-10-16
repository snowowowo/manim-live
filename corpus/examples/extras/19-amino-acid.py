"""氨基酸链 AminoAcidChain

@expect 一串按残基着色的圆珠，圆珠之间有肽键连线。
@note 引擎扩展车道（from manim_live_extra import …）：标准 Manim 没有此图形——本机 CLI 导出会被前置门拒绝，只能浏览器渲染 / 逐帧导出。
"""

from manim import *
from manim_live_extra import AminoAcidChain


class AminoAcidScene(Scene):
    def construct(self):
        chain = AminoAcidChain(residues=['G', 'A', 'V', 'L', 'K'], bead_radius=0.22)
        chain.scale(1.1)
        self.play(Create(chain))
        self.wait(0.3)
