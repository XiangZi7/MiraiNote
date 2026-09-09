export type AgentApiFormat = 'openai' | 'anthropic'
export interface AgentLimits {
  maxSteps: number
  maxContextKb: number
  maxMessages: number
}
export interface AgentProfile {
  id: string
  name: string
  enabled: boolean
  apiFormat: AgentApiFormat
  baseUrl: string
  model: string
  hasApiKey: boolean
  limits: AgentLimits
}
export interface AgentSettings {
  activeId: string
  profiles: AgentProfile[]
}
export interface AgentProfileDraft extends Omit<AgentProfile, 'id'> {
  id?: string
  apiKey: string
  clearKey: boolean
  /** Key fetched from the backend for display; unchanged text is submitted as "keep existing". */
  revealed: string
}
export interface AgentProfileInput {
  id?: string
  name: string
  config: Pick<
    AgentProfileDraft,
    'enabled' | 'apiFormat' | 'baseUrl' | 'model' | 'apiKey' | 'limits'
  >
}
export interface AgentModelInput {
  profileId?: string
  apiFormat: AgentApiFormat
  baseUrl: string
  apiKey: string
  clearKey: boolean
}
export const providerPresets = [
  {
    value: 'openai',
    label: 'OpenAI',
    apiFormat: 'openai',
    baseUrl: 'https://api.openai.com/v1',
  },
  {
    value: 'claude',
    label: 'Claude',
    apiFormat: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
  },
  {
    value: 'deepseek',
    label: 'DeepSeek',
    apiFormat: 'openai',
    baseUrl: 'https://api.deepseek.com/v1',
  },
  {
    value: 'doubao',
    label: '豆包 / 火山方舟',
    apiFormat: 'openai',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
  },
  {
    value: 'gemini',
    label: 'Gemini',
    apiFormat: 'openai',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
  },
  {
    value: 'local',
    label: 'Ollama / 本地模型',
    apiFormat: 'openai',
    baseUrl: 'http://localhost:11434/v1',
  },
  {
    value: 'custom',
    label: '中转站 / 自定义',
    apiFormat: 'openai',
    baseUrl: '',
  },
] satisfies {
  value: string
  label: string
  apiFormat: AgentApiFormat
  baseUrl: string
}[]
export const capacityPresets = [
  {
    value: 'standard',
    label: '标准',
    limits: { maxSteps: 8, maxContextKb: 180, maxMessages: 64 },
  },
  {
    value: 'enhanced',
    label: '增强',
    limits: { maxSteps: 32, maxContextKb: 1000, maxMessages: 256 },
  },
  {
    value: 'deep',
    label: '深度',
    limits: { maxSteps: 64, maxContextKb: 4000, maxMessages: 1024 },
  },
]
export function newAgentProfile(presetId = 'openai'): AgentProfileDraft {
  const preset =
    providerPresets.find(item => item.value === presetId) ?? providerPresets[0]!
  return {
    name: preset.label,
    enabled: true,
    apiFormat: preset.apiFormat,
    baseUrl: preset.baseUrl,
    model: '',
    hasApiKey: false,
    apiKey: '',
    clearKey: false,
    revealed: '',
    limits: { ...capacityPresets[0]!.limits },
  }
}
export function editAgentProfile(profile: AgentProfile): AgentProfileDraft {
  return {
    ...profile,
    limits: { ...profile.limits },
    apiKey: '',
    clearKey: false,
    revealed: '',
  }
}
export function profileInput(draft: AgentProfileDraft): AgentProfileInput {
  return {
    id: draft.id,
    name: draft.name.trim(),
    config: {
      enabled: draft.enabled,
      apiFormat: draft.apiFormat,
      baseUrl: draft.baseUrl.trim(),
      model: draft.model.trim(),
      // A revealed key left untouched stays "unchanged", so switching the API address still
      // requires re-entering it instead of silently forwarding the old key to another service.
      apiKey:
        draft.revealed && draft.apiKey === draft.revealed ? '' : draft.apiKey,
      limits: { ...draft.limits },
    },
  }
}
export function validateProfile(draft: AgentProfileDraft): string {
  if (!draft.name.trim() || draft.name.trim().length > 80)
    return '请填写配置名称（最多 80 字）'
  try {
    const url = new URL(draft.baseUrl.trim())
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
    if (
      (url.protocol !== 'https:' && !(local && url.protocol === 'http:')) ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    )
      throw new Error()
  } catch {
    return '请填写有效的 HTTPS API 地址，本机服务可使用 HTTP'
  }
  if (draft.enabled && !draft.model.trim()) return '请填写或选择模型名称'
  const { maxSteps, maxContextKb, maxMessages } = draft.limits
  if (
    !Number.isInteger(maxSteps) ||
    maxSteps < 1 ||
    maxSteps > 128 ||
    !Number.isInteger(maxContextKb) ||
    maxContextKb < 64 ||
    maxContextKb > 4000 ||
    !Number.isInteger(maxMessages) ||
    maxMessages < 16 ||
    maxMessages > 2048
  )
    return '任务容量超出范围，请检查下方数值'
  return ''
}
