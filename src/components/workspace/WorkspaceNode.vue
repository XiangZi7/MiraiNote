<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useElementSize } from '@vueuse/core'
import ResizeHandle from '@/components/ui/ResizeHandle.vue'
import DocumentPane from './DocumentPane.vue'
import type { LayoutNode } from '@/types/workspace'

defineProps<{ node: LayoutNode }>()
const element = useTemplateRef('split')
const { width, height } = useElementSize(element)
</script>

<template>
  <DocumentPane
    v-if="node.type === 'pane'"
    :pane="node"
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
