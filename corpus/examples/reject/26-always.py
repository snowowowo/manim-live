"""always：把函数变成 updater 的通用助手

@expect 不渲染：预检应当**当场**拒绝，报错要提到「always」并给出可读的原因或替代写法。
@reject always

@note 2026-10-13 升级后重判：两边**同名不同义**——CE 0.22 的 always(obj.方法, …) 收的是绑定方法，
      manim-web 的 always(物体, 方法名, …) 收的是方法名，两者接不上（探针里按名字判会误记 ok，
      已由 KNOWN_NAME_MISMATCH 如实改成 missing）。本条这个写法（把 lambda 当更新器工厂）两边都不认。
      正确改法就一句：add_updater(lambda m, dt: m.rotate(0.02))。
"""

from manim import *


class AlwaysScene(Scene):
    def construct(self):
        square = Square()
        square.add_updater(always(lambda m: m.rotate(0.02), rate=2))
        self.add(square)
        self.wait(0.5)
