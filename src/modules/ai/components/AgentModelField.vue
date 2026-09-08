<script setup lang="ts">
import { onScopeDispose, reactive, toRefs, useId, watch } from 'vue'
import { AppButton, AppIcon, TextInput } from '@/components/ui'
import { agentApi, agentError } from '@/api/ipc/agent'
import type { AgentProfileDraft } from '../settings'
const props = defineProps<{ draft: AgentProfileDraft; disabled?: boolean }>()
const model = defineModel<string>({ required: true })
const id = useId()
let version = 0
// 响应式状态
const state = reactive({
  // 当前地址返回的模型列表
  models: [] as string[],
  // 模型列表加载状态
  fetching: false,
  // 获取失败的提示
  error: '',
  // 获取结果提示
  message: '',
})
const { models, fetching, error, message } = toRefs(state)
watch(
  () => [
    props.draft.id,
    props.draft.apiFormat,
    props.draft.baseUrl,
    props.draft.apiKey,
    props.draft.clearKey,
  ],
  () => {
    version++
    state.models = []
    state.fetching = false
    state.error = ''
    state.message = ''
  }
)
onScopeDispose(() => {
  version++
})
async function fetchModels() {
  if (state.fetching || props.disabled) return
  const token = ++version
  state.fetching = true
  state.error = ''
  state.message = ''
  const draft = props.draft
  try {
    const result = await agentApi.models({
      profileId: draft.id,
      apiFormat: draft.apiFormat,
      baseUrl: draft.baseUrl,
      apiKey: draft.apiKey,
      clearKey: draft.clearKey,
    })
    if (token !== version) return
    state.models = result
    state.message = result.length
      ? `已获取 ${result.length} 个模型，可输入关键词筛选`
      : '服务未返回模型，可直接手动填写'
  } catch (error) {
    if (token === version) state.error = agentError(error)
  } finally {
    if (token === version) state.fetching = false
  }
}
</script>
<template>
  <div class="space-y-2 text-xs">
    <label
      :for="id"
      class="text-secondary"
      >模型名称</label
    >
    <div class="flex items-center gap-2">
      <TextInput
        :id="id"
        v-model="model"
        :list="`${id}-models`"
        placeholder="手动输入或获取模型列表"
        :disabled="disabled"
        autocomplete="off"
        :spellcheck="false"
        maxlength="200"
      />
      <AppButton
        class="shrink-0 text-xs"
        :disabled="
          disabled || fetching || !draft.baseUrl.trim() || !agentApi.isDesktop()
        "
        :aria-busy="fetching"
        @click="fetchModels"
        ><AppIcon
          :name="fetching ? 'lucide:loader-circle' : 'lucide:refresh-cw'"
          :class="{ 'animate-spin': fetching }"
          :size="13"
        />获取模型</AppButton
      >
    </div>
    <datalist :id="`${id}-models`">
      <option
        v-for="name in models"
        :key="name"
        :value="name"
      />
    </datalist>
    <p
      v-if="error"
      role="alert"
      class="text-danger text-[11px] leading-5"
    >
      {{ error }}
    </p>
    <p
      v-else
      class="text-muted text-[11px] leading-5"
      role="status"
    >
      {{ message || '填写服务商提供的模型 ID，选择支持工具调用的对话模型。' }}
    </p>
  </div>
</template>
