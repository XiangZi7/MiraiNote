<script setup lang="ts">
import { inject, onBeforeUnmount, useTemplateRef, type ComponentPublicInstance } from 'vue'
import { useElementSize } from '@vueuse/core'
import ResizeHandle from '@/components/ui/ResizeHandle.vue'
import { paneHostsKey } from './pane-hosts'
import type { LayoutNode } from '@/types/workspace'

const props = defineProps<{ node: LayoutNode }>()
const hosts = inject(paneHostsKey)!
let registered: { id: string; element: HTMLElement } | undefined
function unregister() {
  if (registered && hosts.get(registered.id) === registered.element) hosts.delete(registered.id)
  registered = undefined
}
function setHost(element: Element | ComponentPublicInstance | null) {
  if (registered?.id === props.node.id && registered.element === element && hosts.get(registered.id) === element) return
  unregister()
  if (element instanceof HTMLElement) {
    registered = { id: props.node.id, element }
    hosts.set(props.node.id, element)
  }
}
onBeforeUnmount(unregister)
const element = useTemplateRef('split')
const { width, height } = useElementSize(element)
</script>

<template>
  <div
    v-if="node.type === 'pane'"
    :ref="setHost"
    class="size-full min-h-0 min-w-0"
  />
  <div
    v-else
    ref="split"
    class="workspace-split flex size-full min-h-0 min-w-0 [&.vertical]:flex-col"
    :class="node.axis"
  >
    <div
      class="split-child min-h-0 min-w-0 overflow-hidden"
      :style="{ flex: `${node.ratio} 1 0` }"
    >
      <WorkspaceNode :node="node.children[0]" />
    </div>
    <ResizeHandle
      v-model="node.ratio"
      :min="0.2"
      :max="0.8"
      :axis="node.axis"
      :relative-to="node.axis === 'horizontal' ? width : height"
      label="调整文档分屏比例"
    />
    <div
      class="split-child min-h-0 min-w-0 overflow-hidden"
      :style="{ flex: `${1 - node.ratio} 1 0` }"
    >
      <WorkspaceNode :node="node.children[1]" />
    </div>
  </div>
</template>
