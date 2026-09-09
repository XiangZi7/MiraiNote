<script setup lang="ts">
import { computed, useTemplateRef, onMounted, nextTick, watch } from 'vue'
import { EditorContent, useEditor } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import { TableKit } from '@tiptap/extension-table'
import Image from '@tiptap/extension-image'
import DOMPurify from 'dompurify'
import { useDocumentsStore } from '@/stores/documents'
import { useWorkspaceStore } from '@/stores/workspace'
import { useDocumentActions } from '@/composables/useDocumentActions'
import WordToolbar from './WordToolbar.vue'
import DocxPreview from './DocxPreview.vue'
import DocumentSearchBar from '@/components/search/DocumentSearchBar.vue'
import { useDocumentSearch } from '@/composables/useDocumentSearch'
import { useDomTextSearch } from '@/composables/useDomTextSearch'
import type { DocumentRecord, DocumentTab } from '@/types/document'

const props = defineProps<{ document: DocumentRecord; tab: DocumentTab }>()
const documents = useDocumentsStore(),
  workspace = useWorkspaceStore(),
  actions = useDocumentActions()
const editing = computed({
  get: () => props.tab.position.mode === 'edit',
  set: value => {
    props.tab.position.mode = value ? 'edit' : 'preview'
  },
})
const viewport = useTemplateRef('viewport'),
  searchBar = useTemplateRef('searchBar')
const originalPreview = computed(
  () =>
    props.document.assetId &&
    !editing.value &&
    props.document.content === props.document.originalContent
)
const searchRoot = () =>
  viewport.value?.querySelector<HTMLElement>(
    originalPreview.value ? '[aria-label="Word 原始排版预览"]' : '.tiptap'
  ) ?? null
const searchTarget = useDomTextSearch(searchRoot, viewport)
const search = useDocumentSearch({
  target: () => searchTarget,
  active: () => workspace.activeTab?.id === props.tab.id && !workspace.library,
  revision: () => [
    props.document.content,
    editing.value,
    originalPreview.value,
  ],
  focusInput: () => searchBar.value?.focus(),
})
const editor = useEditor({
  content: DOMPurify.sanitize(props.document.content),
  editable: editing.value,
  extensions: [
    StarterKit,
    TableKit.configure({ table: { resizable: true } }),
    Image.configure({ allowBase64: true }),
  ],
  editorProps: {
    attributes: {
      class: 'document-prose min-h-[730px] outline-none',
      'aria-label': 'Word 富文本编辑器',
      spellcheck: 'false',
    },
    transformPastedHTML: html => DOMPurify.sanitize(html),
  },
  onUpdate: ({ editor }) =>
    documents.update(props.document.id, editor.getHTML(), editor.getText()),
})
watch(editing, editable => editor.value?.setEditable(editable))
watch(
  () => props.document.content,
  value => {
    if (editor.value && editor.value.getHTML() !== value)
      editor.value.commands.setContent(DOMPurify.sanitize(value), {
        emitUpdate: false,
      })
  }
)
async function format(command: string, value?: string) {
  editing.value = true
  await nextTick()
  const chain = editor.value?.chain().focus()
  if (!chain) return
  const actions: Record<string, () => boolean> = {
    bold: () => chain.toggleBold().run(),
    italic: () => chain.toggleItalic().run(),
    underline: () => chain.toggleUnderline().run(),
    insertUnorderedList: () => chain.toggleBulletList().run(),
    insertOrderedList: () => chain.toggleOrderedList().run(),
    insertTable: () =>
      chain.insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
    clearFormat: () => chain.unsetAllMarks().clearNodes().run(),
    undo: () => chain.undo().run(),
    redo: () => chain.redo().run(),
    formatBlock: () =>
      value === 'p'
        ? chain.setParagraph().run()
        : chain
            .setHeading({ level: Number(value?.slice(1) ?? 1) as 1 | 2 | 3 })
            .run(),
  }
  actions[command]?.()
}
function restoreScroll() {
  if (viewport.value) viewport.value.scrollTop = props.tab.position.scroll
  search.refresh(false, true)
}
onMounted(restoreScroll)
</script>

<template>
  <div class="word-view flex h-full flex-col">
    <WordToolbar
      :editing="editing"
      :zoom="tab.position.zoom"
      @editing="editing = $event"
      @zoom="tab.position.zoom = $event"
      @format="format"
      @find="search.open"
      @save="actions.save"
    />
    <DocumentSearchBar
      v-if="search.state.open"
      ref="searchBar"
      v-model:query="search.state.query"
      v-model:case-sensitive="search.state.caseSensitive"
      v-model:whole-word="search.state.wholeWord"
      :total="search.state.total"
      :current="search.current.value"
      label="搜索 Word 内容"
      @close="search.close"
      @next="search.move(1)"
      @previous="search.move(-1)"
    />
    <div
      class="word-ruler border-line bg-canvas text-faint [&>span]:after:bg-faint flex h-[26px] shrink-0 items-center justify-center gap-[29px] overflow-hidden border-b text-[9px] [&>span]:relative [&>span]:after:absolute [&>span]:after:-bottom-[5px] [&>span]:after:left-1/2 [&>span]:after:h-1 [&>span]:after:w-px"
    >
      <span
        v-for="n in 14"
        :key="n"
        >{{ n }}</span
      >
    </div>
    <div
      ref="viewport"
      tabindex="0"
      aria-label="Word 文档阅读区域"
      class="word-viewport bg-sidebar flex-1 overflow-auto px-10 py-[30px]"
      @scroll="tab.position.scroll = ($event.target as HTMLElement).scrollTop"
    >
      <DocxPreview
        v-if="originalPreview && document.assetId"
        :asset-id="document.assetId"
        @ready="restoreScroll"
        :style="{ zoom: tab.position.zoom / 100 }"
      />
      <div
        v-else
        class="word-paper bg-surface relative mx-auto min-h-[920px] w-[680px] px-[58px] py-10 shadow-[0_2px_12px_#17203410]"
        :style="{ zoom: tab.position.zoom / 100 }"
      >
        <div
          class="paper-heading border-line text-muted mb-5 flex justify-between border-b pb-[25px] text-[9px] tracking-[1.3px]"
        >
          <span>MiraiNote</span><span>Word 文档</span>
        </div>
        <EditorContent
          :editor="editor"
          class="word-content [&_.tiptap]:outline-none [&_h1]:text-[25px] [&_h2]:text-[17px] [&_p]:text-[13px] [&_p]:leading-loose"
        />
        <div
          class="paper-footer border-line text-muted mt-7 flex justify-between border-t pt-3.5 text-[10px]"
        >
          {{ document.name }}<span>01</span>
        </div>
      </div>
    </div>
  </div>
</template>
