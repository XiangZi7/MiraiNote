import type { DocumentKind } from '@/types/document'
import type { FileEntry } from '@/types/workspace'

export const documentTypes: Record<
  DocumentKind,
  { label: string; icon: string; extension: string }
> = {
  markdown: { label: 'Markdown', icon: 'lucide:file-code-2', extension: '.md' },
  pdf: { label: 'PDF', icon: 'lucide:file-text', extension: '.pdf' },
  word: { label: 'Word', icon: 'lucide:file-type-2', extension: '.docx' },
}
export const SUPPORTED_ACCEPT = '.md,.markdown,.pdf,.docx'

export function isSupportedName(name: string) {
  return /\.(md|markdown|pdf|docx)$/i.test(name)
}
/** 把文件夹内的相对路径转成工作区里展示的层级路径。 */
export function workspacePath(relativePath: string, folder?: string) {
  const parts = relativePath.split('/').filter(Boolean)
  return [folder ?? '导入文件', ...parts].join(' / ')
}
/** 按所在子目录分组，便于在列表里看出文件夹结构。 */
export function groupEntries(entries: FileEntry[], keyword = '') {
  const filter = keyword.trim().toLowerCase()
  const groups = new Map<string, FileEntry[]>()
  for (const entry of entries) {
    if (filter && !entry.relativePath.toLowerCase().includes(filter)) continue
    const cut = entry.relativePath.lastIndexOf('/')
    const dir = cut < 0 ? '' : entry.relativePath.slice(0, cut)
    const list = groups.get(dir)
    if (list) list.push(entry)
    else groups.set(dir, [entry])
  }
  return [...groups]
    .sort((a, b) => a[0].localeCompare(b[0], 'zh-CN'))
    .map(([dir, items]) => ({
      dir,
      items: [...items].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')),
    }))
}
export function formatSize(size: number) {
  return size < 1024
    ? `${size} B`
    : size < 1024 * 1024
      ? `${(size / 1024).toFixed(1)} KB`
      : `${(size / (1024 * 1024)).toFixed(1)} MB`
}
export function formatDate(date: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(date))
}
