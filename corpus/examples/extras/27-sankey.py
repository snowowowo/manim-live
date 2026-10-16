"""桑基图 SankeyDiagram

@expect 两条左侧节点汇入两条右侧节点，带宽度与流量成正比的流带。
@note 引擎扩展车道（from manim_live_extra import …）：标准 Manim 没有此图形——本机 CLI 导出会被前置门拒绝，只能浏览器渲染 / 逐帧导出。
"""

from manim import *
from manim_live_extra import SankeyDiagram


class SankeyScene(Scene):
    def construct(self):
        diagram = SankeyDiagram(
            nodes=[{'id': 'A'}, {'id': 'B'}, {'id': 'C'}, {'id': 'D'}],
            links=[
                {'source': 'A', 'target': 'C', 'value': 3},
                {'source': 'A', 'target': 'D', 'value': 1},
                {'source': 'B', 'target': 'C', 'value': 2},
            ],
            height=4.0,
        )
        diagram.scale(0.85)
        self.play(Create(diagram))
        self.wait(0.3)
