<script setup lang="ts">
import { AppButton } from "@/components/ui"
import { computed, defineAsyncComponent, shallowRef } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useDocumentsStore } from '@/stores/documents'
import { useDocumentActions } from '@/composables/useDocumentActions'
import TabBar from '@/components/tabs/TabBar.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import type { DropEdge, PaneNode } from '@/types/workspace'
import type { DocumentKind } from '@/types/document'

const props = defineProps<{ pane: PaneNode }>()
const workspace = useWorkspaceStore()
const documents = useDocumentsStore()
const actions = useDocumentActions()
const tab = computed(() => props.pane.tabs.find(item => item.id === props.pane.activeTabId))
const doc = computed(() => documents.get(tab.value?.documentId))
const renderers = {
  markdown: defineAsyncComponent(() => import('@/modules/markdown/components/MarkdownView.vue')),
  pdf: defineAsyncComponent(() => import('@/modules/pdf/components/PdfView.vue')),
  word: defineAsyncComponent(() => import('@/modules/word/components/WordView.vue')),
} satisfies Record<DocumentKind, unknown>
const edge = shallowRef<DropEdge | null>(null)
function dragOver(event: DragEvent) {
  if (!workspace.drag) return
  event.preventDefault()
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const x = (event.clientX - rect.left) / rect.width
  const y = (event.clientY - rect.top) / rect.height
  edge.value = x < .22 ? 'left' : x > .78 ? 'right' : y < .22 ? 'top' : y > .78 ? 'bottom' : 'center'
}
function drop(event: DragEvent) {
  if (!workspace.drag) return
  event.preventDefault(); event.stopPropagation()
  workspace.splitTab(workspace.drag.paneId, workspace.drag.tabId, props.pane.id, edge.value ?? 'center')
  edge.value = null
}
</script>

<template>
  <section class="document-pane flex size-full min-h-0 min-w-0 flex-col bg-surface" :class="{ focused: workspace.activePaneId === pane.id }" aria-label="文档面板" @pointerdown.capture="workspace.activePaneId = pane.id">
    <TabBar :pane="pane" />
    <div class="pane-content relative min-h-0 flex-1" @dragover="dragOver" @drop="drop" @dragleave.self="edge = null">
      <component :is="renderers[doc.kind]" v-if="doc && tab" :key="`${tab.id}:${doc.kind}`" :document="doc" :tab="tab" />
      <div v-else class="empty-pane flex h-full flex-col items-center justify-center text-muted [&>svg]:mb-[22px] [&>svg]:text-faint [&>h2]:mb-2 [&>h2]:text-[19px] [&>h2]:font-medium [&>h2]:text-secondary">
        <AppIcon name="lucide:files" :size="38" />
        <h2>让思考，在这里展开</h2>
        <p>打开一份文档，开始阅读与创作。</p>
        <div class="flex gap-3 mt-6"><AppButton @click="actions.create">新建 Markdown</AppButton><AppButton @click="workspace.library = 'all'">浏览文档</AppButton></div>
        <span class="mt-6 text-muted text-xs">Ctrl O 打开文档 · Ctrl K 快速搜索</span>
      </div>
      <div v-if="edge && workspace.drag" class="drop-zone pointer-events-none absolute inset-[5px] z-15 grid place-items-center rounded-md border border-accent bg-accent/15 [&.left]:right-1/2 [&.right]:left-1/2 [&.top]:bottom-1/2 [&.bottom]:top-1/2 [&>span]:rounded-md [&>span]:bg-elevated [&>span]:px-3 [&>span]:py-1.5 [&>span]:text-accent [&>span]:shadow-floating" :class="edge"><span>{{ edge === 'center' ? '移动到此面板' : '松开以分屏打开' }}</span></div>
    </div>
  </section>
</template>

