<script setup lang="ts">
import { computed, defineAsyncComponent } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useDocumentsStore } from '@/stores/documents'
import type { DocumentKind } from '@/types/document'

defineOptions({ name: 'DocumentPage' })
const props = defineProps<{ paneId: string; tabId: string }>()
const workspace = useWorkspaceStore()
const documents = useDocumentsStore()
// Params belong to this cached instance, not to whichever tab is now active.
const tab = computed(() => workspace.panes.find(pane => pane.id === props.paneId)?.tabs.find(tab => tab.id === props.tabId))
const doc = computed(() => documents.get(tab.value?.documentId))
const renderers = {
  markdown: defineAsyncComponent(() => import('@/modules/markdown/components/MarkdownView.vue')),
  pdf: defineAsyncComponent(() => import('@/modules/pdf/components/PdfView.vue')),
  word: defineAsyncComponent(() => import('@/modules/word/components/WordView.vue')),
} satisfies Record<DocumentKind, unknown>
</script>

<template>
  <div class="size-full min-h-0 min-w-0" :data-document-tab="tabId">
    <component v-if="doc && tab" :is="renderers[doc.kind]" :key="doc.kind" :document="doc" :tab="tab" />
  </div>
</template>
