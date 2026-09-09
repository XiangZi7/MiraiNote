<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from 'vue'
import { AppIcon, IconButton } from '@/components/ui'
import {
  AGENT_FILE_ACCEPT,
  formatAttachmentSize,
} from '../services/attachments'
import type { AgentDraftAttachment } from '../types'
const props = defineProps<{
  running: boolean
  disabled: boolean
  canSend: boolean
  modelName?: string
  attachments: AgentDraftAttachment[]
  reading: boolean
  attachmentError: string
}>()
const prompt = defineModel<string>({ required: true })
const emit = defineEmits<{
  submit: []
  stop: []
  attach: [files: File[]]
  removeAttachment: [id: string]
}>()
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const textarea = useTemplateRef<HTMLTextAreaElement>('textarea')
const total = computed(() =>
  props.attachments.reduce((sum, file) => sum + file.size, 0)
)
function enter(event: KeyboardEvent) {
  if (
    event.isComposing ||
    event.shiftKey ||
    event.ctrlKey ||
    event.altKey ||
    event.metaKey
  )
    return
  event.preventDefault()
  if (props.canSend) emit('submit')
}
function selectFiles(event: Event) {
  const input = event.target as HTMLInputElement
  if (!props.disabled) emit('attach', Array.from(input.files ?? []))
  input.value = ''
}
watch(
  prompt,
  async () => {
    await nextTick()
    const element = textarea.value
    if (!element) return
    element.style.height = 'auto'
    element.style.height = `${Math.min(160, Math.max(70, element.scrollHeight))}px`
  },
  { immediate: true }
)
</script>
<template>
  <form
    class="border-line bg-surface focus-within:border-accent/60 mx-4 mb-4 shrink-0 rounded-lg border p-3"
    @submit.prevent="canSend && emit('submit')"
  >
    <ul
      v-if="attachments.length"
      class="mb-2 flex max-h-28 flex-wrap gap-1.5 overflow-y-auto"
      aria-label="待发送附件"
    >
      <li
        v-for="file in attachments"
        :key="file.id"
        class="border-line bg-elevated flex min-w-0 items-center gap-1.5 rounded-md border px-2 py-1"
      >
        <AppIcon
          name="lucide:file-text"
          class="text-muted shrink-0"
        />
        <span class="min-w-0">
          <span
            class="block max-w-35 truncate text-[11px]"
            :title="file.name"
            >{{ file.name }}</span
          ><span class="text-muted block text-[10px]">{{
            formatAttachmentSize(file.size)
          }}</span>
        </span>
        <IconButton
          icon="lucide:x"
          :label="`移除附件 ${file.name}`"
          :disabled="disabled"
          @click="emit('removeAttachment', file.id)"
        />
      </li>
    </ul>
    <textarea
      ref="textarea"
      v-model="prompt"
      aria-label="AI 请求"
      placeholder="针对这份文档，描述你的想法…"
      maxlength="32000"
      class="placeholder:text-muted min-h-17.5 w-full resize-none border-0 bg-transparent text-xs leading-6 outline-none"
      @keydown.enter="enter"
    />
    <div class="flex items-center justify-between gap-2">
      <input
        ref="fileInput"
        type="file"
        multiple
        class="hidden"
        :accept="AGENT_FILE_ACCEPT"
        :disabled="disabled || reading"
        tabindex="-1"
        aria-hidden="true"
        @change="selectFiles"
      /><IconButton
        :icon="reading ? 'lucide:loader-circle' : 'lucide:paperclip'"
        :class="{ 'animate-spin': reading }"
        label="上传文件"
        title="上传文本、日志、代码、PDF 或 DOCX，单个最多 64 KB 文本"
        :disabled="disabled || reading"
        @click="fileInput?.click()"
      /><span
        class="text-muted min-w-0 flex-1 truncate text-[10px]"
        :title="modelName"
        >{{ modelName || '请先配置模型' }}</span
      ><IconButton
        v-if="running"
        icon="lucide:square"
        label="停止生成"
        class="bg-hover"
        @click="emit('stop')"
      /><IconButton
        v-else
        icon="lucide:arrow-up"
        label="发送消息"
        class="bg-hover"
        :disabled="!canSend"
        @click="emit('submit')"
      />
    </div>
    <p
      v-if="attachmentError"
      role="alert"
      class="text-danger mt-2 text-[10px] leading-5 wrap-anywhere"
    >
      {{ attachmentError }}
    </p>
    <p
      v-else-if="reading"
      role="status"
      class="text-muted mt-2 text-[10px] leading-5"
    >
      正在读取附件…
    </p>
    <p
      v-else-if="attachments.length"
      class="text-muted mt-2 text-[10px] leading-5"
    >
      {{ attachments.length }} 个附件 · {{ formatAttachmentSize(total) }}，
      将在发送时交给所选模型并保存到此聊天。
    </p>
  </form>
</template>
