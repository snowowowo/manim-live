"""分子结构式 MoleculeMobject

@expect 水分子的骨架式：氧原子标 O、两个氢原子标 H，原子之间是键线。
@note 引擎扩展车道（from manim_live_extra import …）：标准 Manim 没有此图形——本机 CLI 导出会被前置门拒绝，只能浏览器渲染 / 逐帧导出。
"""

from manim import *
from manim_live_extra import MoleculeMobject


class MoleculeScene(Scene):
    def construct(self):
        molecule = MoleculeMobject(
            atoms=[
                {'element': 'O', 'x': 0.0, 'y': 0.0},
                {'element': 'H', 'x': 1.4, 'y': 0.0},
                {'element': 'H', 'x': -0.5, 'y': 1.2},
            ],
            bonds=[{'from': 0, 'to': 1}, {'from': 0, 'to': 2}],
            bond_length=1.2,
        )
        self.play(Create(molecule))
        self.wait(0.3)
