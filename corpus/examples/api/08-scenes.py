"""API 点名：场景家族

@expect 一个蓝色的立方体斜立在画面中心：能看到顶面与两个侧面、明暗不同（真 3D 场景，
        有光照有深度）；画面下缘钉着一行白字 "ThreeDScene ok"——它不跟相机转、也不会被斜视压扁。
@note 场景家族在适配层里**各自是真子类**：ThreeDScene 拿到的是 manim-web 的真 3D 场景
      （3D 相机 / 光照 / 深度测试），其余几个共用同一块画布、只换相机语义。
      GraphScene 是唯一的例外——manim-web 没有这个类（CE 0.22 的公共 API 里也没有，
      那是 ManimGL 的写法），退回 2D 的 Scene 并打印一行 warn。
      本文件定义了 7 个场景类，但**只有第一个会真跑**（运行器只驱动第一个 Scene 子类）：
      其余几个的价值是「类创建时就把基类名字解析掉了」——名字写错会当场 NameError，
      钉住「表里 ok 的场景名真能继承」。
"""

from manim import *


class ApiSceneFamily(ThreeDScene):
    def construct(self):
        self.set_camera_orientation(phi=60 * DEGREES, theta=-60 * DEGREES)
        badge = Text("ThreeDScene ok", font_size=30)
        badge.to_edge(DOWN, buff=0.8)
        # 钉在屏幕上（这调用自身也会把物体加进场景，见 shim 的注释）
        self.add_fixed_in_frame_mobjects(badge)
        self.add(Cube(side_length=2, color=BLUE))
        self.wait(0.1)


def _marker(label):
    return VGroup(
        Square(side_length=1.6, color=BLUE),
        Text(label, font_size=26, color=WHITE),
    )


# —— 以下六个只做「基类名字解析得到」的点名，construct 不会被执行（见 @note）——


class _FamilyMovingCamera(MovingCameraScene):
    def construct(self):
        self.add(_marker("MovingCamera ok"))


class _FamilyZoomed(ZoomedScene):
    def construct(self):
        self.add(_marker("ZoomedScene ok"))


class _FamilyVector(VectorScene):
    def construct(self):
        self.add(_marker("VectorScene ok"))


class _FamilyLinear(LinearTransformationScene):
    def construct(self):
        self.add(_marker("LinearTransform ok"))


class _FamilyGraph(GraphScene):  # manim-web 没有，退回 2D 的 Scene 并 warn
    def construct(self):
        self.add(_marker("GraphScene→Scene"))
