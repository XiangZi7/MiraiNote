<script setup lang="ts">
import { defineAsyncComponent, shallowRef } from 'vue'
import { RouterView } from 'vue-router'
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
import { isSupportedName } from '@/utils/documents'
const SearchPalette = defineAsyncComponent(
  () => import('@/components/search/SearchPalette.vue')
)
const SettingsDialog = defineAsyncComponent(
  () => import('./SettingsDialog.vue')
)
const HelpDialog = defineAsyncComponent(() => import('./HelpDialog.vue'))
const PromptDialog = defineAsyncComponent(() => import('./PromptDialog.vue'))
const AiPanel = defineAsyncComponent(
  () => import('@/modules/ai/components/AiPanel.vue')
)
const settings = useSettingsStore(),
  workspace = useWorkspaceStore(),
  overlays = useOverlaysStore()
const actions = useDocumentActions()
const { fileInput } = actions
const draggingFiles = shallowRef(false)
useWorkspaceLifecycle()
function dragOver(event: DragEvent) {
  if (event.dataTransfer?.types.includes('Files')) {
    event.preventDefault()
    draggingFiles.value = true
  }
}
/** 递归展开拖入的文件夹；深度与文件类型限制和后端扫描保持一致。 */
async function collect(entry: FileSystemEntry, out: File[], depth = 0) {
  if (entry.isFile) {
    const file = await new Promise<File | null>(resolve =>
      (entry as FileSystemFileEntry).file(
        result => resolve(result),
        () => resolve(null)
      )
    )
    if (!file || !isSupportedName(file.name)) return
    // 保留相对路径，导入后工作区里仍能看出文件夹层级。
    Object.defineProperty(file, 'webkitRelativePath', {
      value: entry.fullPath.replace(/^\//, ''),
    })
    out.push(file)
    return
  }
  if (depth >= 8) return
  const reader = (entry as FileSystemDirectoryEntry).createReader()
  for (;;) {
    const batch = await new Promise<FileSystemEntry[]>(resolve =>
      reader.readEntries(
        result => resolve(result),
        () => resolve([])
      )
    )
    if (!batch.length) return
    for (const child of batch) await collect(child, out, depth + 1)
  }
}
async function drop(event: DragEvent) {
  draggingFiles.value = false
  const transfer = event.dataTransfer
  if (!transfer?.items.length && !transfer?.files.length) return
  event.preventDefault()
  // webkitGetAsEntry 必须在 await 之前同步取出。
  const entries = Array.from(transfer.items)
    .map(item => item.webkitGetAsEntry?.() ?? null)
    .filter((entry): entry is FileSystemEntry => !!entry)
  if (entries.some(entry => entry.isDirectory)) {
    const files: File[] = []
    overlays.progress('正在读取拖入的文件夹…')
    try {
      for (const entry of entries) await collect(entry, files)
    } finally {
      overlays.progress(null)
    }
    await actions.importFiles(files, true)
    return
  }
  if (transfer.files.length)
    await actions.importFiles(Array.from(transfer.files))
}
function context(event: MouseEvent) {
  if (
    (event.target as HTMLElement).closest(
      '.cm-editor, [contenteditable="true"], input, textarea'
    )
  ) {
    overlays.menu(event, [
      {
        label: '文档内查找',
        icon: 'lucide:search',
        shortcut: 'Ctrl F',
        action: () => {
          window.dispatchEvent(new CustomEvent('mirai:find'))
        },
      },
      {
        label: '保存工作区草稿',
        icon: 'lucide:save',
        shortcut: 'Ctrl S',
        action: actions.save,
      },
    ])
  } else if (workspace.currentDocument)
    overlays.menu(event, actions.documentMenu(workspace.currentDocument))
}
</script>

<template>
  <div
    class="bg-canvas flex size-full min-w-[680px] flex-col overflow-hidden"
    @contextmenu.prevent="context"
    @dragover="dragOver"
    @drop="drop"
    @dragleave.self="draggingFiles = false"
  >
    <input
      ref="fileInput"
      type="file"
      hidden
      aria-label="导入本地文档"
    />
    <AppHeader />
    <div class="flex min-h-0 flex-1">
      <Sidebar /><ResizeHandle
        v-if="!settings.settings.sidebarCollapsed"
        v-model="settings.settings.sidebarWidth"
        :min="180"
        :max="420"
        label="调整侧栏宽度"
      />
      <main class="min-h-0 min-w-0 flex-1">
        <RouterView v-slot="{ Component, route }">
          <KeepAlive :max="1" include="WorkspacePage">
            <component v-if="route.meta.cacheKey === 'workspace'" :is="Component" key="workspace" />
          </KeepAlive>
          <KeepAlive :max="12" include="DocumentLibraryPage,FolderLibraryPage">
            <component v-if="route.meta.cacheKey !== 'workspace'" :is="Component" :key="route.path" />
          </KeepAlive>
        </RouterView>
      </main>
      <template v-if="overlays.state.inspector"
        ><ResizeHandle
          v-model="settings.settings.inspectorWidth"
          :min="220"
          :max="420"
          reverse
          label="调整文件信息面板宽度" /><Inspector /></template
      ><template v-if="overlays.state.ai"
        ><ResizeHandle
          v-model="settings.settings.aiWidth"
          :min="280"
          :max="480"
          reverse
          label="调整 AI 助手宽度" /><AiPanel
      /></template>
    </div>
    <Transition name="fade"
      ><SearchPalette v-if="overlays.state.palette" /></Transition
    ><Transition name="fade"
      ><SettingsDialog v-if="overlays.state.settings" /></Transition
    ><Transition name="fade"
      ><HelpDialog v-if="overlays.state.help" /></Transition
    ><PromptDialog v-if="overlays.state.prompt" /><ContextMenu
      v-if="overlays.state.menu"
      :key="`${overlays.state.menu.x}-${overlays.state.menu.y}`"
      v-bind="overlays.state.menu"
      @close="overlays.state.menu = null"
      @error="
        overlays.toast(
          $event instanceof Error ? $event.message : '操作失败',
          true
        )
      "
    /><ToastHost />
    <div
      v-if="draggingFiles"
      class="border-accent bg-surface/90 text-accent pointer-events-none fixed inset-2 z-50 flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed"
    >
      <AppIcon
        name="lucide:files"
        :size="36"
      /><span class="text-base font-medium">松开以导入文档</span
      ><span class="text-muted text-xs"
        >Markdown · PDF · Word，可一次拖入多个文件或整个文件夹</span
      >
    </div>
  </div>
</template>
