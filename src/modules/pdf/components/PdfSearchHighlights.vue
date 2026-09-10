<script setup lang="ts">
import { nextTick, shallowRef, watch } from 'vue'
import type { TextLayer } from 'pdfjs-dist'
import type { PdfSearchMatch } from '../services/search'

const props = defineProps<{
  layer?: TextLayer
  root: HTMLElement | null
  matches: PdfSearchMatch[]
  selected?: string
  reveal?: string
}>()
const emit = defineEmits<{ revealed: [id: string] }>()
const rectangles = shallowRef<
  { id: string; left: number; top: number; width: number; height: number }[]
>([])
watch(
  [
    () => props.layer,
    () => props.root,
    () => props.matches,
    () => props.selected,
    () => props.reveal,
  ],
  async (_, __, onCleanup) => {
    let cancelled = false
    onCleanup(() => {
      cancelled = true
    })
    rectangles.value = []
    await nextTick()
    if (cancelled || !props.layer || !props.root) return
    const bounds = props.root.getBoundingClientRect()
    const result: typeof rectangles.value = []
    for (const match of props.matches) {
      // A range per text item also handles matches split across lines/rotated spans.
      for (let item = match.from.item; item <= match.to.item; item++) {
        const node = props.layer.textDivs[item]?.firstChild
        if (!(node instanceof Text)) continue
        const start = item === match.from.item ? match.from.offset : 0
        const end = item === match.to.item ? match.to.offset : node.length
        if (start >= end || end > node.length) continue
        const range = document.createRange()
        range.setStart(node, start)
        range.setEnd(node, end)
        for (const rect of range.getClientRects()) {
          if (!rect.width || !rect.height) continue
          result.push({
            id: match.id,
            left: rect.left - bounds.left,
            top: rect.top - bounds.top,
            width: rect.width,
            height: rect.height,
          })
        }
      }
    }
    rectangles.value = result
    const target = result.find(rect => rect.id === props.reveal)
    const scroller = props.root.closest<HTMLElement>('.pdf-viewport')
    if (!target || !scroller) return
    const viewport = scroller.getBoundingClientRect()
    scroller.scrollBy({
      top:
        bounds.top +
        target.top -
        viewport.top -
        scroller.clientHeight / 2 +
        target.height / 2,
      left:
        bounds.left + target.left < viewport.left ||
        bounds.left + target.left + target.width > viewport.right
          ? bounds.left +
            target.left -
            viewport.left -
            scroller.clientWidth / 2 +
            target.width / 2
          : 0,
      behavior: 'instant',
    })
    emit('revealed', target.id)
  },
  { immediate: true, flush: 'post' }
)
</script>

<template>
  <div
    class="pdf-search-highlights pointer-events-none absolute inset-0 z-[1]"
    aria-hidden="true"
  >
    <div
      v-for="(rect, index) in rectangles"
      :key="index"
      class="pdf-search-match absolute rounded-[2px]"
      :class="{ 'pdf-search-match-active': rect.id === selected }"
      :data-match-id="rect.id"
      :style="{
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${rect.width}px`,
        height: `${rect.height}px`,
      }"
    />
  </div>
</template>

<style scoped>
.pdf-search-match {
  background: rgb(255 213 0 / 0.4);
}
.pdf-search-match-active {
  background: rgb(255 143 0 / 0.5);
  outline: 1px solid #d97706;
}
@media (forced-colors: active) {
  .pdf-search-match {
    outline: 1px solid Highlight;
  }
  .pdf-search-match-active {
    outline: 2px solid Highlight;
  }
}
</style>
