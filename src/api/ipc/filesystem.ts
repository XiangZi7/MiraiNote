import { invoke, isTauri } from '@tauri-apps/api/core'
import type { FileEntry, FolderScan } from '@/types/workspace'

// 桌面端读取真实路径；浏览器只能退回 <input type="file">。
export const fileSystemApi = {
  isDesktop: isTauri,
  pickFolder: () => invoke<FolderScan | null>('files_pick_folder'),
  pickDocuments: () => invoke<FileEntry[]>('files_pick_documents'),
  scanFolder: (path: string) =>
    invoke<FolderScan>('files_scan_folder', { path }),
  stat: (paths: string[]) => invoke<FileEntry[]>('files_stat', { paths }),
  async readFile(entry: FileEntry) {
    const bytes = await invoke<ArrayBuffer>('files_read', { path: entry.path })
    return new File([bytes], entry.name, { lastModified: entry.modifiedAt })
  },
}

export function downloadFile(name: string, content: string, type: string) {
  downloadBlob(name, new Blob([content], { type }))
}

export function downloadBlob(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
