import type { DocumentRecord, DocumentTab } from '@/types/document'
import type { AgentContext } from '../types'

export async function captureAgentContext(document: DocumentRecord, tab: DocumentTab, paneId: string): Promise<AgentContext> {
  if (tab.documentId !== document.id) throw new Error('活动标签与文档不匹配，请重新选择文档。')
  const snapshot = {
    id: document.id, name: document.name, kind: document.kind, path: document.path,
    text: document.kind === 'markdown' ? document.content : document.text,
    page: tab.position.page, cursor: tab.position.cursor,
  }
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(document.content || document.text))
  return { workspaceId: 'default', paneId, tabId: tab.id, capturedAt: new Date().toISOString(), document: { ...snapshot, revision: Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('') } }
}
