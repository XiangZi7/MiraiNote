<script setup lang="ts">
import { AppButton } from '@/components/ui'
import { computed } from 'vue'
import { RouterView, useRouter, type RouteLocationNormalized } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { useDocumentsStore } from '@/stores/documents'
import { useDocumentActions } from '@/composables/useDocumentActions'
import TabBar from '@/components/tabs/TabBar.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import type { PaneNode } from '@/types/workspace'

const props = defineProps<{ pane: PaneNode }>()
const workspace = useWorkspaceStore()
const documents = useDocumentsStore()
const actions = useDocumentActions()
const router = useRouter()
const tab = computed(() =>
  props.pane.tabs.find(item => item.id === props.pane.activeTabId)
)
const doc = computed(() => documents.get(tab.value?.documentId))
const documentRoute = computed<RouteLocationNormalized>(() => {
  const route = router.resolve(tab.value ? {
    name: 'document',
    params: { paneId: props.pane.id, tabId: tab.value.id },
  } : { name: 'workspace' })
  return { ...route, name: route.name ?? undefined }
})
const dropEdge = computed(() =>
  workspace.dropTarget?.paneId === props.pane.id &&
  'edge' in workspace.dropTarget
    ? workspace.dropTarget.edge
    : null
)
</script>

<template>
  <section
    class="document-pane bg-surface isolate flex size-full min-h-0 min-w-0 flex-col"
    :class="{ focused: workspace.activePaneId === pane.id }"
    aria-label="文档面板"
    :data-pane-id="pane.id"
    @pointerdown.capture="workspace.activePaneId = pane.id"
  >
    <TabBar :pane="pane" />
    <div class="pane-content relative min-h-0 flex-1">
      <RouterView :route="documentRoute" v-slot="{ Component, route }">
        <KeepAlive :max="6" include="DocumentPage">
          <component :is="Component" v-if="doc && tab" :key="route.params.tabId as string" />
        </KeepAlive>
      </RouterView>
      <div
        v-if="!doc || !tab"
        class="empty-pane text-muted [&>svg]:text-faint [&>h2]:text-secondary flex h-full flex-col items-center justify-center [&>h2]:mb-2 [&>h2]:text-[19px] [&>h2]:font-medium [&>svg]:mb-[22px]"
      >
        <AppIcon
          name="lucide:files"
          :size="38"
        />
        <h2>让思考，在这里展开</h2>
        <p>打开一份文档，开始阅读与创作。</p>
        <div class="mt-6 flex gap-3">
          <AppButton @click="actions.create">新建 Markdown</AppButton
          ><AppButton @click="workspace.library = 'all'">浏览文档</AppButton>
        </div>
        <span class="text-muted mt-6 text-xs"
          >Ctrl O 打开文档 · Ctrl K 快速搜索</span
        >
      </div>
      <div
        v-if="dropEdge && workspace.drag"
        class="drop-zone border-accent bg-accent/15 [&>span]:bg-elevated [&>span]:text-accent [&>span]:shadow-floating pointer-events-none absolute inset-[5px] z-15 grid place-items-center rounded-md border [&.bottom]:top-1/2 [&.left]:right-1/2 [&.right]:left-1/2 [&.top]:bottom-1/2 [&>span]:rounded-md [&>span]:px-3 [&>span]:py-1.5"
        :class="dropEdge"
      >
        <span>{{
          dropEdge === 'center' ? '移动到此面板' : '松开以分屏打开'
        }}</span>
      </div>
    </div>
  </section>
</template>
