"""API 点名：形状 / 标记 / 图（表里 ok、语料此前没点到的那一批）

@expect 四行网格（每行六格，末行五格）：每个被点名的类占一格、格下有名字标签；
        依赖簇（弧+弧括号、方块+括号）成组摆放；互不遮挡、全部在画布内。
@note 这些类 manim-web 都有，只是构造姿势与 CE 不同（CE 收位置参数、manim-web 多收一个选项对象）——
      在 surface.ts 的 CTOR 里逐个登记了配方。全部对象默认叠在原点，必须逐格摆放；
      MathTex 一支只敢用 move_to 定位。
      场类缺口：manim-web 0.3.24 的 VectorField._regenerate() 是空的（抽象基类，只有
      ArrowVectorField / StreamLines 生成可见物）——名字能构造但画不出东西，格内放灰方块作
      格位参照；ArrowVectorField / StreamLines 的线箭头按场走会越出采样范围，范围与步长收紧
      （步长 ×0.8 封顶箭头长）才不侵入上排 Variable / Code。
      2026-10-11：原先末行的 Line3D / Arrow3D / ConvexHull3D 撤出本文件——它们吃光，
      在普通的 Scene 里是黑块，已挪进 `api/12-classes-3d-extra.py` 的真 ThreeDScene。
"""

from manim import *

COLS = [-5.5, -3.3, -1.1, 1.1, 3.3, 5.5]
ROWS = [2.95, 1.1, -0.75, -2.6]


def cell(r, c, dy=0.15):
    return [COLS[c], ROWS[r] + dy, 0]


def label_at(r, c, text, dy=-0.42):
    return Text(text, font_size=11).move_to([COLS[c], ROWS[r] + dy, 0])


