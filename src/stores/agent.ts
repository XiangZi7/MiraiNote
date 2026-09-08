import { computed, reactive } from 'vue'
import { defineStore } from 'pinia'
import { agentApi, agentError } from '@/api/ipc/agent'
import type { AgentSettings } from '@/modules/ai/settings'
import type { AgentContext } from '@/modules/ai/types'
import type { DocumentRecord, DocumentTab } from '@/types/document'
import { captureAgentContext } from '@/modules/ai/services/context'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  failed?: boolean
}
export const useAgentStore = defineStore('agent', () => {
  // 响应式状态；配置元数据不含密钥，会话只保留在本次应用内存中。
  const state = reactive({
    // 后端返回的配置公开信息
    settings: { activeId: '', profiles: [] } as AgentSettings,
    // 当前对话消息
    messages: [] as ChatMessage[],
    // 对话绑定的文档快照
    context: null as AgentContext | null,
    // 对话绑定的服务配置
    profileId: '',
    // 当前任务标识，含捕获上下文阶段
    runId: '',
    // 用户可见的失败信息
    error: '',
    // 配置是否已加载
    loaded: false,
  })
  let pendingLoad: Promise<void> | undefined
  const active = computed(() =>
    state.settings.profiles.find(item => item.id === state.settings.activeId)
  )
  const ready = computed(() =>
    Boolean(active.value?.enabled && active.value.model)
  )
  const running = computed(() => Boolean(state.runId))
  async function load() {
    if (pendingLoad) return pendingLoad
    pendingLoad = (async () => {
      try {
        state.settings = await agentApi.getSettings()
        state.loaded = true
      } catch (error) {
        state.error = agentError(error)
        throw error
      } finally {
        pendingLoad = undefined
      }
    })()
    return pendingLoad
  }
  function acceptSettings(settings: AgentSettings) {
    state.runId = ''
    state.settings = settings
    state.loaded = true
    state.messages = []
    state.context = null
    state.error = ''
  }
  async function activate(id: string) {
    try {
      acceptSettings(await agentApi.activate(id))
    } catch (error) {
      state.error = agentError(error)
    }
  }
  async function stop() {
    const id = state.runId
    if (!id) return
    state.runId = ''
    const last = state.messages.at(-1)
    if (last?.role === 'user') last.failed = true
    try {
      await agentApi.cancel(id)
    } catch (error) {
      state.error = agentError(error)
    }
  }
  async function clear() {
    await stop()
    state.messages = []
    state.context = null
    state.error = ''
  }
  async function send(
    prompt: string,
    document: DocumentRecord,
    tab: DocumentTab,
    paneId: string
  ) {
    const profile = active.value
    if (!ready.value || !profile || state.runId || !prompt.trim()) return false
    const id = crypto.randomUUID()
    state.runId = id
    state.error = ''
    let user: ChatMessage | undefined
    try {
      const context = await captureAgentContext(document, tab, paneId)
      if (state.runId !== id) return false
      if (
        state.context?.document.id !== document.id ||
        state.profileId !== profile.id ||
        state.context.tabId !== tab.id ||
        state.context.paneId !== paneId
      )
        state.messages = []
      const history = state.messages
        .filter(item => !item.failed)
        .map(item => ({ role: item.role, content: item.content }))
      user = { id: crypto.randomUUID(), role: 'user', content: prompt.trim() }
      state.messages.push(user)
      state.context = context
      state.profileId = profile.id
      const response = await agentApi.complete({
        runId: id,
        profileId: profile.id,
        prompt: prompt.trim(),
        context,
        history,
      })
      if (state.runId !== id) return false
      state.messages.push({
        id: crypto.randomUUID(),
        role: 'assistant',
        content: response.text,
      })
      return true
    } catch (error) {
      if (state.runId === id) {
        state.error = agentError(error)
        const message = state.messages.find(item => item.id === user?.id)
        if (message) message.failed = true
      }
      return false
    } finally {
      if (state.runId === id) state.runId = ''
    }
  }
  return {
    state,
    active,
    ready,
    running,
    load,
    acceptSettings,
    activate,
    send,
    stop,
    clear,
  }
})
