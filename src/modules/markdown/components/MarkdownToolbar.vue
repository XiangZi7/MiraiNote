<script setup lang="ts">
import { AppToolbar, ToolbarSeparator, SegmentedControl } from "@/components/ui"
import IconButton from '@/components/ui/IconButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import { useOverlaysStore } from '@/stores/overlays'
import type { MarkdownMode } from '@/types/document'
import type { MarkdownAction } from '../types'
defineProps<{ mode: MarkdownMode }>()
const emit = defineEmits<{ mode: [mode: MarkdownMode]; action: [action: MarkdownAction] }>()
const overlays = useOverlaysStore()
const tools: { icon: string; label: string; action: MarkdownAction }[] = [
  { icon: 'lucide:bold', label: '粗体 (Ctrl+B)', action: 'bold' }, { icon: 'lucide:italic', label: '斜体 (Ctrl+I)', action: 'italic' },
  { icon: 'lucide:code-xml', label: '行内代码', action: 'code' }, { icon: 'lucide:quote', label: '引用', action: 'quote' },
  { icon: 'lucide:link', label: '链接', action: 'link' }, { icon: 'lucide:image', label: '图片', action: 'image' },
  { icon: 'lucide:table-2', label: '表格', action: 'table' }, { icon: 'lucide:list', label: '无序列表', action: 'bullet' },
  { icon: 'lucide:list-ordered', label: '有序列表', action: 'ordered' }, { icon: 'lucide:list-todo', label: '任务列表', action: 'task' },
]
function more(event: MouseEvent) {
  overlays.menu(event, [
    { label: '撤销', icon: 'lucide:undo-2', shortcut: 'Ctrl Z', action: () => emit('action', 'undo') },
    { label: '重做', icon: 'lucide:redo-2', shortcut: 'Ctrl ⇧ Z', action: () => emit('action', 'redo') },
    { label: '删除线', icon: 'lucide:strikethrough', divider: true, action: () => emit('action', 'strike') },
    { label: '代码块', icon: 'lucide:square-code', action: () => emit('action', 'codeblock') },
    { label: '在文档中查找', icon: 'lucide:search', shortcut: 'Ctrl F', divider: true, action: () => emit('action', 'find') },
  ])
}
function heading(event: MouseEvent) {
  overlays.menu(event, [1, 2, 3].map(level => ({ label: `标题 ${level}`, icon: 'lucide:heading', action: () => emit('action', `h${level}` as MarkdownAction) })))
}
</script>

<template>
  <AppToolbar label="Markdown 工具栏">
    <SegmentedControl :model-value="mode" :options="[{ label: '编辑', value: 'edit' }, { label: '阅读', value: 'preview' }, { label: '分屏', value: 'split' }]" label="Markdown 模式" @update:model-value="emit('mode', $event)" />
    <ToolbarSeparator />
    <button class="heading-button flex items-center gap-3 rounded px-[9px] py-1 text-xs whitespace-nowrap text-muted hover:bg-hover" title="设置标题" @click="heading">标题 <AppIcon name="lucide:chevron-down" :size="12" /></button>
    <IconButton v-for="tool in tools" :key="tool.action" :icon="tool.icon" :label="tool.label" @click="emit('action', tool.action)" />
    <ToolbarSeparator /><IconButton icon="lucide:ellipsis" label="更多编辑操作" @click="more" />
  </AppToolbar>
</template>

