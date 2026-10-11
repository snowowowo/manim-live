'use client'

import { useEffect, useRef, useState } from 'react'
import { createManimRenderer } from 'manim-live'

export default function ClientCanvas() {
  const host = useRef(null)
  const [note, setNote] = useState('loading…')

  useEffect(() => {
    const renderer = createManimRenderer()
    let ok = false
    void renderer.createSurface(host.current).then(async (s) => {
      const r = await s.run(`
from manim import *
class Demo(Scene):
    def construct(self):
        d = Dot(point=[0,0,0], color=YELLOW).scale(5)
        self.play(Create(d))
        self.wait(0.2)
`)
      ok = r.ok
      setNote(r.ok ? 'rendered ok' : ('error: ' + r.error))
    })
    return () => { renderer.dispose() }
  }, [])

  return (
    <section>
      <div ref={host} style={{ height: 260 }} />
      <p id="note">{note}</p>
    </section>
  )
}
