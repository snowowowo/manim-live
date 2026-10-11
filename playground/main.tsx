/**
 * playground 的入口。
 *
 * 三件必须记住的事：
 *
 * ① **先挂主题，再挂 React**：index.html 上写死了 `class="dark"`，照 localStorage 覆盖它。
 *    放在 React 之后做的话，选了亮色的用户每次都会先看到一帧暗色再跳过去（闪一下）。
 *
 * ② **`import '../style.css'` 走相对路径，不能写 `manim-live/style.css`**：
 *    vite 的 alias 是 `'manim-live' → src/index.ts`，而 alias 对「以它打头 + 斜杠」的请求
 *    也会命中去替换，于是 `manim-live/style.css` 会被解析成 `src/index.ts/style.css`。
 *    顺带一提，这行 import 本身就是「使用者该怎么接」的示范——核心包把默认样式做成可选的一份。
 *
 * ③ **不用 `<StrictMode>`**：画布是命令式的（`createScene` 往容器里 append canvas），
 *    StrictMode 会把 effect 跑两遍，等于建两块画布、再往同一个人脸大小的 Pyodide 上叠两次预热。
 *    这一页不是「宁可多跑也要暴露副作用」的场合——它自己就是那个副作用的宿主。
 */
import { createRoot } from 'react-dom/client'
import { App } from './components/app.tsx'
import { loadGround } from './lib/storage.ts'
import '../style.css'
import './index.css'

// 只在**明确存过亮色**时才摘掉暗色：没存过就是默认暗色（与 index.html 上那个 class 一致）。
if (loadGround().theme === 'light') {
  document.documentElement.classList.remove('dark')
}

const container = document.getElementById('root')
if (container === null) throw new Error('缺 #root 挂载点')

createRoot(container).render(<App />)
