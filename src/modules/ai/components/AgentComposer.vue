<script setup lang="ts">
import { IconButton } from '@/components/ui'
defineProps<{ running: boolean; disabled: boolean; modelName?: string }>()
const prompt = defineModel<string>({ required: true })
const emit = defineEmits<{ submit: []; stop: [] }>()
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
  emit('submit')
}
</script>
<template>
  <form
    class="border-line bg-surface focus-within:border-accent/60 mx-4 mb-4 shrink-0 rounded-lg border p-3"
    @submit.prevent="emit('submit')"
  >
    <textarea
      v-model="prompt"
      aria-label="AI 请求"
      placeholder="针对这份文档，描述你的想法…"
      class="placeholder:text-muted h-[70px] w-full resize-none border-0 bg-transparent text-xs leading-6 outline-none"
      @keydown.enter="enter"
    />
    <div class="flex items-center justify-between gap-2">
      <span
        class="text-muted truncate text-[10px]"
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
        :disabled="disabled || !prompt.trim()"
        @click="emit('submit')"
      />
    </div>
  </form>
</template>
