import { DEFAULT_PYODIDE_INDEX_URL } from 'manim-live'
import ClientCanvas from './ClientCanvas'

// 服务器组件：模块顶层 import + 只读取常量，验证 SSR 下 import 安全。
export default function Page() {
  return (
    <main>
      <h1>manim-live in Next.js</h1>
      <p>SSR 顶层 import 成功；DEFAULT_PYODIDE_INDEX_URL = {DEFAULT_PYODIDE_INDEX_URL}</p>
      <ClientCanvas />
    </main>
  )
}
