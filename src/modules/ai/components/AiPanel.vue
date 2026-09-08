<script setup lang="ts">
import { computed, onMounted, reactive, toRefs } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSettingsStore } from '@/stores/settings'
import { useOverlaysStore } from '@/stores/overlays'
import { useAgentStore } from '@/stores/agent'
import { AppIcon, IconButton, AppButton } from '@/components/ui'
import { documentTypes } from '@/utils/documents'
import AgentConversation from './AgentConversation.vue'
import AgentComposer from './AgentComposer.vue'
const workspace = useWorkspaceStore()
const settings = useSettingsStore()
const overlays = useOverlaysStore()
const agent = useAgentStore()
// 响应式状态
const state = reactive({
  // 当前未发送的消息内容
  prompt: '',
})
const { prompt } = toRefs(state)
const current = computed(() => workspace.currentDocument)
const matches = computed(
  () =>
    agent.state.context?.document.id === current.value?.id &&
    agent.state.context?.tabId === workspace.activeTab?.id &&
    agent.state.context?.paneId === workspace.activePane.id &&
    agent.state.profileId === agent.active?.id
)
const messages = computed(() => (matches.value ? agent.state.messages : []))
const profiles = computed(() =>
  agent.state.settings.profiles.filter(item => item.enabled && item.model)
)
onMounted(() => {
  void agent.load().catch(() => {})
})
function configure() {
  overlays.state.settingsSection = 'ai'
  overlays.state.settings = true
}
async function submit() {
  const document = current.value,
    tab = workspace.activeTab,
    instruction = state.prompt.trim()
  if (!document || !tab || !instruction || !agent.ready || agent.running) return
  state.prompt = ''
  const successful = await agent.send(
    instruction,
    document,
    tab,
    workspace.activePane.id
  )
  if (!successful && !state.prompt) state.prompt = instruction
}
function selectProfile(event: Event) {
  void agent.activate((event.target as HTMLSelectElement).value)
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
        icon="lucide:settings-2"
        label="AI Agent 配置"
        @click="configure"
      /><IconButton
        icon="lucide:plus"
        label="新建对话"
        @click="agent.clear"
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
        :disabled="agent.running"
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
      <div class="min-w-0">
        <span class="text-muted block text-[10px]">当前文档</span
        ><span class="mt-0.5 block truncate text-xs">{{
          current?.name ?? '尚未打开文档'
        }}</span>
      </div>
    </div>
    <AgentConversation
      :messages="messages"
      :running="agent.running && matches"
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
      v-if="agent.running && !matches"
      role="status"
      class="text-muted mx-4 mb-3 text-xs leading-5"
    >
      正在处理
      {{ agent.state.context?.document.name ?? '文档' }}，可停止后切换任务。
    </p>
    <AgentComposer
      v-model="prompt"
      :running="agent.running"
      :disabled="!agent.ready || !current"
      :model-name="agent.active?.model"
      @submit="submit"
      @stop="agent.stop"
    />
  </aside>
</template>
