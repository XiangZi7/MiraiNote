import type { DocumentKind } from '@/types/document'

export const documentTypes: Record<DocumentKind, { label: string; icon: string; extension: string }> = {
  markdown: { label: 'Markdown', icon: 'lucide:file-code-2', extension: '.md' },
  pdf: { label: 'PDF', icon: 'lucide:file-text', extension: '.pdf' },
  word: { label: 'Word', icon: 'lucide:file-type-2', extension: '.docx' },
}
export function formatSize(size: number) { return size < 1024 ? `${size} B` : size < 1024 * 1024 ? `${(size / 1024).toFixed(1)} KB` : `${(size / (1024 * 1024)).toFixed(1)} MB` }
export function formatDate(date: string) { return new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(date)) }
