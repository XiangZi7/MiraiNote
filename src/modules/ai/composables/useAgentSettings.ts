import { computed, onMounted, onScopeDispose, reactive, toRefs } from 'vue'
import { agentApi, agentError } from '@/api/ipc/agent'
import { useAgentStore } from '@/stores/agent'
import {
  editAgentProfile,
  newAgentProfile,
  profileInput,
  validateProfile,
} from '../settings'
import type { AgentProfileDraft } from '../settings'

export function useAgentSettings() {
  const agent = useAgentStore()
  let disposed = false
  // 响应式状态；密钥草稿只存在于此设置页面。
  const state = reactive({
    // 各配置未提交的表单
    drafts: {} as Record<string, AgentProfileDraft>,
    // 选中的表单标识
    selectedId: '',
    // 添加配置时使用的服务预设
    preset: 'openai',
    // 初始读取状态
    loading: true,
    // 保存、测试或删除操作状态
    busy: false,
    // 失败提示
    error: '',
    // 操作完成提示
    message: '',
  })
  const draft = computed({
    get: () => state.drafts[state.selectedId],
    set: value => {
      if (value) state.drafts[state.selectedId] = value
    },
  })
  const options = computed(() =>
    Object.entries(state.drafts).map(([id, item]) => ({
      value: id,
      label: `${item.name || '未命名配置'}${agent.state.settings.activeId === id ? ' · 使用中' : !item.id ? ' · 未保存' : ''}`,
    }))
  )
  function add() {
    if (state.busy) return
    const id = `draft-${crypto.randomUUID()}`
    state.drafts[id] = newAgentProfile(state.preset)
    state.selectedId = id
    state.error = ''
    state.message = ''
  }
  async function initialize() {
    state.loading = true
    state.error = ''
    try {
      await agent.load()
      if (disposed) return
      for (const profile of agent.state.settings.profiles)
        state.drafts[profile.id] = editAgentProfile(profile)
      state.selectedId =
        agent.state.settings.activeId || Object.keys(state.drafts)[0] || ''
      if (!state.selectedId) add()
    } catch (error) {
      state.error = agentError(error)
    } finally {
      state.loading = false
    }
  }
  onMounted(initialize)
  onScopeDispose(() => {
    disposed = true
    for (const item of Object.values(state.drafts)) item.apiKey = ''
  })
  async function submit(test = false) {
    const current = draft.value
    if (!current || state.busy || state.loading) return
    state.error = validateProfile(current)
    state.message = ''
    if (state.error) return
    state.busy = true
    const selected = state.selectedId
    try {
      if (test) {
        const message = await agentApi.test(
          profileInput(current),
          current.clearKey
        )
        if (!disposed)
          state.message = `${message}。测试使用当前填写内容，尚未保存。`
      } else {
        const settings = await agentApi.save(
          profileInput(current),
          current.clearKey
        )
        agent.acceptSettings(settings)
        current.apiKey = ''
        if (disposed) return
        const saved = settings.profiles.find(
          item => item.id === settings.activeId
        )
        if (!saved) throw new Error('未找到已保存的配置，请重新打开设置')
        delete state.drafts[selected]
        state.drafts[saved.id] = editAgentProfile(saved)
        state.selectedId = saved.id
        state.message = saved.enabled
          ? `已保存并使用 ${saved.name}`
          : `已保存 ${saved.name}，此配置已停用`
      }
    } catch (error) {
      if (!disposed) state.error = agentError(error)
    } finally {
      state.busy = false
    }
  }
  async function remove() {
    const current = draft.value
    if (!current || state.busy) return
    state.busy = true
    state.error = ''
    state.message = ''
    try {
      if (current.id) agent.acceptSettings(await agentApi.remove(current.id))
      current.apiKey = ''
      if (disposed) return
      delete state.drafts[state.selectedId]
      state.selectedId = Object.keys(state.drafts)[0] ?? ''
      state.message = '配置已删除'
    } catch (error) {
      if (!disposed) state.error = agentError(error)
    } finally {
      state.busy = false
    }
    if (!disposed && !state.selectedId) add()
  }
  return { ...toRefs(state), draft, options, add, submit, remove, initialize }
}
