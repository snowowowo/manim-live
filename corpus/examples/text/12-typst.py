"""Typst 排版：Typst

@expect 一条 Typst 语法排出来的求和公式（sum_(i=1)^n i = n(n+1)/2）居中写出来，不是方框也不是乱码。
@note 2026-10-13 随 manim-web 0.36 从 reject 转正（0.3.24 没有 Typst，只有 KaTeX 的 MathTex）。
      Typst 是懒加载的 Typst WASM，Node 里没有 DOM 会退化成空物体——本条只在真浏览器核（playground 的文本节）。
@browser
"""

from manim import *


class TypstScene(Scene):
    def construct(self):
        formula = Typst("sum_(i=1)^n i = (n (n+1)) / 2")
        self.play(Write(formula))
