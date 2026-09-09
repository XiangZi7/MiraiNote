<script setup lang="ts">
import { reactive, useId, useTemplateRef } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'

export interface OutlineEntry {
  id: string
  title: string
  level: number
  disabled?: boolean
}
withDefaults(defineProps<{ items: OutlineEntry[]; emptyText?: string }>(), {
  emptyText: '这份文档没有标题目录',
})
const emit = defineEmits<{ select: [id: string] }>()
const state = reactive({ open: false })
const panelId = useId()
const toggle = useTemplateRef('toggle')
function close() {
  state.open = false
  toggle.value?.focus()
}
function select(id: string) {
  emit('select', id)
  close()
}
</script>

<template>
  <div
    class="document-outline absolute top-3 right-3 z-10 flex max-h-[calc(100%-1.5rem)] max-w-[calc(100%-1.5rem)] flex-col items-end"
    @keydown.esc.stop="close"
  >
    <button
      ref="toggle"
      class="border-line bg-surface text-secondary hover:text-primary flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-xs shadow-sm"
      :aria-expanded="state.open"
      :aria-controls="panelId"
      aria-label="文档目录"
      @click="state.open = !state.open"
    >
      <AppIcon
        name="lucide:list-tree"
        :size="15"
      />目录
    </button>
    <nav
      v-if="state.open"
      :id="panelId"
      aria-label="文档标题目录"
      class="border-line bg-surface mt-2 min-h-0 w-60 max-w-full overflow-y-auto rounded-lg border p-2 shadow-lg"
    >
      <button
        v-for="item in items"
        :key="item.id"
        :disabled="item.disabled"
        :title="item.title"
        class="text-secondary enabled:hover:bg-hover enabled:hover:text-primary block w-full rounded-md py-2 pr-2 text-left text-xs leading-5 break-words disabled:opacity-50"
        :style="{
          paddingLeft: `${8 + Math.min(Math.max(item.level - 1, 0), 5) * 12}px`,
        }"
        @click="select(item.id)"
      >
        {{ item.title }}
      </button>
      <p
        v-if="!items.length"
        class="text-muted px-2 py-3 text-xs"
      >
        {{ emptyText }}
      </p>
    </nav>
  </div>
</template>
