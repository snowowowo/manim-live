// ./style.css 出口的类型声明：TS 7 默认检查副作用导入（TS2882），
// 没有这份声明，消费者 `import 'manim-live/style.css'` 会编译失败。
declare const css: string
export default css
