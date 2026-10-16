"""K 线图 CandlestickChart

@expect 三根 K 线：实体 + 上下影线齐全，涨的红、跌的绿（按中国习惯显式指定了涨红跌绿）。
@note 引擎扩展车道（from manim_live_extra import …）：标准 Manim 没有此图形——本机 CLI 导出会被前置门拒绝，只能浏览器渲染 / 逐帧导出。
"""

from manim import *
from manim_live_extra import CandlestickChart


class CandlestickScene(Scene):
    def construct(self):
        chart = CandlestickChart(
            data=[
                {'open': 1.0, 'high': 2.0, 'low': 0.5, 'close': 1.6},
                {'open': 1.6, 'high': 2.4, 'low': 1.2, 'close': 1.3},
                {'open': 1.3, 'high': 2.2, 'low': 1.1, 'close': 2.1},
            ],
            bullish_color=RED,
            bearish_color=GREEN,
        )
        self.play(Create(chart))
        self.wait(0.3)
