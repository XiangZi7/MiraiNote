<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from 'vue'
import { useClipboard } from '@vueuse/core'
import { AppIcon, IconButton } from '@/components/ui'
import { renderMarkdown } from '@/modules/markdown/services/render'
import { useOverlaysStore } from '@/stores/overlays'
const props = defineProps<{
  messages: {
    id: string
    role: 'user' | 'assistant'
    content: string
    failed?: boolean
  }[]
  running: boolean
}>()
const emit = defineEmits<{ suggest: [prompt: string] }>()
const { copy } = useClipboard({ legacy: true })
const overlays = useOverlaysStore()
const scroller = useTemplateRef('scroller')
// No remote images in model responses: rendering a reply must not send additional requests.
const rendered = computed(() =>
  props.messages.map(item => ({
    ...item,
    html:
      item.role === 'assistant'
        ? renderMarkdown(item.content).replace(/<img\b[^>]*>/gi, '')
        : '',
  }))
)
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
watch(
  () => [props.messages.length, props.running],
  async () => {
    await nextTick()
    scroller.value?.scrollTo({
      top: scroller.value.scrollHeight,
      behavior: 'smooth',
    })
  }
)
async function copyMessage(content: string) {
  try {
    await copy(content)
    overlays.toast('已复制回答')
  } catch {
    overlays.toast('复制失败，请手动选择文本', true)
  }
}
</script>
<template>
  <div
    ref="scroller"
    class="min-h-0 flex-1 overflow-y-auto px-4 py-6"
  >
    <template v-if="!messages.length"
      ><div
        class="bg-accent-soft text-accent mb-5 grid size-9 place-items-center rounded-lg"
      >
        <AppIcon
          name="lucide:sparkles"
          :size="20"
        />
      </div>
      <h3 class="text-[18px] font-medium tracking-tight">围绕文档，继续思考</h3>
      <p class="text-muted mt-3 text-xs leading-6">
        总结重点、整理想法，或让表达更进一步。发送时会附带当前文档。
      </p>
      <div class="mt-6 grid grid-cols-2 gap-2">
        <button
          v-for="item in suggestions"
          :key="item.label"
          class="border-line bg-surface/50 text-secondary hover:bg-hover flex items-center gap-2 rounded-md border px-3 py-2.5 text-xs"
          @click="emit('suggest', item.prompt)"
        >
          <AppIcon
            :name="item.icon"
            :size="14"
          />{{ item.label }}
        </button>
      </div>
      <div class="mt-5 flex flex-wrap gap-x-4 gap-y-2">
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
          @click="emit('suggest', `请根据当前文档${action}。`)"
        >
          {{ action }}
        </button>
      </div></template
    >
    <div
      v-else
      class="space-y-6"
    >
      <article
        v-for="message in rendered"
        :key="message.id"
        class="min-w-0 text-xs leading-6"
      >
        <div
          class="text-muted mb-2 flex items-center justify-between text-[10px]"
        >
          <span
            >{{ message.role === 'user' ? '你' : 'MiraiNote AI'
            }}{{ message.failed ? ' · 未完成' : '' }}</span
          ><IconButton
            v-if="message.role === 'assistant'"
            icon="lucide:copy"
            label="复制回答"
            :size="13"
            @click="copyMessage(message.content)"
          />
        </div>
        <p
          v-if="message.role === 'user'"
          class="bg-hover/70 rounded-lg px-3 py-2.5 wrap-anywhere whitespace-pre-wrap"
        >
          {{ message.content }}
        </p>
        <div
          v-else
          class="[&_a]:text-accent [&_pre]:bg-hover [&_td]:border-line [&_th]:border-line space-y-3 wrap-anywhere [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_h1]:text-base [&_h2]:text-sm [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_p]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-3 [&_table]:block [&_table]:overflow-x-auto [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_ul]:list-disc"
          v-html="message.html"
        />
      </article>
    </div>
    <p
      v-if="running"
      role="status"
      class="text-muted mt-5 flex items-center gap-2 text-xs"
    >
      <AppIcon
        name="lucide:loader-circle"
        :size="14"
        class="animate-spin"
      />正在分析文档…
    </p>
  </div>
</template>
