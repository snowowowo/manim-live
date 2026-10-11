/**
 * 复制到剪贴板：先走 `navigator.clipboard`，不行再退回 `execCommand`。
 *
 * 为什么要留那条老路：`navigator.clipboard` **只在安全上下文里有**（https 或 localhost）。
 * 这一页将来可能被真当成文档页部署出去（或者从局域网 IP 打开），那时它整个不存在——
 * 表现是「点了复制没反应」，而按钮上明明写着「已复制」，最难查的一类。
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText !== undefined) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch (error) {
    console.error('[manim-live] clipboard API 失败，改走 execCommand:', error)
  }
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.top = '0'
    area.style.opacity = '0'
    document.body.append(area)
    area.select()
    const ok = document.execCommand('copy')
    area.remove()
    if (!ok) console.error('[manim-live] execCommand("copy") 返回 false')
    return ok
  } catch (error) {
    console.error('[manim-live] 复制失败:', error)
    return false
  }
}
