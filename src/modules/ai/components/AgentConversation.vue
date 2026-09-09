<script setup lang="ts">
import { computed, nextTick, useTemplateRef, watch } from 'vue'
import { useClipboard } from '@vueuse/core'
import { AppIcon, IconButton } from '@/components/ui'
import { renderMarkdown } from '@/modules/markdown/services/render'
import { useOverlaysStore } from '@/stores/overlays'
import { formatAttachmentSize } from '../services/attachments'
import type { AgentEntry } from '../types'
const props = defineProps<{
  entries: AgentEntry[]
  running: boolean
  hasRun: boolean
}>()
const emit = defineEmits<{ suggest: [prompt: string] }>()
const { copy } = useClipboard({ legacy: true })
const overlays = useOverlaysStore()
const scroller = useTemplateRef('scroller')
// No remote images in model responses: rendering a reply must not send additional requests.
const rendered = computed(() =>
  props.entries.map((item, index) => ({
    ...item,
    key: `${index}-${item.role}`,
    html:
      item.role === 'assistant'
        ? renderMarkdown(item.text).replace(/<img\b[^>]*>/gi, '')
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
const speakers: Record<AgentEntry['role'], string> = {
  user: '你',
  assistant: 'MiraiNote AI',
  tool: '文档工具',
  error: '未完成',
}
watch(
  () => [props.entries.length, props.running],
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
    <template v-if="!hasRun && !entries.length"
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
        总结重点、整理想法，或让表达更进一步。发送时会附带当前文档，也可以上传文件一起分析。
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
        v-for="entry in rendered"
        :key="entry.key"
        class="min-w-0 text-xs leading-6"
      >
        <div
          class="text-muted mb-2 flex items-center justify-between text-[10px]"
        >
          <span>{{ speakers[entry.role] }}</span
          ><IconButton
            v-if="entry.role === 'assistant'"
            icon="lucide:copy"
            label="复制回答"
            @click="copyMessage(entry.text)"
          />
        </div>
        <p
          v-if="entry.role === 'user'"
          class="bg-hover/70 rounded-lg px-3 py-2.5 wrap-anywhere whitespace-pre-wrap"
        >
          {{ entry.text }}
        </p>
        <!-- Tool rounds stay collapsed so the transcript reads as a conversation. -->
        <details
          v-else-if="entry.role !== 'assistant'"
          class="border-line rounded-md border px-2.5 py-2"
          :class="entry.role === 'error' && 'border-danger/40'"
        >
          <summary
            class="flex cursor-pointer items-center gap-1.5 text-[11px]"
            :class="entry.role === 'error' ? 'text-danger' : 'text-secondary'"
          >
            <AppIcon
              :name="
                entry.role === 'error' ? 'lucide:circle-alert' : 'lucide:wrench'
              "
              class="shrink-0"
            /><span class="min-w-0 flex-1 truncate">{{ entry.text }}</span>
          </summary>
          <pre
            v-if="entry.detail"
            class="text-muted mt-2 max-h-52 overflow-auto text-[10px] leading-5 whitespace-pre-wrap"
            >{{ entry.detail }}</pre>
        </details>
        <div
          v-else
          class="[&_a]:text-accent [&_pre]:bg-hover [&_td]:border-line [&_th]:border-line space-y-3 wrap-anywhere [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_h1]:text-base [&_h2]:text-sm [&_h3]:font-semibold [&_li]:ml-4 [&_ol]:list-decimal [&_p]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:p-3 [&_table]:block [&_table]:overflow-x-auto [&_td]:border [&_td]:p-2 [&_th]:border [&_th]:p-2 [&_ul]:list-disc"
          v-html="entry.html"
        />
        <ul
          v-if="entry.attachments?.length"
          class="mt-2 flex flex-wrap gap-1.5"
          aria-label="已发送附件"
        >
          <li
            v-for="file in entry.attachments"
            :key="file.name"
            class="border-line text-muted flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px]"
          >
            <AppIcon name="lucide:file-text" /><span
              class="max-w-35 truncate"
              :title="file.name"
              >{{ file.name }}</span
            ><span>{{ formatAttachmentSize(file.size) }}</span>
          </li>
        </ul>
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
