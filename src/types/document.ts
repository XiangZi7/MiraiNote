export type DocumentKind = 'markdown' | 'pdf' | 'word'
export type MarkdownMode = 'edit' | 'preview' | 'split'

export interface DocumentRecord {
  id: string
  name: string
  kind: DocumentKind
  path: string
  content: string
  text: string
  source: 'example' | 'local'
  createdAt: string
  modifiedAt: string
  openedAt: string
  tags: string[]
  favorite: boolean
  dirty: boolean
  size: number
  pages?: number
}

export interface ReadingPosition {
  mode: MarkdownMode
  ratio: number
  cursor: number
  scroll: number
  page: number
  zoom: number
  rotation: number
}

export interface DocumentTab {
  id: string
  documentId: string
  pinned: boolean
  position: ReadingPosition
}

export const defaultPosition = (): ReadingPosition => ({
  mode: 'split', ratio: 0.5, cursor: 0, scroll: 0, page: 1, zoom: 100, rotation: 0,
})
