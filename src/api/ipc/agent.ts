import { invoke, isTauri } from '@tauri-apps/api/core'
import type {
  AgentSettings,
  AgentProfileInput,
  AgentModelInput,
} from '@/modules/ai/settings'
import type {
  AgentAttachment,
  AgentContext,
  AgentConversationSummary,
  AgentRun,
} from '@/modules/ai/types'

export interface StartInput {
  profileId: string
  prompt: string
  context: AgentContext
  conversationId?: string
  attachments: AgentAttachment[]
}
export interface SendInput {
  runId: string
  prompt: string
  context: AgentContext
  attachments: AgentAttachment[]
}
function call<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  if (!isTauri())
    return Promise.reject(new Error('请在 MiraiNote 桌面程序中配置和使用 AI'))
  return invoke<T>(command, args)
}
export function agentError(error: unknown): string {
  if (error instanceof Error) return error.message
  if (
    typeof error === 'object' &&
    error &&
    'message' in error &&
    typeof error.message === 'string'
  )
    return error.message
  return 'AI 操作失败，请重试'
}
export const agentApi = {
  isDesktop: isTauri,
  getSettings: () =>
    isTauri()
      ? call<AgentSettings>('agent_get_settings')
      : Promise.resolve({ activeId: '', profiles: [] } as AgentSettings),
  save: (input: AgentProfileInput, clearKey: boolean) =>
    call<AgentSettings>('agent_save_profile', { input, clearKey }),
  remove: (id: string) => call<AgentSettings>('agent_delete_profile', { id }),
  activate: (id: string) =>
    call<AgentSettings>('agent_activate_profile', { id }),
  revealKey: (id: string) => call<string>('agent_reveal_key', { id }),
  models: (input: AgentModelInput) =>
    call<string[]>('agent_list_models', { input }),
  test: (input: AgentProfileInput, clearKey: boolean) =>
    call<string>('agent_test_profile', { input, clearKey }),
  start: (input: StartInput) => call<AgentRun>('agent_start', { input }),
  send: (input: SendInput) => call<AgentRun>('agent_send', { input }),
  step: (runId: string) => call<AgentRun>('agent_step', { runId }),
  cancel: (runId: string) => call<void>('agent_cancel', { runId }),
  forget: (runId: string) => call<void>('agent_forget', { runId }),
  conversations: (documentId: string) =>
    isTauri()
      ? call<AgentConversationSummary[]>('agent_list_conversations', {
          documentId,
        })
      : Promise.resolve([]),
  openConversation: (documentId: string, conversationId: string) =>
    call<AgentRun>('agent_open_conversation', { documentId, conversationId }),
  renameConversation: (
    documentId: string,
    conversationId: string,
    title: string
  ) =>
    call<AgentConversationSummary>('agent_rename_conversation', {
      documentId,
      conversationId,
      title,
    }),
  deleteConversation: (documentId: string, conversationId: string) =>
    call<void>('agent_delete_conversation', { documentId, conversationId }),
}