class ExtraClassesScene(Scene):
    def construct(self):
        # —— 行 0：切线 / 切弧 / 多角星 / 凸包 / 多角形 ——
        arc = Arc(radius=0.7, start_angle=0, angle=PI / 2).move_to(cell(0, 0, 0.3))
        self.add(label_at(0, 0, "ArcBrace"), ArcBrace(arc), arc)

        tline = TangentLine(Circle(radius=1), 0.25).scale(0.45).move_to(cell(0, 1))
        self.add(label_at(0, 1, "TangentLine"), tline)

        tarc = TangentialArc(ORIGIN, RIGHT, radius=1, angle=PI / 3).scale(0.8).move_to(cell(0, 2))
        self.add(label_at(0, 2, "TangentialArc"), tarc)

        polygram7 = RegularPolygram(7, density=3).scale(0.55).move_to(cell(0, 3))
        self.add(label_at(0, 3, "RegularPolygram"), polygram7)

        hull = ConvexHull([[0, 0, 0], [1, 0, 0], [1, 1, 0], [0.2, 0.8, 0]]).scale(0.8).move_to(cell(0, 4))
        self.add(label_at(0, 4, "ConvexHull"), hull)

        pg = Polygram([[[0, 0, 0], [1, 0, 0], [0.5, 0.9, 0]]]).scale(0.8).move_to(cell(0, 5))
        self.add(label_at(0, 5, "Polygram"), pg)

        # —— 行 1：带标签的线 / 箭头 / 点 / 多角形；SVG 路径；图 ——
        lline = LabeledLine(start=LEFT, end=RIGHT, label="l").scale(0.7).move_to(cell(1, 0))
        self.add(label_at(1, 0, "LabeledLine"), lline)

        larrow = LabeledArrow(start=LEFT, end=RIGHT, label="a").scale(0.7).move_to(cell(1, 1))
        self.add(label_at(1, 1, "LabeledArrow"), larrow)

        ldot = LabeledDot(point=ORIGIN, label="d").move_to(cell(1, 2))
        self.add(label_at(1, 2, "LabeledDot"), ldot)

        lpg = LabeledPolygram(vertex_groups=[[[0, 0, 0], [1, 0, 0], [0.5, 0.9, 0]]], label="p")
        lpg.scale(0.8).move_to(cell(1, 3))
        self.add(label_at(1, 3, "LabeledPolygram"), lpg)

        svgp = VMobjectFromSVGPath(path_data="M0,0 L1,0 L1,1 Z").scale(0.95).move_to(cell(1, 4, 0.35))
        self.add(label_at(1, 4, "VMobjectFromSVGPath"), svgp)

        graph = Graph(vertices=[1, 2, 3], edges=[(1, 2), (2, 3), (3, 1)]).scale(0.32).move_to(cell(1, 5))
        self.add(label_at(1, 5, "Graph"), graph)

        # —— 行 2：有向图 / 样本空间 / 变量 / 代码块 / 名字表 / 公式 ——
        digraph = DiGraph(vertices=[1, 2, 3], edges=[(1, 2), (2, 3)]).scale(0.32).move_to(cell(2, 0))
        self.add(label_at(2, 0, "DiGraph"), digraph)

        space = SampleSpace(width=4, height=3).scale(0.32).move_to(cell(2, 1))
        space.set_stroke(WHITE, 1)  # 内圈椭圆默认黑填充，加白描边才看得见结构
        self.add(label_at(2, 1, "SampleSpace"), space)

        var = Variable(label="t", value=1).scale(0.8).move_to(cell(2, 2))
        self.add(label_at(2, 2, "Variable"), var)

        code = Code(code="x = 1", language="python").scale(1.0).move_to(cell(2, 3))
        self.add(label_at(2, 3, "Code"), code)

        vd = VDict({"a": Dot().shift(LEFT * 0.35), "b": Square(side_length=0.5).shift(RIGHT * 0.35)})
        vd.move_to(cell(2, 4))
        self.add(label_at(2, 4, "VDict"), vd)

        smtex = SingleStringMathTex("x^2 + y^2").move_to(cell(2, 5))  # MathTex 只用 move_to 定位
        self.add(label_at(2, 5, "SingleStringMathTex"), smtex)

        # —— 行 3：向量场三兄弟 + 两个括号簇（底行下方留白，垂下来的括号不压人）——
        # PGroup（点云类）在桥上不渲染，已删并由主线处理。

        def cell_field(cx, cy):
            # 方向场绕格心旋、幅度压到 0.4——箭头长度随场幅走，不压就伸出格子
            return lambda p: [-(p[1] - cy) * 0.4, (p[0] - cx) * 0.4, 0]

        cx, cy = COLS[0], ROWS[3]
        vfield = VectorField(
            cell_field(cx, cy), x_range=[cx - 1, cx + 1, 1], y_range=[cy - 0.35, cy + 0.75, 1],
        )
        # VectorField 上游不生成可见物（见 @note）——灰方块只标格位，不是它的渲染结果
        self.add(label_at(3, 0, "VectorField", -0.32), Square(side_length=0.3, color=GREY).move_to(cell(3, 0)), vfield)

        ax, ay = COLS[1], ROWS[3]
        afield = ArrowVectorField(
            cell_field(ax, ay), x_range=[ax - 0.6, ax + 0.6, 0.5], y_range=[ay, ay + 0.55, 0.5],
            length_func=lambda norm: min(norm, 0.2),  # 箭头压短，可见簇整体缩在格上半区，让开格下标签
        )
        self.add(label_at(3, 1, "ArrowVectorField", -0.32), afield)

        sx, sy = COLS[2], ROWS[3] + 0.35
        stream = StreamLines(
            cell_field(sx, sy), x_range=[sx - 0.8, sx + 0.8, 1], y_range=[sy - 0.5, sy + 0.3, 1],
            num_lines=4,
        )
        self.add(label_at(3, 2, "StreamLines", -0.75), stream)

        sq1 = Square(side_length=0.8).move_to(cell(3, 3, 0.1))
        # 名签放方块上方：括号+文字在方块下垂 ~0.8，下方是 "a"/"b" 的位置
        self.add(label_at(3, 3, "BraceLabel", 0.72), BraceLabel(sq1, "a"), sq1)

        sq2 = Square(side_length=0.8).move_to(cell(3, 4, 0.1))
        self.add(label_at(3, 4, "BraceText", 0.72), BraceText(sq2, "b"), sq2)

        self.wait(0.2)
