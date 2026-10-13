"""数学模式 Typst：MathTypst

@expect 一个典型积分式（∫₀¹ x² dx = 1/3）以数学模式排出来，上下限位置正确。
@note 2026-10-13 随 manim-web 0.36 从 reject 转正（0.3.24 没有 MathTypst）。
      首参是**不带 $ 的数学内容**（MathTypst 自己包 math 模式）——原样照 CE 写即可。
      Node 里跑不了（同 Typst 的 WASM），只在真浏览器核。
@browser
"""

from manim import *


class MathTypstScene(Scene):
    def construct(self):
        formula = MathTypst("integral_0^1 x^2 dif x = 1/3")
        self.add(formula)
