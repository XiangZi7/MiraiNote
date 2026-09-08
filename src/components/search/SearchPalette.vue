<script setup lang="ts">
import { computed, nextTick, reactive, toRefs, useTemplateRef, watch } from 'vue'
import { useOverlaysStore } from '@/stores/overlays'
import { useDocumentsStore } from '@/stores/documents'
import { useWorkspaceStore } from '@/stores/workspace'
import { useCommands } from '@/composables/useCommands'
import { useFocusTrap } from '@/composables/useFocusTrap'
import { documentTypes } from '@/utils/documents'
import { AppIcon } from '@/components/ui'

const overlays = useOverlaysStore(), documents = useDocumentsStore(), workspace = useWorkspaceStore()
const commands = useCommands()
const dialog = useTemplateRef('dialog')
useFocusTrap(dialog)
// 响应式状态
const state = reactive({
  // 搜索文本
  query: '',
  // 键盘选中的结果
  selected: 0,
})
const { query, selected } = toRefs(state)
const commandMode = computed(() => overlays.state.palette === 'commands')
const results = computed(() => {
  const query = state.query.trim().toLowerCase()
  if (commandMode.value) return commands.filter(item => item.label.toLowerCase().includes(query)).map(item => ({ ...item, detail: '工作区命令' }))
  return documents.filtered('recent').filter(doc => `${doc.name} ${doc.text} ${doc.tags.join(' ')}`.toLowerCase().includes(query)).map(doc => ({ label: doc.name, icon: documentTypes[doc.kind].icon, shortcut: '', detail: doc.path, action: () => workspace.open(doc.id) }))
})
watch(() => state.query, () => { state.selected = 0 })
watch(commandMode, () => { state.query = ''; state.selected = 0 })
async function select(index: number) { const result = results.value[index]; if (!result) return; overlays.state.palette = null; try { await result.action() } catch (error) { overlays.toast(error instanceof Error ? error.message : '操作失败', true) } }
async function keyboard(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); if (!results.value.length) return; state.selected = (state.selected + (event.key === 'ArrowDown' ? 1 : -1) + results.value.length) % results.value.length; await nextTick(); dialog.value?.querySelector(`[data-result="${state.selected}"]`)?.scrollIntoView({ block: 'nearest' }) }
  if (event.key === 'Enter') { event.preventDefault(); void select(state.selected) }
}
</script>

<template>
  <Teleport to="body"><div class="fixed inset-0 z-60 flex items-start justify-center bg-[#182130]/15 px-6 pt-[16vh] backdrop-blur-[3px]" @pointerdown.self="overlays.state.palette = null" @keydown.esc.stop="overlays.state.palette = null"><section ref="dialog" role="dialog" aria-modal="true" :aria-label="commandMode ? '命令面板' : '搜索文档'" class="w-[600px] max-w-full overflow-hidden rounded-xl border border-line bg-elevated shadow-floating" @keydown="keyboard"><div class="flex items-center gap-3 border-b border-line px-5 py-[18px]"><AppIcon :name="commandMode ? 'lucide:terminal' : 'lucide:search'" :size="20" class="text-muted" /><input v-model="query" autofocus class="min-w-0 flex-1 border-0 bg-transparent text-[15px] outline-none placeholder:text-muted" :placeholder="commandMode ? '输入命令…' : '搜索文档、内容或标签…'" :aria-label="commandMode ? '搜索命令' : '搜索所有文档'" role="combobox" aria-autocomplete="list" aria-controls="palette-results" :aria-expanded="true" :aria-activedescendant="results.length ? `result-${selected}` : undefined" /><kbd class="rounded border border-line px-1.5 py-0.5">Esc</kbd></div><div class="px-5 pt-4 pb-2 text-[11px] text-muted">{{ commandMode ? '工作区命令' : query ? `${results.length} 份匹配文档` : '最近打开' }}</div><div id="palette-results" role="listbox" class="max-h-[350px] overflow-auto px-2 pb-2"><button v-for="(result, index) in results" :id="`result-${index}`" :key="result.label" :data-result="index" role="option" :aria-selected="selected === index" tabindex="-1" class="flex w-full items-center gap-3 rounded-md px-3 py-3 text-left transition-colors duration-150" :class="selected === index ? 'bg-hover' : 'hover:bg-canvas'" @pointermove="selected = index" @click="select(index)"><AppIcon :name="result.icon ?? 'lucide:terminal'" :size="18" class="text-secondary" /><span class="min-w-0 flex-1"><span class="block truncate text-[13px]">{{ result.label }}</span><span v-if="!commandMode" class="mt-0.5 block truncate text-[11px] text-muted">{{ result.detail }}</span></span><kbd>{{ result.shortcut }}</kbd><AppIcon v-if="selected === index" name="lucide:corner-down-left" :size="14" class="text-muted" /></button><div v-if="!results.length" class="px-5 py-12 text-center text-xs text-muted">没有匹配结果，试试其他关键词。</div></div><div class="flex items-center gap-4 border-t border-line px-5 py-2.5 text-[11px] text-muted"><span><kbd>↑ ↓</kbd> 选择</span><span><kbd>↵</kbd> {{ commandMode ? '执行' : '打开' }}</span><span class="ml-auto">{{ commandMode ? 'MiraiHub Docs' : '搜索此工作区的文档' }}</span></div></section></div></Teleport>
</template>
