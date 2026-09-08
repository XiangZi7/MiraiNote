<script setup lang="ts">
import { defineAsyncComponent, shallowRef } from 'vue'
import { useSettingsStore } from '@/stores/settings'
import { useWorkspaceStore } from '@/stores/workspace'
import { useOverlaysStore } from '@/stores/overlays'
import { useWorkspaceLifecycle } from '@/composables/useWorkspaceLifecycle'
import { useDocumentActions } from '@/composables/useDocumentActions'
import { AppIcon, ResizeHandle } from '@/components/ui'
import ContextMenu from '@/components/ui/ContextMenu.vue'
import ToastHost from '@/components/ui/ToastHost.vue'
import AppHeader from './AppHeader.vue'
import Sidebar from './Sidebar.vue'
import Inspector from './Inspector.vue'
import WorkspaceNode from '@/components/workspace/WorkspaceNode.vue'
import DocumentLibrary from '@/components/workspace/DocumentLibrary.vue'
const SearchPalette = defineAsyncComponent(() => import('@/components/search/SearchPalette.vue'))
const SettingsDialog = defineAsyncComponent(() => import('./SettingsDialog.vue'))
const HelpDialog = defineAsyncComponent(() => import('./HelpDialog.vue'))
const PromptDialog = defineAsyncComponent(() => import('./PromptDialog.vue'))
const AiPanel = defineAsyncComponent(() => import('@/modules/ai/components/AiPanel.vue'))
const settings = useSettingsStore(), workspace = useWorkspaceStore(), overlays = useOverlaysStore()
const actions = useDocumentActions()
const draggingFiles = shallowRef(false)
useWorkspaceLifecycle()
function dragOver(event: DragEvent) { if (event.dataTransfer?.types.includes('Files')) { event.preventDefault(); draggingFiles.value = true } }
async function drop(event: DragEvent) { draggingFiles.value = false; if (event.dataTransfer?.files.length) { event.preventDefault(); await actions.importFiles(Array.from(event.dataTransfer.files)) } }
function context(event: MouseEvent) {
  if ((event.target as HTMLElement).closest('.cm-editor, [contenteditable="true"], input, textarea')) {
    overlays.menu(event, [{ label: '文档内查找', icon: 'lucide:search', shortcut: 'Ctrl F', action: () => { window.dispatchEvent(new CustomEvent('mirai:find')) } }, { label: '保存工作区草稿', icon: 'lucide:save', shortcut: 'Ctrl S', action: actions.save }])
  } else if (workspace.currentDocument) overlays.menu(event, actions.documentMenu(workspace.currentDocument))
}
</script>

<template>
  <div class="flex size-full min-w-[680px] flex-col overflow-hidden bg-canvas" @contextmenu.prevent="context" @dragover="dragOver" @drop="drop" @dragleave.self="draggingFiles = false">
    <AppHeader /><div class="flex min-h-0 flex-1"><Sidebar /><ResizeHandle v-if="!settings.settings.sidebarCollapsed" v-model="settings.settings.sidebarWidth" :min="180" :max="420" label="调整侧栏宽度" /><main class="min-h-0 min-w-0 flex-1"><DocumentLibrary v-if="workspace.library" :key="workspace.library" /><WorkspaceNode v-else :node="workspace.root" /></main><template v-if="overlays.state.inspector"><ResizeHandle v-model="settings.settings.inspectorWidth" :min="220" :max="420" reverse label="调整文件信息面板宽度" /><Inspector /></template><template v-if="overlays.state.ai"><ResizeHandle v-model="settings.settings.aiWidth" :min="280" :max="480" reverse label="调整 AI 助手宽度" /><AiPanel /></template></div>
    <Transition name="fade"><SearchPalette v-if="overlays.state.palette" /></Transition><Transition name="fade"><SettingsDialog v-if="overlays.state.settings" /></Transition><Transition name="fade"><HelpDialog v-if="overlays.state.help" /></Transition><PromptDialog v-if="overlays.state.prompt" /><ContextMenu v-if="overlays.state.menu" :key="`${overlays.state.menu.x}-${overlays.state.menu.y}`" v-bind="overlays.state.menu" @close="overlays.state.menu = null" @error="overlays.toast($event instanceof Error ? $event.message : '操作失败', true)" /><ToastHost />
    <div v-if="draggingFiles" class="pointer-events-none fixed inset-2 z-50 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-accent bg-surface/90 text-accent"><AppIcon name="lucide:files" :size="36" /><span class="text-base font-medium">松开以导入文档</span><span class="text-xs text-muted">Markdown · PDF · Word，可一次拖入多个文件</span></div>
  </div>
</template>
