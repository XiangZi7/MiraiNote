<script setup lang="ts">
import {
  computed,
  useTemplateRef,
  shallowRef,
  watch,
  onBeforeUnmount,
} from 'vue'
import { renderMarkdownDocument } from '../services/render'
import DocumentOutline from '@/components/workspace/DocumentOutline.vue'
import { useDomTextSearch } from '@/composables/useDomTextSearch'
const props = defineProps<{ content: string }>()
const rendered = computed(() => renderMarkdownDocument(props.content))
const scroller = useTemplateRef('scroller')
const article = useTemplateRef('article')
const activeId = shallowRef('')
let headings: HTMLElement[] = []
let frame = 0
function updateActive() {
  frame = 0
  const container = scroller.value
  if (!container) return
  const top = container.getBoundingClientRect().top + 48
  let active: HTMLElement | undefined = headings[0]
  for (const heading of headings) {
    if (heading.getBoundingClientRect().top > top) break
    active = heading
  }
  if (
    container.scrollTop > 0 &&
    container.scrollTop + container.clientHeight >= container.scrollHeight - 2
  )
    active = headings.at(-1)
  activeId.value = active?.dataset.miraiHeading ?? ''
}
function scroll() {
  if (!frame) frame = requestAnimationFrame(updateActive)
}
watch(
  [rendered, article],
  () => {
    headings = Array.from(
      article.value?.querySelectorAll<HTMLElement>('[data-mirai-heading]') ?? []
    )
    updateActive()
  },
  { flush: 'post' }
)
onBeforeUnmount(() => cancelAnimationFrame(frame))
function go(id: string) {
  const heading = article.value?.querySelector(`[data-mirai-heading="${id}"]`)
  const container = scroller.value
  if (heading && container)
    container.scrollTo({
      top:
        container.scrollTop +
        heading.getBoundingClientRect().top -
        container.getBoundingClientRect().top -
        24,
    })
}
defineExpose(useDomTextSearch(article, scroller))
</script>

<template>
  <div class="relative h-full overflow-hidden">
    <div
      ref="scroller"
      tabindex="0"
      aria-label="Markdown 预览"
      @scroll.passive="scroll"
      class="markdown-preview bg-surface h-full overflow-auto px-9 pt-[34px] pb-20 max-[1100px]:p-7"
    >
      <article
        ref="article"
        class="document-prose mx-auto max-w-[780px]"
        v-html="rendered.html"
      />
    </div>
    <DocumentOutline
      :items="rendered.headings"
      :active-id="activeId"
      @select="go"
    />
  </div>
</template>
