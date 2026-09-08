<script setup lang="ts">
import { onMounted, onBeforeUnmount, shallowRef, useTemplateRef } from 'vue'
import { renderAsync } from 'docx-preview'
import { documentApi } from '@/api/ipc/document'
const props = defineProps<{ assetId: string }>()
const container = useTemplateRef('container')
const error = shallowRef('')
let disposed = false
onMounted(async () => {
  try { const blob = await documentApi.binary(props.assetId); if (!disposed && container.value) await renderAsync(blob, container.value, undefined, { className: 'docx-page', inWrapper: false, ignoreLastRenderedPageBreak: false, useBase64URL: true }) }
  catch (reason) { if (!disposed) error.value = reason instanceof Error ? reason.message : 'Word 文档解析失败' }
})
onBeforeUnmount(() => { disposed = true })
</script>

<template><div ref="container" class="mx-auto w-max [&>section]:mb-6 [&>section]:bg-white [&>section]:shadow-md" aria-label="Word 原始排版预览"><p v-if="error" role="alert" class="p-10 text-danger">{{ error }}</p></div></template>
