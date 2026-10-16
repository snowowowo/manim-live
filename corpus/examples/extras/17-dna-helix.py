"""DNA 双螺旋 DNAHelix

@expect 两条反向缠绕的骨架带与之间的碱基横档，按碱基着色。
@note 引擎扩展车道（from manim_live_extra import …）：标准 Manim 没有此图形——本机 CLI 导出会被前置门拒绝，只能浏览器渲染 / 逐帧导出。
"""

from manim import *
from manim_live_extra import DNAHelix


class DNAHelixScene(Scene):
    def construct(self):
        helix = DNAHelix(sequence=['A', 'T', 'G', 'C', 'A'], turns=1.5, radius=1.2)
        helix.scale(0.9)
        self.play(Create(helix))
        self.wait(0.3)
