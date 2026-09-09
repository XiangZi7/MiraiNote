import type { DocumentKind } from '@/types/document'

export type AgentStatus = 'running' | 'completed' | 'cancelled' | 'failed'
export interface AgentContext {
  workspaceId: string
  paneId: string
  tabId: string
  capturedAt: string
  document: {
    id: string
    name: string
    kind: DocumentKind
    path: string
    revision: string
    text: string
    page: number
    cursor: number
  }
}
/** Uploaded file contents; only sent, never echoed back into the transcript. */
export interface AgentAttachment {
  name: string
  content: string
}
export interface AgentAttachmentInfo {
  name: string
  size: number
}
export interface AgentDraftAttachment
  extends AgentAttachment, AgentAttachmentInfo {
  id: string
}
/** One visible line of the transcript. `tool` and `error` carry raw output in `detail`. */
export interface AgentEntry {
  role: 'user' | 'assistant' | 'tool' | 'error'
  text: string
  detail?: string
  attachments?: AgentAttachmentInfo[]
}
export interface AgentRun {
  id: string
  conversationId: string
  document: string
  documentId: string
  provider: string
  model: string
  status: AgentStatus
  entries: AgentEntry[]
  saveError?: string
}
export interface AgentConversationSummary {
  id: string
  title: string
  model: string
  provider: string
  documentName: string
  createdAt: number
  updatedAt: number
}
