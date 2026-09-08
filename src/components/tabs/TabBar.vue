<script setup lang="ts">
import { shallowRef } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useDocumentsStore } from '@/stores/documents'
import { useOverlaysStore } from '@/stores/overlays'
import { useDocumentActions } from '@/composables/useDocumentActions'
import { documentTypes } from '@/utils/documents'
import AppIcon from '@/components/ui/AppIcon.vue'
import IconButton from '@/components/ui/IconButton.vue'
import type { PaneNode } from '@/types/workspace'
import type { DocumentTab } from '@/types/document'

const props = defineProps<{ pane: PaneNode }>()
const workspace = useWorkspaceStore()
const documents = useDocumentsStore()
const overlays = useOverlaysStore()
const actions = useDocumentActions()
const dropIndex = shallowRef<number | null>(null)
function start(event: DragEvent, tab: DocumentTab) {
  if (!event.dataTransfer) return
  workspace.drag = { paneId: props.pane.id, tabId: tab.id }
  event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-mirai-tab', tab.id)
}
function over(event: DragEvent, index: number) {
  if (!workspace.drag) return
  event.preventDefault(); event.stopPropagation()
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  dropIndex.value = index + (event.clientX > rect.x + rect.width / 2 ? 1 : 0)
}
function drop(event: DragEvent) {
  if (!workspace.drag) return
  event.preventDefault(); event.stopPropagation()
  workspace.moveTab(workspace.drag.paneId, workspace.drag.tabId, props.pane.id, dropIndex.value ?? props.pane.tabs.length)
  dropIndex.value = null
}
function menu(event: MouseEvent, tab: DocumentTab) {
  const pane = props.pane
  overlays.menu(event, [
    { label: '关闭', icon: 'lucide:x', shortcut: 'Ctrl W', action: () => workspace.close(pane.id, tab.id) },
    { label: '关闭其他标签页', action: () => { for (const item of [...pane.tabs]) if (item.id !== tab.id && !item.pinned) workspace.close(pane.id, item.id) } },
    { label: '关闭右侧标签页', action: () => { for (const item of pane.tabs.slice(pane.tabs.findIndex(item => item.id === tab.id) + 1)) if (!item.pinned) workspace.close(pane.id, item.id) } },
    { label: '关闭全部标签页', action: () => { for (const item of [...pane.tabs]) if (!item.pinned) workspace.close(pane.id, item.id) } },
    { label: tab.pinned ? '取消固定' : '固定标签页', icon: 'lucide:pin', divider: true, action: () => workspace.togglePin(pane.id, tab.id) },
    { label: '在右侧分屏', icon: 'lucide:columns-2', action: () => workspace.splitTab(pane.id, tab.id, pane.id, 'right', pane.tabs.length === 1) },
    { label: '在下方分屏', icon: 'lucide:rows-2', action: () => workspace.splitTab(pane.id, tab.id, pane.id, 'bottom', pane.tabs.length === 1) },
    { label: '恢复关闭的标签页', icon: 'lucide:rotate-ccw', shortcut: 'Ctrl ⇧ T', divider: true, disabled: !workspace.closedTabs.length, action: workspace.restore },
  ])
}
</script>

<template>
  <div class="tab-bar flex h-9 shrink-0 select-none items-center gap-[3px] border-b border-line bg-canvas px-2" @dragover.prevent @drop="drop" @dragleave="dropIndex = null">
    <div class="tab-list flex h-full max-w-[calc(100%-32px)] overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="文档标签页">
      <div v-for="(tab, index) in pane.tabs" :key="tab.id" class="tab group relative flex h-full min-w-[100px] max-w-[210px] cursor-default items-center gap-2 border-r border-transparent px-2.5 text-xs text-muted hover:bg-hover [&.active]:bg-surface [&.active]:text-primary [&.drop-before]:before:absolute [&.drop-before]:before:inset-y-[5px] [&.drop-before]:before:left-0 [&.drop-before]:before:w-0.5 [&.drop-before]:before:bg-accent [&.drop-after]:after:absolute [&.drop-after]:after:inset-y-[5px] [&.drop-after]:after:right-0 [&.drop-after]:after:w-0.5 [&.drop-after]:after:bg-accent" :class="{ active: pane.activeTabId === tab.id, 'drop-before': dropIndex === index, 'drop-after': dropIndex === pane.tabs.length && index === pane.tabs.length - 1 }" role="tab" :aria-selected="pane.activeTabId === tab.id" :tabindex="pane.activeTabId === tab.id ? 0 : -1" draggable="true" :title="documents.get(tab.documentId)?.path" @click="workspace.activate(pane.id, tab.id)" @keydown.enter="workspace.activate(pane.id, tab.id)" @keydown.left.prevent="workspace.cycle(true)" @keydown.right.prevent="workspace.cycle()" @auxclick.middle.prevent="workspace.close(pane.id, tab.id)" @contextmenu.prevent.stop="menu($event, tab)" @dragstart="start($event, tab)" @dragend="workspace.drag = null; dropIndex = null" @dragover="over($event, index)">
        <AppIcon :name="documentTypes[documents.get(tab.documentId)?.kind ?? 'markdown'].icon" :size="14" />
        <span class="tab-name truncate">{{ documents.get(tab.documentId)?.name }}</span>
        <AppIcon v-if="tab.pinned" name="lucide:pin" :size="11" class="pin" />
        <button v-else class="tab-close grid size-[18px] shrink-0 place-items-center rounded opacity-0 hover:bg-hover group-hover:opacity-100 group-focus-within:opacity-100 group-[.active]:opacity-100 [&.dirty]:before:size-[5px] [&.dirty]:before:rounded-full [&.dirty]:before:bg-muted [&.dirty>svg]:hidden [&.dirty:hover]:before:hidden [&.dirty:hover>svg]:block" :class="{ dirty: documents.get(tab.documentId)?.dirty }" :aria-label="`关闭 ${documents.get(tab.documentId)?.name}`" @click.stop="workspace.close(pane.id, tab.id)"><AppIcon name="lucide:x" :size="12" /></button>
      </div>
    </div>
    <IconButton icon="lucide:plus" label="新建 Markdown" @click="workspace.activate(pane.id); actions.create()" />
    <span class="tab-space h-full flex-1" data-tauri-drag-region />
  </div>
</template>

