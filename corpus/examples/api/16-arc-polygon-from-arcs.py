"""用现成的弧拼多边形：ArcPolygonFromArcs

@expect 两段 90° 弧首尾相接拼成的一个「花瓣」形封闭图形（左上到右上）。
@note 2026-10-13 随 manim-web 0.36 从 reject 转正（0.3.24 没有 ArcPolygonFromArcs）。
      CE 与 manim-web 都收变长位置参数（弧按顺序给），适配层原样透传。
"""

from manim import *


class ArcPolygonFromArcsScene(Scene):
    def construct(self):
        first = ArcBetweenPoints(LEFT, UP, angle=PI / 2)
        second = ArcBetweenPoints(UP, RIGHT, angle=PI / 2)
        shape = ArcPolygonFromArcs(first, second)
        self.add(shape)
