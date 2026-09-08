<script setup lang="ts">
import { AppToolbar, ToolbarSeparator, SegmentedControl } from '@/components/ui'
import IconButton from '@/components/ui/IconButton.vue'
defineProps<{ editing: boolean; zoom: number }>()
const emit = defineEmits<{
  editing: [value: boolean]
  zoom: [value: number]
  format: [command: string, value?: string]
  find: []
  save: []
}>()
</script>

<template>
  <AppToolbar label="Word 工具栏">
    <SegmentedControl
      :model-value="editing ? 'edit' : 'read'"
      :options="[
        { label: '阅读', value: 'read' },
        { label: '编辑', value: 'edit' },
      ]"
      label="Word 模式"
      @update:model-value="emit('editing', $event === 'edit')"
    />
    <ToolbarSeparator />
    <select
      aria-label="段落样式"
      class="word-select text-secondary max-w-[72px] border-0 bg-transparent text-xs outline-none"
      @change="
        emit(
          'format',
          'formatBlock',
          ($event.target as HTMLSelectElement).value
        )
      "
    >
      <option value="p">正文</option>
      <option value="h1">标题 1</option>
      <option value="h2">标题 2</option>
      <option value="h3">标题 3</option>
    </select>
    <IconButton
      icon="lucide:bold"
      label="粗体"
      @mousedown.prevent
      @click="emit('format', 'bold')"
    /><IconButton
      icon="lucide:italic"
      label="斜体"
      @mousedown.prevent
      @click="emit('format', 'italic')"
    /><IconButton
      icon="lucide:underline"
      label="下划线"
      @mousedown.prevent
      @click="emit('format', 'underline')"
    />
    <ToolbarSeparator /><IconButton
      icon="lucide:list"
      label="无序列表"
      @mousedown.prevent
      @click="emit('format', 'insertUnorderedList')"
    /><IconButton
      icon="lucide:list-ordered"
      label="有序列表"
      @mousedown.prevent
      @click="emit('format', 'insertOrderedList')"
    /><IconButton
      icon="lucide:table-2"
      label="插入表格"
      @mousedown.prevent
      @click="emit('format', 'insertTable')"
    /><IconButton
      icon="lucide:remove-formatting"
      label="清除格式"
      @mousedown.prevent
      @click="emit('format', 'clearFormat')"
    />
    <ToolbarSeparator /><IconButton
      icon="lucide:undo-2"
      label="撤销"
      @mousedown.prevent
      @click="emit('format', 'undo')"
    /><IconButton
      icon="lucide:redo-2"
      label="重做"
      @mousedown.prevent
      @click="emit('format', 'redo')"
    />
    <span class="flex-1" /><button
      class="zoom text-secondary min-w-[43px] text-xs"
      title="切换缩放比例"
      @click="emit('zoom', zoom === 100 ? 125 : zoom === 125 ? 75 : 100)"
    >
      {{ zoom }}%</button
    ><IconButton
      icon="lucide:search"
      label="查找 Word 内容 (Ctrl+F)"
      @click="emit('find')"
    /><IconButton
      icon="lucide:save"
      label="保存工作区草稿"
      @click="emit('save')"
    />
  </AppToolbar>
</template>
