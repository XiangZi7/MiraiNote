<script setup lang="ts">
import { useTemplateRef } from 'vue'
import { useElementSize } from '@vueuse/core'
import { AppIcon, IconButton, ResizeHandle } from '@/components/ui'

const width = defineModel<number>('width', { required: true })
defineProps<{ pages: number }>()
const emit = defineEmits<{ close: [] }>()
const body = useTemplateRef('body')
const { width: measuredWidth } = useElementSize(body)
</script>

<template>
  <section
    class="pdf-navigation-panel"
    :style="{ width: `${width}px` }"
    aria-label="PDF 页面导航"
    @keydown.esc.stop="emit('close')"
  >
    <header>
      <AppIcon
        name="lucide:panels-top-left"
        :size="15"
      />
      <strong>页面</strong><span>{{ pages }}</span>
      <IconButton
        icon="lucide:x"
        label="收起页面缩略图"
        @click="emit('close')"
      />
    </header>
    <div
      ref="body"
      class="navigation-content"
    >
      <slot :width="measuredWidth || width" />
    </div>
    <div class="navigation-resize">
      <ResizeHandle
        v-model="width"
        :min="120"
        :max="360"
        label="调整 PDF 缩略图栏宽度"
      />
    </div>
  </section>
</template>

<style scoped>
.pdf-navigation-panel {
  position: absolute;
  z-index: var(--z-document-outline);
  top: 12px;
  bottom: 12px;
  left: 12px;
  display: flex;
  flex-direction: column;
  max-width: calc(100% - 24px);
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
}
header {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  height: 46px;
  padding: 0 8px 0 12px;
  border-bottom: 1px solid var(--border);
  color: var(--secondary);
}
header strong {
  font-size: 12px;
  font-weight: 500;
  white-space: nowrap;
}
header > span {
  margin-right: auto;
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
.navigation-content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border-radius: 0 0 12px 12px;
}
.navigation-resize {
  position: absolute;
  top: 46px;
  bottom: 10px;
  right: 0;
}
</style>
