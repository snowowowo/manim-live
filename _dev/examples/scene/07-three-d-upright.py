"""3D 相机的「正」：x 轴该在屏幕上水平

@expect 五个立方体排成一个**正十字**：红(x=-4)在左、蓝(x=+4)在右，两者的高低完全一样；
        黄(y=+3)在上、橙(y=-3)在下，两者与中间绿块的横向位置完全一样。
        立方体各自露出顶面与正面（有光、有深度）。
@note 这条是「相机没被滚转」的哨兵，因为滚转是**看不出来的错**：相机位置、角度全都对，
      `getOrbitAngles()` 读回来分毫不差，只有画面歪——任何几何断言都抓不到它。
      2026-10-11 实测：manim-web 0.3.24 的 `Camera3D.orbit` 用 `this._up || (…)` 把「相机朝上」
      锁在**第一次**调用上，于是建场景时那组默认角度（phi=70°/theta=-135°）会一直残留——
      这里渲出来就是 x 轴的三个立方体**斜着往上**（歪 15°）。修法与出处见
      `src/engine/manim-patch.ts`。
"""

from manim import *


class ThreeDUprightScene(ThreeDScene):
    def construct(self):
        self.set_camera_orientation(phi=50 * DEGREES, theta=-90 * DEGREES)  # 正面俯视：x 轴该水平
        self.add(
            Cube(color=RED).shift([-4, 0, 0]),
            Cube(color=GREEN).shift([0, 0, 0]),
            Cube(color=BLUE).shift([4, 0, 0]),
            Cube(color=YELLOW).shift([0, 3, 0]),
            Cube(color=ORANGE).shift([0, -3, 0]),
        )
