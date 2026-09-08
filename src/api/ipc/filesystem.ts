import type { DocumentRecord } from '@/types/document'

/** UI 阶段的浏览器文件适配器；桌面文件系统服务在后续阶段替换此边界。 */
export function chooseMarkdownFiles(): Promise<File[]> {
  return new Promise(resolve => {
    const input = document.createElement('input')
    input.type = 'file'; input.multiple = true; input.accept = '.md,.markdown'
    input.addEventListener('change', () => resolve(Array.from(input.files ?? [])), { once: true })
    input.addEventListener('cancel', () => resolve([]), { once: true })
    input.click()
  })
}

export async function readMarkdownFile(file: File): Promise<DocumentRecord> {
  if (!/\.(md|markdown)$/i.test(file.name)) throw new Error('当前 UI 阶段支持导入 Markdown；PDF 与 Word 可在工作区查看示例。')
  if (file.size > 10 * 1024 * 1024) throw new Error('当前可导入 10 MB 以内的 Markdown 文件。')
  const content = await file.text()
  const now = new Date().toISOString()
  return { id: crypto.randomUUID(), name: file.name, kind: 'markdown', path: `导入文件 / ${file.name}`, content, text: content, source: 'local', createdAt: now, modifiedAt: new Date(file.lastModified).toISOString(), openedAt: now, tags: [], favorite: false, dirty: false, size: file.size }
}

export function downloadFile(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const anchor = document.createElement('a')
  anchor.href = url; anchor.download = name
  document.body.appendChild(anchor); anchor.click(); anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
