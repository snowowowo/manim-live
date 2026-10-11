"""SpecialThreeDScene：带三维相机预设的场景

@expect 不渲染：预检应当**当场**拒绝，报错要提到「SpecialThreeDScene」并给出可读的原因或替代写法。
@reject SpecialThreeDScene

@note manim-web 的几个场景类里没有 SpecialThreeDScene（它是 CE 给「常用相机预设」做的一层便利）；
      相机朝向自己 set_camera_orientation 就是了。
"""

from manim import *


class SpecialThreeDSceneDemo(SpecialThreeDScene):
    def construct(self):
        axes = ThreeDAxes()
        self.add(axes)
