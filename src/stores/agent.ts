import { computed, reactive } from 'vue'
import { defineStore } from 'pinia'
import { agentApi, agentError } from '@/api/ipc/agent'
import type { AgentSettings } from '@/modules/ai/settings'
import type {
  AgentAttachment,
  AgentConversationSummary,
  AgentRun,
} from '@/modules/ai/types'
import type { DocumentRecord, DocumentTab } from '@/types/document'
import { captureAgentContext } from '@/modules/ai/services/context'

/** The backend owns each conversation; a restored transcript has no live run to continue. */
export const useAgentStore = defineStore('agent', () => {
  // 响应式状态；配置元数据不含密钥，聊天记录由后端加密保存。
  const state = reactive({
    // 后端返回的配置公开信息
    settings: { activeId: '', profiles: [] } as AgentSettings,
    // 当前会话快照；来自历史记录时 id 为空
    run: null as AgentRun | null,
    // 模型或工具请求是否正在进行
    busy: false,
    // 用户可见的失败信息
    error: '',
    // 当前文档的聊天记录列表
    conversations: [] as AgentConversationSummary[],
    // 历史列表加载状态
    historyLoading: false,
    // 历史读取、改名或删除错误
    historyError: '',
    // 改名或删除进行中
    historyMutating: false,
    // 会话切换中
    switchingConversation: false,
    // 当前绑定的文档
    documentId: '',
    // 配置是否已加载
    loaded: false,
  })
  let pendingLoad: Promise<void> | undefined
  let generation = 0
  let historyVersion = 0
  let mutationVersion = 0
  const active = computed(() =>
    state.settings.profiles.find(item => item.id === state.settings.activeId)
  )
  const ready = computed(() =>
    Boolean(active.value?.enabled && active.value.model)
  )
  const running = computed(() => state.busy)
  const blocked = computed(
    () =>
      state.busy ||
      state.historyLoading ||
      state.historyMutating ||
      state.switchingConversation
  )

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
  /** Drops the live run without touching its saved transcript. */
  function detach(): { token: number; id: string } {
    const token = ++generation
    historyVersion++
    mutationVersion++
    const id = state.run?.id ?? ''
    state.run = null
    state.busy = false
    state.error = ''
    state.historyLoading = false
    state.historyMutating = false
    state.switchingConversation = false
    return { token, id }
  }
  async function release(id: string, token: number) {
    if (!id) return
    try {
      await agentApi.forget(id)
    } catch (error) {
      if (token === generation) state.error = agentError(error)
    }
  }
  async function refreshHistory(token = generation, restore = false) {
    const version = ++historyVersion
    const documentId = state.documentId
    if (!documentId) return
    state.historyLoading = true
    try {
      const conversations = await agentApi.conversations(documentId)
      if (token !== generation || version !== historyVersion) return
      state.conversations = conversations
      state.historyError = ''
      if (restore && !state.run && conversations[0]) {
        const run = await agentApi.openConversation(
          documentId,
          conversations[0].id
        )
        if (token === generation && version === historyVersion) state.run = run
      }
    } catch (error) {
      if (token === generation && version === historyVersion)
        state.historyError = agentError(error)
    } finally {
      if (version === historyVersion) state.historyLoading = false
    }
  }
  /** Binds the panel to a document, restoring that document's most recent conversation. */
  async function bind(documentId: string) {
    if (state.documentId === documentId) return
    const { token, id } = detach()
    state.documentId = documentId
    state.conversations = []
    state.historyError = ''
    state.historyLoading = Boolean(documentId)
    await release(id, token)
    if (token === generation) await refreshHistory(token, true)
  }
  function acceptSettings(settings: AgentSettings) {
    state.settings = settings
    state.loaded = true
    // Saving or switching a profile stops every backend run, so start a fresh conversation.
    void newConversation()
  }
  async function activate(id: string) {
    try {
      acceptSettings(await agentApi.activate(id))
    } catch (error) {
      state.error = agentError(error)
    }
  }
  async function newConversation() {
    const { token, id } = detach()
    await release(id, token)
    if (token === generation) await refreshHistory(token)
  }
  async function selectConversation(conversationId: string) {
    if (blocked.value || state.run?.conversationId === conversationId) return
    if (!conversationId) {
      await newConversation()
      return
    }
    const documentId = state.documentId
    const { token, id } = detach()
    state.switchingConversation = true
    try {
      await release(id, token)
      if (token !== generation) return
      const run = await agentApi.openConversation(documentId, conversationId)
      if (token === generation) {
        state.run = run
        state.historyError = ''
      }
    } catch (error) {
      if (token === generation) state.historyError = agentError(error)
    } finally {
      if (token === generation) state.switchingConversation = false
    }
  }
  async function renameConversation(conversationId: string, title: string) {
    if (state.historyMutating || state.switchingConversation) return
    const version = ++mutationVersion
    state.historyMutating = true
    state.historyError = ''
    try {
      const summary = await agentApi.renameConversation(
        state.documentId,
        conversationId,
        title
      )
      if (version !== mutationVersion) return
      historyVersion++
      state.historyLoading = false
      state.conversations = state.conversations.map(item =>
        item.id === conversationId ? summary : item
      )
    } catch (error) {
      if (version === mutationVersion) state.historyError = agentError(error)
    } finally {
      if (version === mutationVersion) state.historyMutating = false
    }
  }
  async function removeConversation(conversationId: string) {
    if (!conversationId || state.switchingConversation || state.historyMutating)
      return
    const version = ++mutationVersion
    const documentId = state.documentId
    state.historyMutating = true
    state.historyError = ''
    try {
      if (state.run?.conversationId === conversationId && state.busy)
        await stop()
      if (version !== mutationVersion) return
      await agentApi.deleteConversation(documentId, conversationId)
      if (version !== mutationVersion) return
      if (state.run?.conversationId === conversationId) {
        const token = ++generation
        const id = state.run.id
        state.run = null
        state.busy = false
        state.error = ''
        await release(id, token)
      }
      if (version !== mutationVersion) return
      state.conversations = state.conversations.filter(
        item => item.id !== conversationId
      )
      await refreshHistory()
    } catch (error) {
      if (version === mutationVersion) state.historyError = agentError(error)
    } finally {
      if (version === mutationVersion) state.historyMutating = false
    }
  }
  async function stop() {
    const token = ++generation
    const id = state.run?.id
    state.busy = false
    if (state.run) state.run.status = 'cancelled'
    if (id) {
      try {
        await agentApi.cancel(id)
      } catch (error) {
        if (token === generation)
          state.error = `停止请求未确认：${agentError(error)}`
      }
    }
    if (token === generation) await refreshHistory(token)
  }
  function accept(run: AgentRun, token: number): boolean {
    if (token !== generation) {
      if (run.id) void agentApi.forget(run.id).catch(() => {})
      return false
    }
    state.run = run
    return true
  }
  async function advance(token: number) {
    while (token === generation && state.run?.status === 'running') {
      if (!accept(await agentApi.step(state.run.id), token)) return
    }
  }
  async function send(
    prompt: string,
    attachments: AgentAttachment[],
    document: DocumentRecord,
    tab: DocumentTab,
    paneId: string
  ): Promise<boolean> {
    const profile = active.value
    if (
      !ready.value ||
      !profile ||
      blocked.value ||
      (!prompt.trim() && !attachments.length) ||
      document.id !== state.documentId
    )
      return false
    const token = ++generation
    state.busy = true
    state.error = ''
    let sent = false
    try {
      const context = await captureAgentContext(document, tab, paneId)
      if (token !== generation) return false
      const previous = state.run
      const continuing =
        previous?.id &&
        previous.status === 'completed' &&
        previous.documentId === document.id
      const next = continuing
        ? await agentApi.send({
            runId: previous.id,
            prompt: prompt.trim(),
            context,
            attachments,
          })
        : await (async () => {
            if (previous?.id) await agentApi.forget(previous.id)
            if (token !== generation) throw new Error('AI 任务已切换')
            return agentApi.start({
              profileId: profile.id,
              prompt: prompt.trim(),
              context,
              conversationId:
                previous?.documentId === document.id
                  ? previous?.conversationId
                  : undefined,
              attachments,
            })
          })()
      if (!accept(next, token)) return false
      sent = true
      await advance(token)
      return true
    } catch (error) {
      if (token === generation) state.error = agentError(error)
      return sent
    } finally {
      if (token === generation) {
        state.busy = false
        await refreshHistory(token)
      }
    }
  }
  return {
    state,
    active,
    ready,
    running,
    blocked,
    load,
    bind,
    acceptSettings,
    activate,
    send,
    stop,
    newConversation,
    selectConversation,
    renameConversation,
    removeConversation,
    refreshHistory,
  }
})
