<script setup lang="ts">
import { computed, nextTick, onMounted, onActivated, onDeactivated, watch } from 'vue'
import { useVirtualList } from '@vueuse/core'
import type { ReadingPosition } from '@/types/document'
import type { PdfPageSize } from '../types'
import { pageLayout, pageAtOffset, PAGE_GAP } from '../services/page-layout'

const props = defineProps<{ sizes: PdfPageSize[]; position: ReadingPosition }>()
const emit = defineEmits<{ position: [page: number, offset: number] }>()
const rows = computed(() =>
  pageLayout(props.sizes, props.position.zoom / 100, props.position.rotation)
)
const { list, containerProps, wrapperProps } = useVirtualList(rows, {
  itemHeight: index => rows.value[index]?.extent ?? 868,
  overscan: 1,
})
const frameWidth = computed(() =>
  rows.value.reduce((max, row) => Math.max(max, row.width + 64), 0)
)
let restoring = true
let revision = 0
let active = true

async function go(page: number, offset = 0) {
  if (!active) return
  const version = ++revision
  restoring = true
  await nextTick()
  if (!active || version !== revision) return
  const index = Math.max(0, Math.min(rows.value.length - 1, page - 1))
  const row = rows.value[index],
    element = containerProps.ref.value
  if (row && element) {
    const fraction = Math.max(-1, Math.min(1, offset))
    element.scrollTop = row.top + row.height * fraction
    containerProps.onScroll()
    emit('position', index + 1, fraction)
  }
  await nextTick()
  if (version === revision) restoring = false
}
function scroll() {
  if (!active) return
  containerProps.onScroll()
  const element = containerProps.ref.value
  if (!element || restoring || !rows.value.length) return
  const index = pageAtOffset(
    rows.value,
    element.scrollTop + element.clientHeight * 0.5
  )
  const row = rows.value[index]!
  emit(
    'position',
    index + 1,
    Math.max(-1, Math.min(1, (element.scrollTop - row.top) / row.height))
  )
}
watch(
  () => [props.position.zoom, props.position.rotation, props.sizes],
  () => {
    void go(props.position.page, props.position.pdfOffset ?? 0)
  }
)
onMounted(() => {
  void go(props.position.page, props.position.pdfOffset ?? 0)
})
onActivated(() => {
  active = true
  void go(props.position.page, props.position.pdfOffset ?? 0)
})
onDeactivated(() => {
  active = false
  revision++
  restoring = true
})
defineExpose({
  go,
  size: () => ({
    width: containerProps.ref.value?.clientWidth ?? 0,
    height: containerProps.ref.value?.clientHeight ?? 0,
  }),
})
</script>

<template>
  <div
    v-bind="{ ...containerProps, onScroll: scroll }"
    class="pdf-viewport bg-sidebar min-h-0 min-w-0 flex-1 overflow-auto [overflow-anchor:none]"
    aria-label="PDF 连续阅读区域"
    tabindex="0"
  >
    <div
      v-bind="wrapperProps"
      :style="{ minWidth: `${frameWidth}px`, width: '100%' }"
    >
      <div
        v-for="item in list"
        :key="item.index"
        class="px-8"
        :style="{
          height: `${item.data.extent}px`,
          paddingTop: `${PAGE_GAP}px`,
        }"
        :data-pdf-page="item.index + 1"
      >
        <div
          class="mx-auto bg-white shadow-md"
          :style="{
            width: `${item.data.width}px`,
            height: `${item.data.height}px`,
          }"
        >
          <slot
            :page="item.index + 1"
            :width="item.data.width"
            :height="item.data.height"
          />
        </div>
      </div>
    </div>
    <div :style="{ height: `${PAGE_GAP}px` }" />
  </div>
</template>
