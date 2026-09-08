import { invoke, isTauri } from '@tauri-apps/api/core'
import type {
  AgentSettings,
  AgentProfileInput,
  AgentModelInput,
} from '@/modules/ai/settings'
import type { AgentContext } from '@/modules/ai/types'

export interface CompletionInput {
  runId: string
  profileId: string
  prompt: string
  context: AgentContext
  history: { role: 'user' | 'assistant'; content: string }[]
}
export interface CompletionResult {
  text: string
  steps: number
  model: string
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
  models: (input: AgentModelInput) =>
    call<string[]>('agent_list_models', { input }),
  test: (input: AgentProfileInput, clearKey: boolean) =>
    call<string>('agent_test_profile', { input, clearKey }),
  complete: (input: CompletionInput) =>
    call<CompletionResult>('agent_complete', { input }),
  cancel: (runId: string) => call<void>('agent_cancel', { runId }),
}
