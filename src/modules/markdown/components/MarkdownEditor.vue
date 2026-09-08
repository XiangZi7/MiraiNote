<script setup lang="ts">
import { onMounted, onBeforeUnmount, useTemplateRef, watch } from 'vue'
import { EditorView } from '@codemirror/view'
import { createEditor, applyMarkdownAction } from '../services/editor'
import type { MarkdownAction } from '../types'

const props = defineProps<{ content: string; cursor: number; scroll: number }>()
const emit = defineEmits<{
  change: [content: string]
  position: [cursor: number, scroll: number]
}>()
const element = useTemplateRef('editorHost')
let editor: EditorView | undefined
onMounted(() => {
  if (!element.value) return
  editor = createEditor(
    element.value,
    props.content,
    content => emit('change', content),
    (cursor, scroll) => emit('position', cursor, scroll)
  )
  editor.dispatch({
    selection: { anchor: Math.min(props.cursor, editor.state.doc.length) },
  })
  editor.scrollDOM.scrollTop = props.scroll
})
watch(
  () => props.content,
  value => {
    if (editor && value !== editor.state.doc.toString())
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: value },
      })
  }
)
onBeforeUnmount(() => editor?.destroy())
defineExpose({
  action: (action: MarkdownAction) => {
    if (editor) applyMarkdownAction(editor, action)
  },
})
</script>

<template>
  <div
    ref="editorHost"
    class="markdown-editor size-full min-w-0 overflow-hidden"
  />
</template>
