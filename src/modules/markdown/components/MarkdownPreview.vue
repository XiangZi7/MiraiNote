<script setup lang="ts">
import { computed } from 'vue'
import { renderMarkdown } from '../services/render'
const props = defineProps<{ content: string }>()
const html = computed(() => renderMarkdown(props.content))
</script>

<template>
  <div class="markdown-preview h-full overflow-auto bg-surface px-9 pt-[34px] pb-20 max-[1100px]:p-7"><article class="document-prose mx-auto max-w-[780px]" v-html="html" /></div>
</template>

