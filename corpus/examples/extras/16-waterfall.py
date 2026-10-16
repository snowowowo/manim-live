"""瀑布图 WaterfallChart

@expect 四段增减加一根总计柱，柱间有连接线，起点 3 逐段走到 6。
@note 引擎扩展车道（from manim_live_extra import …）：标准 Manim 没有此图形——本机 CLI 导出会被前置门拒绝，只能浏览器渲染 / 逐帧导出。
"""

from manim import *
from manim_live_extra import WaterfallChart


class WaterfallScene(Scene):
    def construct(self):
        chart = WaterfallChart(
            values=[3, -1, 2, -2],
            labels=['起步', '支出', '收入', '退款'],
            show_total=True,
            total_label='净额',
        )
        self.play(Create(chart))
        self.wait(0.3)
