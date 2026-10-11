"""API 点名：矩阵 / 表 / 3D / 杂项

@expect 网格布局：3D 实体一格一个（各自有颜色、**有明暗立体感**，不是黑块）、矩阵一行四个、
        杂项一行四个，格旁有名字标签，互不遮挡、全部在画布内。
@note 同上一组：只钉「名字能用」。3D 物体默认全叠在原点，必须逐个 shift 到独立格子；
      矩阵的数字块也会叠字，错开摆放。
**3D 实体必须落在 ThreeDScene 上**：普通的 Scene 里一盏灯都没有，而 Cube / Sphere 这些用的是
吃光的材质——放错场景就是一团纯黑（曾经就是这样）。相机摆成前方俯视（phi=50°），
网格仍读得出来，同时每个实体都看得到顶面与正面（立体感就在这儿）。
实体颜色用构造参数 color=（CE 的 fill_color / fill_opacity 在 manim-web 的 3D 实体上不生效，
set_fill/set_stroke 也不是给网格用的），标签与 2D 部件一律 add_fixed_orientation_mobjects 钉住朝向——
斜视下它们不会被压扁。
"""

from manim import *

dmat = DecimalMatrix([[1.0, 2.0], [3.0, 4.0]], h_buff=2.0)  # 默认列距太窄，小数粘连
imat = IntegerMatrix([[1, 2], [3, 4]])
mmat = MobjectMatrix([[Square(), Circle()]])
mtab = MobjectTable([[Square(), Circle()]])
num = Integer(7)
boundary = AnimatedBoundary(Square())
impl = ImplicitFunction(lambda x, y: x ** 2 + y ** 2 - 1)
banner = ManimBanner()

cube = Cube(color=BLUE_D)
sphere = Sphere(color=TEAL)
cone = Cone(color=GREEN_D)
cylinder = Cylinder(color=GOLD_D)
torus = Torus(color=MAROON)
prism = Prism(color=BLUE)
tetra = Tetrahedron(color=RED_D)
octa = Octahedron(color=PURPLE)
dodeca = Dodecahedron(color=GREEN)
icosa = Icosahedron(color=ORANGE)
dot3 = Dot3D(color=YELLOW)
axes3 = ThreeDAxes(x_range=[-1, 1, 1], y_range=[-1, 1, 1], z_range=[-1, 1, 1])
vm3 = ThreeDVMobject()  # 空几何，不进画面

print("api-classes-3d", mmat is not None, mtab is not None, impl is not None, banner is not None)

# —— 网格布局 ——
COLS4 = [-5.0, -1.68, 1.68, 5.0]
SOLID_ROWS = [3.25, 1.45, -0.35]  # 俯视会把 y 压扁，行距比 2D 版拉开一些
MAT_Y = -1.6
MISC_Y = -3.1


class ApiStructuresScene(ThreeDScene):
    def construct(self):
        # 前方俯视：theta=-90° 让 x 轴正对镜头（网格不变形），phi=50° 让实体露出顶面。
        self.set_camera_orientation(phi=50 * DEGREES, theta=-90 * DEGREES)

        fixed = []  # 标签与 2D 部件：钉住朝向，斜视下才不会被压扁

        solids = [
            ("Cube", cube, 0.38), ("Sphere", sphere, 0.38), ("Cone", cone, 0.38),
            ("Cylinder", cylinder, 0.38),
            ("Torus", torus, 0.38), ("Prism", prism, 0.38), ("Tetrahedron", tetra, 0.38),
            ("Octahedron", octa, 0.38),
            ("Dodecahedron", dodeca, 0.38), ("Icosahedron", icosa, 0.38), ("Dot3D", dot3, 1.8),
            ("ThreeDAxes", axes3, 0.5),  # 轴默认横跨画布，缩到格内
        ]
        for i, (name, mob, s) in enumerate(solids):
            r, c = divmod(i, len(COLS4))
            mob.scale(s).shift([COLS4[c], SOLID_ROWS[r], 0])
            fixed.append(Text(name, font_size=11).move_to([COLS4[c], SOLID_ROWS[r] - 0.72, 0]))
            self.add(mob)

        mats = [
            ("DecimalMatrix", dmat), ("IntegerMatrix", imat),
            ("MobjectMatrix", mmat), ("MobjectTable", mtab),
        ]
        for i, (name, mob) in enumerate(mats):
            s = 0.8 if i < 2 else 0.45  # 装实体的矩阵/表天生太宽，缩得更小
            mob.scale(s).move_to([COLS4[i], MAT_Y, 0])
            fixed.append(Text(name, font_size=11).move_to([COLS4[i], MAT_Y - 0.8, 0]))
            self.add(mob)

        misc = [
            ("Integer", num, 1.0), ("AnimatedBoundary", boundary, 0.25),
            ("ImplicitFunction", impl, 0.45), ("ManimBanner", banner, 0.3),
        ]
        for i, (name, mob, s) in enumerate(misc):
            dy = -0.25 if name == "AnimatedBoundary" else 0.0
            mob.scale(s).move_to([COLS4[i], MISC_Y + 0.15 + dy, 0])
            fixed.append(Text(name, font_size=11).move_to([COLS4[i], MISC_Y - 0.45, 0]))
            self.add(mob)

        # 标签 + 矩阵 / 表 / 杂项（都是 2D 部件）：一律钉住朝向，斜视下不压扁、正对观众。
        self.add_fixed_orientation_mobjects(*fixed)

        self.play(Write(dmat), run_time=0.2)
        self.wait(0.2)
