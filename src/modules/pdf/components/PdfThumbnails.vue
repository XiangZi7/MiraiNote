<script setup lang="ts">
import { computed, watch, onMounted, nextTick } from 'vue'
import { useVirtualList } from '@vueuse/core'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import type { PdfPageSize } from '../types'
import PdfCanvas from './PdfCanvas.vue'
const props = defineProps<{
  pdf: PDFDocumentProxy
  sizes: PdfPageSize[]
  width: number
  page: number
}>()
const emit = defineEmits<{ select: [page: number] }>()
const items = computed(() =>
  props.sizes.map((size, index) => {
    const scale = Math.min((props.width - 48) / size.width, 320 / size.height)
    return { size, scale, number: index + 1, height: size.height * scale + 54 }
  })
)
const { list, containerProps, wrapperProps, scrollTo } = useVirtualList(items, {
  itemHeight: index => items.value[index]?.height ?? 190,
  overscan: 2,
})
function revealCurrentPage() {
  const page = props.page
  const element = containerProps.ref.value
  if (!element) return
  const top = items.value
    .slice(0, page - 1)
    .reduce((sum, row) => sum + row.height, 0)
  const bottom = top + (items.value[page - 1]?.height ?? 0)
  if (
    top < element.scrollTop ||
    bottom > element.scrollTop + element.clientHeight
  )
    scrollTo(page - 1)
}
watch(() => [props.page, props.width], revealCurrentPage, { flush: 'post' })
onMounted(async () => {
  await nextTick()
  revealCurrentPage()
})
</script>
<template>
  <aside
    v-bind="containerProps"
    class="bg-editor min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
    :style="{ width: `${width}px` }"
    aria-label="PDF 缩略图"
  >
    <div v-bind="wrapperProps">
      <div
        v-for="item in list"
        :key="item.index"
        class="flex justify-center pt-5"
        :style="{ height: `${item.data.height}px` }"
      >
        <button
          class="h-fit border-2 p-0.5"
          :class="
            item.data.number === page ? 'border-accent' : 'border-transparent'
          "
          :aria-label="`跳转第 ${item.data.number} 页`"
          :aria-current="item.data.number === page ? 'page' : undefined"
          @click="emit('select', item.data.number)"
        >
          <PdfCanvas
            :pdf="pdf"
            :page="item.data.number"
            :scale="item.data.scale"
            :size="item.data.size"
            thumbnail
          />
          <span class="text-muted mt-1.5 block text-[11px]">{{
            item.data.number
          }}</span>
        </button>
      </div>
    </div>
  </aside>
</template>
