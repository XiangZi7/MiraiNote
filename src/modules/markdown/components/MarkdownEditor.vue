<script setup lang="ts">
import { onMounted, onBeforeUnmount, onActivated, onDeactivated, useTemplateRef, watch } from 'vue'
import { EditorView } from '@codemirror/view'
import { createEditor, applyMarkdownAction } from '../services/editor'
import type { MarkdownAction } from '../types'
import { editorSearchTarget } from '../services/search'

const props = defineProps<{ content: string; cursor: number; scroll: number }>()
const emit = defineEmits<{
  change: [content: string]
  position: [cursor: number, scroll: number]
}>()
const element = useTemplateRef('editorHost')
let editor: EditorView | undefined
let active = true
onMounted(() => {
  if (!element.value) return
  editor = createEditor(
    element.value,
    props.content,
    content => emit('change', content),
    (cursor, scroll) => { if (active) emit('position', cursor, scroll) }
  )
  editor.dispatch({
    selection: { anchor: Math.min(props.cursor, editor.state.doc.length) },
  })
  editor.scrollDOM.scrollTop = props.scroll
})
onActivated(() => {
  active = true
  if (editor) {
    editor.scrollDOM.scrollTop = props.scroll
    editor.requestMeasure()
  }
})
onDeactivated(() => { active = false })
watch(
  () => props.content,
  value => {
    if (editor && value !== editor.state.doc.toString())
      editor.dispatch({
        changes: { from: 0, to: editor.state.doc.length, insert: value },
      })
  }
)
onBeforeUnmount(() => {
  editor?.destroy()
  editor = undefined
})
defineExpose({
  ...editorSearchTarget(() => editor),
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
