import type { DocumentKind } from '@/types/document'

export type AgentStatus = 'idle' | 'running' | 'approval' | 'completed' | 'cancelled' | 'failed'
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
export interface AgentRequest {
  prompt: string
  context: AgentContext
}
