import type { DocumentKind, DocumentTab } from './document'

export interface PaneNode {
  type: 'pane'
  id: string
  tabs: DocumentTab[]
  activeTabId: string | null
}

export interface SplitNode {
  type: 'split'
  id: string
  axis: 'horizontal' | 'vertical'
  ratio: number
  children: [LayoutNode, LayoutNode]
}

export type LayoutNode = PaneNode | SplitNode
export type DropEdge = 'left' | 'right' | 'top' | 'bottom' | 'center'
export type LibrarySection =
  'all' | 'recent' | 'favorites' | 'markdown' | 'pdf' | 'word'
/** `folder:<绝对路径>` 表示正在浏览某个已打开的本地文件夹。 */
export type LibraryFilter = LibrarySection | `folder:${string}`

export interface WorkspaceFolder {
  path: string
  name: string
  openedAt: string
}

export interface RecentFile {
  path: string
  name: string
  kind: DocumentKind
  openedAt: string
}

/** 文件夹里的一份文档，只有元信息；内容在打开时才读取。 */
export interface FileEntry {
  path: string
  name: string
  relativePath: string
  kind: DocumentKind
  size: number
  modifiedAt: number
}

export interface FolderScan {
  path: string
  name: string
  entries: FileEntry[]
  /** 兼容旧扫描结果；当前扫描会遍历完整目录。 */
  truncated: boolean
  /** 已列出但超过载入大小限制的文档数量。 */
  oversized: number
  /** 无法读取的文件或子目录数量。 */
  unreadable?: number
}

export interface MenuItem {
  label: string
  icon?: string
  shortcut?: string
  danger?: boolean
  divider?: boolean
  disabled?: boolean
  action: () => void | Promise<void>
}
