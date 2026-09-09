<script setup lang="ts">
import { computed, useTemplateRef } from 'vue'
import { renderMarkdownDocument } from '../services/render'
import DocumentOutline from '@/components/workspace/DocumentOutline.vue'
const props = defineProps<{ content: string }>()
const rendered = computed(() => renderMarkdownDocument(props.content))
const scroller = useTemplateRef('scroller')
const article = useTemplateRef('article')
function go(id: string) {
  const heading = article.value?.querySelector(`[data-mirai-heading="${id}"]`)
  const container = scroller.value
  if (heading && container) container.scrollTo({ top: container.scrollTop + heading.getBoundingClientRect().top - container.getBoundingClientRect().top - 24 })
}
</script>

<template>
  <div class="relative h-full overflow-hidden">
    <div
    ref="scroller"
    class="markdown-preview bg-surface h-full overflow-auto px-9 pt-[34px] pb-20 max-[1100px]:p-7"
  >
    <article
      ref="article"
      class="document-prose mx-auto max-w-[780px]"
      v-html="rendered.html"
    />
    </div>
    <DocumentOutline :items="rendered.headings" @select="go" />
  </div>
</template>
