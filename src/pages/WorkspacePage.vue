<script setup lang="ts">
import { useWorkspaceStore } from '@/stores/workspace'
import { provide, shallowReactive, useTemplateRef } from 'vue'
import WorkspaceNode from '@/components/workspace/WorkspaceNode.vue'
import DocumentPane from '@/components/workspace/DocumentPane.vue'
import { paneHostsKey } from '@/components/workspace/pane-hosts'

defineOptions({ name: 'WorkspacePage' })
const workspace = useWorkspaceStore()
const hosts = shallowReactive(new Map<string, HTMLElement>())
const parking = useTemplateRef('parking')
provide(paneHostsKey, hosts)
</script>

<template>
  <div class="workspace-page size-full min-h-0 min-w-0">
    <WorkspaceNode :node="workspace.root" />
    <div ref="parking" hidden />
    <template v-if="parking">
      <Teleport v-for="pane in workspace.panes" :key="pane.id" :to="hosts.get(pane.id) ?? parking">
        <DocumentPane :pane="pane" />
      </Teleport>
    </template>
  </div>
</template>
