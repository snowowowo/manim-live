"""带三维相机预设的场景：SpecialThreeDScene

@expect 一个真 3D 场景（斜视角、有光照）里摆着三根坐标轴，不是 2D 平面。
@note 2026-10-13 随 manim-web 0.36 从 reject 转正（0.3.24 没有 SpecialThreeDScene）。
      适配层的场景族表（surface.ts 的 SCENE_FAMILY）跟着补了这一条——不补的话它会被当成
      普通形状生成工厂函数，`class X(SpecialThreeDScene)` 直接抛
      「function() argument 'code' must be code, not str」（真机上就是这么炸的）。
"""

from manim import *


class SpecialThreeDSceneDemo(SpecialThreeDScene):
    def construct(self):
        axes = ThreeDAxes()
        self.add(axes)
