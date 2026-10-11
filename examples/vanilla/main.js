import { createManimRenderer } from 'manim-live'
import 'manim-live/style.css'

const python = `
from manim import *
class Demo(Scene):
    def construct(self):
        c = Circle(radius=1.5, color=BLUE)
        self.play(Create(c))
        self.wait(0.2)
`
const renderer = createManimRenderer()
const surface = await renderer.createSurface(document.querySelector('#stage'))
const result = await surface.run(python)
console.log('vanilla result:', result)
document.title = result.ok ? 'VV-OK' : 'VV-ERR'
const el = document.createElement('p')
el.id = 'vv-result'
el.textContent = JSON.stringify(result)
document.body.append(el)
