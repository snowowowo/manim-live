"""API 点名：3D 实体（线 / 箭头 / 凸包）——必须落在 ThreeDScene 上

@expect 一排三件 3D 实体，从左到右在 x = -4 / 0 / +4：左边是一根青色的水平线段；
        中间是一枝同向的蓝色箭头（线段 + 锥头）；右边是一个绿色的四面体——
        能看到深浅不同的两三个面（有光才有立体，不是一团黑）。三件都沿画面水平方向躺着，
        各自下方有名字标签，标签正对镜头、不被斜视压扁。
@note 这三件和 Cube / Sphere 一样吃光：manim-web 给它们的是标准材质，靠**场景灯光**照亮。
      放进普通的 Scene 里一盏灯都没有，实心面就是纯黑（ConvexHull3D 最刺眼——画面里只剩一个黑三角），
      线材质虽不吃光，缩放 / 透视也跟 2D 不是一回事。
      它们原本并排躺在 `api/11-classes-extra.py` 的 2D 网格里，2026-10-11 复盘 3D 语料时发现，
      单独挪到这条真 3D 场景。
      为什么三件都**沿 x 摆**而不是竖着：画面是透视的，一段沿 y / z 的线段只要离开画面中轴，
      两个端点的深度就不同，投影下来会被画成**斜的**（看起来像画歪了）。沿 x 的线段两端深度相同，
      屏幕上严格水平——要竖着立一根还得额外解释「这是透视，不是 bug」，不如直接摆正。
"""

from manim import *

XS = [-4.4, 0.0, 4.4]
ARM = 1.5  # 每件的半长


class ApiThreeDExtraScene(ThreeDScene):
    def construct(self):
        # 前方俯视：theta=-90° 让 x 轴正对镜头；phi=50° 让四面体露出顶面。
        self.set_camera_orientation(phi=50 * DEGREES, theta=-90 * DEGREES)

        line3 = Line3D(LEFT * ARM, RIGHT * ARM, color=TEAL).move_to([XS[0], 0.5, 0])
        arrow3 = Arrow3D(LEFT * ARM, RIGHT * ARM, color=BLUE).move_to([XS[1], 0.5, 0])
        hull3 = ConvexHull3D([[0, 0, 0], [1, 0, 0], [0, 1, 0], [0, 0, 1]], color=GREEN).scale(2.6)
        hull3.move_to([XS[2], 0.5, 0])

        self.add(line3, arrow3, hull3)

        labels = VGroup(
            Text("Line3D", font_size=18).move_to([XS[0], -1.5, 0]),
            Text("Arrow3D", font_size=18).move_to([XS[1], -1.5, 0]),
            Text("ConvexHull3D", font_size=18).move_to([XS[2], -1.9, 0]),
        )
        # 钉住朝向（位置仍在 3D 里）：斜视下字才不会躺倒被压扁。
        # 注意它会**自己把物体加进场景**（CE 就是这么做的），不必再 add 一遍。
        self.add_fixed_orientation_mobjects(labels)

        self.wait(0.2)
