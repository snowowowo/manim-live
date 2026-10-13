"""带背景框的标签：Label

@expect 一个黄字标签「重要」浮在一个点的上方，文字背后有填色背景框（不是裸文字）。
@note 2026-10-13 随 manim-web 0.36 从 reject 转正（0.3.24 没有 Label）。
      CE 的 Label(label, …, **kwargs) 会把多余关键字透给文字；manim-web 的选项只有
      labelConfig / boxConfig / frameConfig 三个去处——适配层把多余关键字折进 labelConfig。
"""

from manim import *


class LabelScene(Scene):
    def construct(self):
        label = Label("重要", color=YELLOW)
        label.next_to(Dot(), UP)
        self.add(label)
