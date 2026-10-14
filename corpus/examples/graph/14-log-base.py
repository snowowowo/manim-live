"""对数刻度基类：LogBase 不是坐标轴

@expect 被拒：LogBase 直接 add 当场报错——它是 CE 坐标系的刻度基类（配置件），不是 Mobject。
@note 2026-10-13 曾随 manim-web 0.36 从 reject 转正（那时只验了名字存在）；真浏览器一渲染就炸
      `_setSceneContext is not a function`——上游的 LogBase 也不是可上画的物体，2026-10-14 转回
      reject。对数轴的正确写法是把它当刻度配置传给 Axes：`Axes(x_range=[1, 1000],
      x_axis_config={"scaling": LogBase(base=10)})`。
"""

from manim import *


class LogBaseScene(Scene):
    def construct(self):
        axes = LogBase(base=10, x_range=[1, 1000])
        self.add(axes)
