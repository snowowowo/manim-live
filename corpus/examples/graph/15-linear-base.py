"""线性刻度基类：LinearBase 不是坐标轴

@expect 被拒：LinearBase 直接 add 当场报错——它是 CE 坐标系的刻度基类（配置件），不是 Mobject。
@note 2026-10-13 曾随 manim-web 0.36 从 reject 转正（那时只验了名字存在）；真浏览器一渲染就炸
      `_setSceneContext is not a function`——上游的 LinearBase 也不是可上画的物体，2026-10-14
      转回 reject。线性轴本来就有 Axes，LinearBase 只在组合自定义刻度时才用得上。
"""

from manim import *


class LinearBaseScene(Scene):
    def construct(self):
        axes = LinearBase(x_range=[-4, 4], y_range=[-2, 2])
        self.add(axes)
