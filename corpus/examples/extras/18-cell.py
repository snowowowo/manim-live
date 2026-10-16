"""细胞图 Cell

@expect 圆形细胞膜 + 细胞核 + 若干带标注的细胞器。
@note 引擎扩展车道（from manim_live_extra import …）：标准 Manim 没有此图形——本机 CLI 导出会被前置门拒绝，只能浏览器渲染 / 逐帧导出。
"""

from manim import *
from manim_live_extra import Cell


class CellScene(Scene):
    def construct(self):
        cell = Cell(labels=True)
        self.play(Create(cell))
        self.wait(0.3)
