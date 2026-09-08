<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSettingsStore } from '@/stores/settings'
import { useOverlaysStore } from '@/stores/overlays'
import { documentTypes } from '@/utils/documents'
import { AppIcon, IconButton, AppButton } from '@/components/ui'
const workspace = useWorkspaceStore(),
  settings = useSettingsStore(),
  overlays = useOverlaysStore()
const prompt = shallowRef('')
const submitted = shallowRef('')
const current = computed(() => workspace.currentDocument)
const suggestions = [
  {
    label: '总结文档',
    icon: 'lucide:text',
    prompt: '请总结这份文档的核心观点，并列出三个重点。',
  },
  {
    label: '润色表达',
    icon: 'lucide:pen-line',
    prompt: '请润色这份文档的表达，保留原意，让行文更加清晰自然。',
  },
  {
    label: '提取待办',
    icon: 'lucide:list-todo',
    prompt: '请从当前文档中提取待办事项，并按优先级排列。',
  },
  {
    label: '翻译内容',
    icon: 'lucide:languages',
    prompt: '请将当前文档翻译为英文，保留标题和段落结构。',
  },
]
function submit() {
  if (!prompt.value.trim() || !current.value) return
  submitted.value = prompt.value.trim()
  prompt.value = ''
}
</script>

<template>
  <aside
    class="bg-inspector flex h-full shrink-0 flex-col"
    :style="{ width: `${settings.settings.aiWidth}px` }"
    aria-label="AI 助手"
  >
    <header
      class="border-line flex h-11 shrink-0 items-center gap-2 border-b px-4"
    >
      <AppIcon
        name="lucide:sparkles"
        :size="16"
        class="text-accent"
      />
      <h2 class="flex-1 text-[13px] font-medium">AI 助手</h2>
      <IconButton
        icon="lucide:rotate-ccw"
        label="清空请求预览"
        @click="submitted = ''"
      /><IconButton
        icon="lucide:x"
        label="关闭 AI 助手"
        @click="overlays.state.ai = false"
      />
    </header>
    <div
      class="border-line bg-surface/60 mx-4 mt-4 flex items-center gap-2.5 rounded-md border px-3 py-2.5"
    >
      <AppIcon
        :name="current ? documentTypes[current.kind].icon : 'lucide:files'"
        :size="18"
        class="text-secondary"
      />
      <div class="min-w-0">
        <span class="text-muted block text-[10px]">当前文档 · 活动面板</span
        ><span class="mt-0.5 block truncate text-xs">{{
          current?.name ?? '尚未打开文档'
        }}</span>
      </div>
    </div>
    <div class="min-h-0 flex-1 overflow-auto px-5 py-9">
      <template v-if="!submitted"
        ><div
          class="bg-accent-soft text-accent mb-5 grid size-9 place-items-center rounded-lg"
        >
          <AppIcon
            name="lucide:sparkles"
            :size="20"
          />
        </div>
        <h3 class="text-[18px] font-medium tracking-tight">
          围绕文档，继续思考
        </h3>
        <p class="text-muted mt-3 text-xs leading-6">
          总结重点、整理想法，或让表达更进一步。当前文档将作为请求上下文。
        </p>
        <div class="mt-7 grid grid-cols-2 gap-2">
          <button
            v-for="item in suggestions"
            :key="item.label"
            class="border-line bg-surface/50 text-secondary hover:bg-hover flex items-center gap-2 rounded-md border px-3 py-2.5 text-xs transition-colors"
            @click="prompt = item.prompt"
          >
            <AppIcon
              :name="item.icon"
              :size="14"
            />{{ item.label }}
          </button>
        </div>
        <div class="mt-6 flex flex-wrap gap-x-4 gap-y-2">
          <button
            v-for="action in [
              '扩写',
              '缩写',
              '生成标题',
              '生成目录',
              '解释内容',
              '检查 Markdown',
              '生成代码',
            ]"
            :key="action"
            class="text-muted hover:text-accent text-[11px]"
            @click="prompt = `请根据当前文档${action}。`"
          >
            {{ action }}
          </button>
        </div></template
      ><template v-else
        ><div class="mb-4 flex items-center gap-2 text-xs font-medium">
          <AppIcon
            name="lucide:file-check-2"
            :size="16"
          />请求预览
        </div>
        <p class="bg-hover/60 rounded-lg px-3 py-3 text-xs leading-6">
          {{ submitted }}
        </p>
        <dl class="mt-5 space-y-3 text-xs">
          <div>
            <dt class="text-muted">文档上下文</dt>
            <dd class="mt-1">{{ current?.name }}</dd>
          </div>
          <div>
            <dt class="text-muted">内容长度</dt>
            <dd class="mt-1">{{ current?.text.length ?? 0 }} 字符</dd>
          </div>
        </dl>
        <p class="text-muted mt-6 text-xs leading-6">
          模型尚未连接。这是请求内容预览，尚未发送文档数据。
        </p>
        <AppButton
          variant="ghost"
          class="mt-3 -ml-3"
          @click="
            prompt = submitted
            submitted = ''
          "
          >继续编辑请求</AppButton
        ></template
      >
    </div>
    <form
      class="border-line bg-surface focus-within:border-accent/60 mx-4 mb-4 rounded-lg border p-3"
      @submit.prevent="submit"
    >
      <textarea
        v-model="prompt"
        aria-label="AI 请求"
        placeholder="针对这份文档，描述你的想法…"
        class="placeholder:text-muted h-[70px] w-full resize-none border-0 bg-transparent text-xs leading-6 outline-none"
        @keydown.enter.exact.prevent="submit"
      />
      <div class="flex items-center justify-between">
        <span class="text-muted text-[10px]">界面预览 · 模型未连接</span
        ><IconButton
          icon="lucide:arrow-up"
          label="预览请求"
          class="bg-hover"
          :disabled="!prompt.trim() || !current"
          @click="submit"
        />
      </div>
    </form>
  </aside>
</template>
