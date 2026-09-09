<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useClipboard } from '@vueuse/core'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSettingsStore } from '@/stores/settings'
import { useOverlaysStore } from '@/stores/overlays'
import { useAgentStore } from '@/stores/agent'
import { AppIcon, IconButton, AppButton } from '@/components/ui'
import { documentTypes } from '@/utils/documents'
import { useAgentDraft } from '../composables/useAgentDraft'
import AgentConversation from './AgentConversation.vue'
import AgentComposer from './AgentComposer.vue'
import AgentHistoryMenu from './AgentHistoryMenu.vue'
import type { AgentAttachment } from '../types'
const workspace = useWorkspaceStore()
const settings = useSettingsStore()
const overlays = useOverlaysStore()
const agent = useAgentStore()
const { copy } = useClipboard({ legacy: true })
const current = computed(() => workspace.currentDocument)
const entries = computed(() => agent.state.run?.entries ?? [])
const profiles = computed(() =>
  agent.state.settings.profiles.filter(item => item.enabled && item.model)
)
const statusLabel = computed(
  () =>
    ({
      running: '正在处理',
      completed: '本轮完成',
      cancelled: '已停止',
      failed: '任务未完成',
    })[agent.state.run?.status ?? 'completed']
)
const draft = useAgentDraft(send)
const { prompt, attachments, reading, attachmentError } = draft
const canSend = computed(() =>
  Boolean(
    current.value &&
    workspace.activeTab &&
    agent.ready &&
    !agent.blocked &&
    !reading.value &&
    (prompt.value.trim() || attachments.value.length)
  )
)
onMounted(() => {
  void agent.load().catch(() => {})
})
// The panel follows the active document; each document keeps its own chat history.
watch(
  () => current.value?.id ?? '',
  id => void agent.bind(id),
  { immediate: true }
)
async function send(text: string, files: AgentAttachment[]) {
  const document = current.value,
    tab = workspace.activeTab
  if (!document || !tab) return false
  return agent.send(text, files, document, tab, workspace.activePane.id)
}
function configure() {
  overlays.state.settingsSection = 'ai'
  overlays.state.settings = true
}
function startNew() {
  draft.reset()
  void agent.newConversation()
}
function switchConversation(id: string) {
  draft.reset()
  void agent.selectConversation(id)
}
function selectProfile(event: Event) {
  void agent.activate((event.target as HTMLSelectElement).value)
}
async function copyConversation() {
  if (!entries.value.length) return
  try {
    await copy(
      entries.value
        .map(entry =>
          [
            `${entry.role}: ${entry.text}`,
            entry.attachments?.length
              ? `附件：${entry.attachments.map(file => file.name).join('、')}`
              : '',
            entry.detail ?? '',
          ]
            .filter(Boolean)
            .join('\n')
        )
        .join('\n\n')
    )
    overlays.toast('已复制整段对话')
  } catch {
    overlays.toast('复制失败，请手动选择文本', true)
  }
}
</script>
<template>
  <aside
    class="bg-inspector flex h-full shrink-0 flex-col"
    :style="{ width: `${settings.settings.aiWidth}px` }"
    aria-label="AI 助手"
  >
    <header
      class="border-line flex h-11 shrink-0 items-center gap-1 border-b px-3"
    >
      <AppIcon
        name="lucide:sparkles"
        :size="16"
        class="text-accent mr-1"
      />
      <h2 class="flex-1 text-[13px] font-medium">AI 助手</h2>
      <IconButton
        icon="lucide:copy"
        label="复制整段对话"
        :disabled="!entries.length"
        @click="copyConversation"
      /><IconButton
        icon="lucide:settings-2"
        label="AI Agent 配置"
        @click="configure"
      /><AgentHistoryMenu
        :conversations="agent.state.conversations"
        :active-id="agent.state.run?.conversationId ?? ''"
        :loading="agent.state.historyLoading"
        :mutating="agent.state.historyMutating"
        :disabled="!current || agent.state.switchingConversation"
        :error="agent.state.historyError"
        @select="switchConversation"
        @rename="agent.renameConversation"
        @remove="agent.removeConversation"
        @refresh="agent.refreshHistory()"
      /><IconButton
        icon="lucide:square-pen"
        label="新建对话"
        :disabled="agent.blocked"
        @click="startNew"
      /><IconButton
        icon="lucide:x"
        label="关闭 AI 助手"
        @click="overlays.state.ai = false"
      />
    </header>
    <div class="border-line mx-4 mt-3 flex items-center gap-2 border-b pb-3">
      <AppIcon
        name="lucide:bot"
        :size="14"
        class="text-muted shrink-0"
      /><select
        v-if="profiles.length"
        :value="agent.state.settings.activeId"
        aria-label="AI 模型配置"
        class="min-w-0 flex-1 bg-transparent text-xs outline-none"
        :disabled="agent.blocked"
        @change="selectProfile"
      >
        <option
          value=""
          disabled
        >
          选择模型配置
        </option>
        <option
          v-for="profile in profiles"
          :key="profile.id"
          :value="profile.id"
        >
          {{ profile.name }} · {{ profile.model }}
        </option></select
      ><button
        v-else
        class="text-muted hover:text-accent text-xs"
        @click="configure"
      >
        配置模型服务
      </button>
    </div>
    <div class="mx-4 mt-3 flex items-center gap-2.5">
      <AppIcon
        :name="current ? documentTypes[current.kind].icon : 'lucide:files'"
        :size="17"
        class="text-secondary shrink-0"
      />
      <div class="min-w-0 flex-1">
        <span class="text-muted block text-[10px]">当前文档</span
        ><span class="mt-0.5 block truncate text-xs">{{
          current?.name ?? '尚未打开文档'
        }}</span>
      </div>
      <span
        v-if="agent.state.run"
        class="text-muted shrink-0 text-[10px]"
        >{{ statusLabel }}</span
      >
    </div>
    <AgentConversation
      :entries="entries"
      :running="agent.running"
      :has-run="Boolean(agent.state.run)"
      @suggest="prompt = $event"
    />
    <div
      v-if="!agent.ready"
      class="mx-4 mb-3 shrink-0"
    >
      <p class="text-muted text-xs leading-5">
        添加模型配置后，即可开始分析文档。
      </p>
      <AppButton
        variant="ghost"
        class="text-accent mt-1 -ml-3 text-xs"
        @click="configure"
        >打开 AI 配置<AppIcon
          name="lucide:arrow-right"
          :size="13"
      /></AppButton>
    </div>
    <p
      v-if="agent.state.error"
      role="alert"
      class="text-danger mx-4 mb-3 max-h-20 overflow-auto text-xs leading-5"
    >
      {{ agent.state.error }}
    </p>
    <p
      v-if="agent.state.run?.saveError"
      role="alert"
      class="text-danger mx-4 mb-3 text-xs leading-5"
    >
      {{ agent.state.run.saveError }}
    </p>
    <AgentComposer
      v-model="prompt"
      :running="agent.running"
      :disabled="!agent.ready || !current"
      :can-send="canSend"
      :model-name="agent.active?.model"
      :attachments="attachments"
      :reading="reading"
      :attachment-error="attachmentError"
      @submit="draft.submit"
      @stop="agent.stop"
      @attach="draft.addFiles"
      @remove-attachment="draft.removeFile"
    />
  </aside>
</template>
