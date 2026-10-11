"""空间直角坐标系与立方体

@expect 斜视看一个棱长 2 的立方体：三个面同时可见、明暗各不同（有光有深度，不是一块黑）；
        它坐在第一象限，最远的顶点 (2, 2, 2) 上有个黄点、旁边跟着黄色标注；
        三条坐标轴从原点穿出，Z 轴朝上。标题钉在画面左上角、不跟相机跑。
        相机先绕方位角自转一段，再动画转到另一侧——终帧看到的是立方体的另一组侧面，
        与初始斜视完全不同，证明相机真动了，不是被 2D 拍扁的一张脸。
@template 要画 3D 空间图形（立方体 / 球 / 多面体 / 坐标轴）或想让相机转起来时照它抄。
@note 3D 物体**必须**写 class X(ThreeDScene)：普通的 Scene 里一盏灯都没有，
      吃光的材质落进去就是一团纯黑（不是「3D 没实现」，是放错场景了）。
      屏幕上的字用 add_fixed_in_frame_mobjects 钉住；3D 里跟着物体走、又要一直正对镜头的字
      用 add_fixed_orientation_mobjects——斜视下它俩都不会被压扁。
      3D 实体的颜色 / 透明用构造参数 color / opacity（CE 的 fill_color / fill_opacity 在 3D 实体上不生效）。
"""

from manim import *

SIDE = 2.0


class SpaceCubeScene(ThreeDScene):
    def construct(self):
        # 轴比默认短一圈（默认 x∈[-6,6]、z∈[-4,4]，斜视下会顶到画面边）：
        # 立方体已经占住画面中心，轴只用来交代「这是个坐标系」。
        axes = ThreeDAxes(x_range=[-3, 3, 1], y_range=[-3, 3, 1], z_range=[-3, 3, 1])
        cube = Cube(side_length=SIDE, color=BLUE)
        cube.shift([SIDE / 2, SIDE / 2, SIDE / 2])  # 坐进第一象限，别跟坐标轴原点叠在一起
        corner = Dot3D(point=[SIDE, SIDE, SIDE], radius=0.09, color=YELLOW)

        title = Text("空间直角坐标系", font_size=32)
        title.to_corner(UL)
        self.add_fixed_in_frame_mobjects(title)  # 钉在屏幕上：不跟相机转，也不会被斜视压扁

        corner_label = Text("(2, 2, 2)", font_size=22, color=YELLOW)
        corner_label.move_to([SIDE, SIDE, SIDE + 0.5])
        self.add_fixed_orientation_mobjects(corner_label)  # 留在 3D 里，但永远正对镜头

        self.set_camera_orientation(phi=70 * DEGREES, theta=-135 * DEGREES)  # 初始斜视
        self.play(Create(axes), FadeIn(cube), FadeIn(corner), Write(title), run_time=1)
        self.begin_ambient_camera_rotation(rate=0.4)  # 相机自己绕方位角慢慢转
        self.wait(1.5)
        self.stop_ambient_camera_rotation()
        self.move_camera(phi=60 * DEGREES, theta=-20 * DEGREES, run_time=2)  # 再动画转到另一侧
        self.wait(0.2)
