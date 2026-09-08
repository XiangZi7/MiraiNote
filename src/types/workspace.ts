import type { DocumentTab } from './document'

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
export type LibraryFilter =
  'all' | 'recent' | 'favorites' | 'markdown' | 'pdf' | 'word'

export interface MenuItem {
  label: string
  icon?: string
  shortcut?: string
  danger?: boolean
  divider?: boolean
  disabled?: boolean
  action: () => void | Promise<void>
}
