<script setup lang="ts">
import { reactive, toRefs, useId } from 'vue'
import { AppSelect, AppSwitch, IconButton, TextInput } from '@/components/ui'
import AgentModelField from './AgentModelField.vue'
import AgentCapacityFields from './AgentCapacityFields.vue'
import type { AgentApiFormat, AgentProfileDraft } from '../settings'
defineProps<{ disabled: boolean }>()
const draft = defineModel<AgentProfileDraft>({ required: true })
const id = useId()
const formats: { value: AgentApiFormat; label: string }[] = [
  { value: 'openai', label: 'OpenAI · Chat Completions' },
  { value: 'anthropic', label: 'Claude · Messages' },
]
// 响应式状态
const state = reactive({
  // 仅控制本次输入密钥的可见性
  showKey: false,
})
const { showKey } = toRefs(state)
</script>
<template>
  <fieldset
    :disabled="disabled"
    aria-label="模型服务配置"
    class="min-w-0 space-y-5 border-0 p-0 disabled:opacity-60"
  >
    <div class="grid grid-cols-2 gap-4">
      <label
        :for="`${id}-name`"
        class="grid gap-2 text-xs"
        ><span class="text-secondary">配置名称</span
        ><TextInput
          :id="`${id}-name`"
          v-model="draft.name"
          placeholder="例如：我的文档助手"
          maxlength="80"
      /></label>
      <AppSelect
        v-model="draft.apiFormat"
        label="API 格式"
        :options="formats"
        :disabled="disabled"
      />
    </div>
    <AppSwitch
      v-model="draft.enabled"
      label="启用此配置"
      description="发送消息时使用此模型分析当前文档"
      :disabled="disabled"
    />
    <label
      :for="`${id}-url`"
      class="grid gap-2 text-xs"
      ><span class="text-secondary">API 地址</span
      ><TextInput
        :id="`${id}-url`"
        v-model="draft.baseUrl"
        type="url"
        placeholder="https://api.example.com/v1"
        autocomplete="off"
        :spellcheck="false"
      /><span class="text-muted text-[11px] leading-5"
        >填写服务基础地址；官网、中转站或本机服务均可单独配置。</span
      ></label
    >
    <div class="space-y-2 text-xs">
      <div class="flex items-center justify-between">
        <label
          :for="`${id}-key`"
          class="text-secondary"
          >API Key</label
        ><span
          v-if="draft.hasApiKey"
          class="text-muted flex items-center gap-1 text-[10px]"
          >已加密保存</span
        >
      </div>
      <div class="flex items-center gap-1">
        <TextInput
          :id="`${id}-key`"
          v-model="draft.apiKey"
          :type="showKey ? 'text' : 'password'"
          :placeholder="
            draft.hasApiKey
              ? '留空保留已保存的密钥'
              : '输入 API Key（本机服务可留空）'
          "
          autocomplete="new-password"
          :spellcheck="false"
          :disabled="draft.clearKey"
          maxlength="8192"
        /><IconButton
          :icon="showKey ? 'lucide:eye-off' : 'lucide:eye'"
          :label="showKey ? '隐藏密钥' : '显示密钥'"
          :disabled="draft.clearKey"
          @click="showKey = !showKey"
        />
      </div>
      <label
        v-if="draft.hasApiKey"
        class="text-muted flex items-center gap-2 text-[11px]"
        ><input
          v-model="draft.clearKey"
          type="checkbox"
          class="accent-accent"
        />保存时清除已有密钥</label
      >
    </div>
    <AgentModelField
      v-model="draft.model"
      :draft="draft"
      :disabled="disabled"
    />
    <AgentCapacityFields v-model="draft.limits" />
  </fieldset>
</template>
