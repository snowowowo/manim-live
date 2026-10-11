import React from 'react'
import { createRoot } from 'react-dom/client'
import { ManimStage } from './ManimStage'
import 'manim-live/style.css'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ManimStage python={`
from manim import *
class Demo(Scene):
    def construct(self):
        s = Square(side_length=2, color=GREEN)
        self.play(Create(s))
        self.wait(0.2)
`} />
  </React.StrictMode>,
)
