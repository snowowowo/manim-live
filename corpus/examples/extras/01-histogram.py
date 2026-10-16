"""直方图 Histogram

@expect 四根柱子的直方图，柱高按各桶计数、右高左低，坐标轴自动生成。
@note 引擎扩展车道（from manim_live_extra import …）：标准 Manim 没有此图形——本机 CLI 导出会被前置门拒绝，只能浏览器渲染 / 逐帧导出。
"""

from manim import *
from manim_live_extra import Histogram


class HistogramScene(Scene):
    def construct(self):
        hist = Histogram(data=[1, 2, 2, 3, 3, 3, 4, 4, 5], bins=4, fill_opacity=0.8)
        self.play(Create(hist))
        self.wait(0.3)
