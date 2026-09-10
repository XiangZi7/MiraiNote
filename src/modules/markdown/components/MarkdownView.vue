<script setup lang="ts">
import { nextTick, useTemplateRef } from 'vue'
import { useElementSize } from '@vueuse/core'
import { useDocumentsStore } from '@/stores/documents'
import { useSettingsStore } from '@/stores/settings'
import { useWorkspaceStore } from '@/stores/workspace'
import MarkdownEditor from './MarkdownEditor.vue'
import MarkdownPreview from './MarkdownPreview.vue'
import MarkdownToolbar from './MarkdownToolbar.vue'
import ResizeHandle from '@/components/ui/ResizeHandle.vue'
import type { DocumentRecord, DocumentTab } from '@/types/document'
import type { MarkdownAction } from '../types'
import DocumentSearchBar from '@/components/search/DocumentSearchBar.vue'
import { useDocumentSearch } from '@/composables/useDocumentSearch'

const props = defineProps<{ document: DocumentRecord; tab: DocumentTab }>()
const documents = useDocumentsStore()
const settings = useSettingsStore()
const workspace = useWorkspaceStore()
const editor = useTemplateRef('editor')
const preview = useTemplateRef('preview')
const searchBar = useTemplateRef('searchBar')
const search = useDocumentSearch({
  target: () =>
    props.tab.position.mode === 'preview' ? preview.value : editor.value,
  active: () => workspace.activeTab?.id === props.tab.id && !workspace.library,
  revision: () => props.document.content,
  focusInput: () => searchBar.value?.focus(),
})
const split = useTemplateRef('split')
const { width } = useElementSize(split)
async function action(action: MarkdownAction) {
  if (action === 'find') return search.open()
  if (props.tab.position.mode === 'preview') props.tab.position.mode = 'split'
  await nextTick()
  editor.value?.action(action)
}
</script>

<template>
  <div
    class="markdown-view relative flex h-full flex-col"
    :style="{
      '--editor-font-size': `${settings.settings.editorFontSize}px`,
      '--document-search-offset': search.state.open
        ? `${(searchBar?.height ?? 0) + 8}px`
        : '0px',
    }"
  >
    <MarkdownToolbar
      :mode="tab.position.mode"
      :searching="search.state.open"
      @mode="tab.position.mode = $event"
      @action="action"
    />
    <DocumentSearchBar
      v-if="search.state.open"
      ref="searchBar"
      v-model:query="search.state.query"
      v-model:case-sensitive="search.state.caseSensitive"
      v-model:whole-word="search.state.wholeWord"
      :total="search.state.total"
      :current="search.current.value"
      :replace-allowed="tab.position.mode !== 'preview'"
      label="搜索 Markdown 内容"
      @close="search.close"
      @next="search.move(1)"
      @previous="search.move(-1)"
      @replace="search.replace"
    />
    <div
      ref="split"
      class="markdown-split flex min-h-0 flex-1"
    >
      <div
        v-if="tab.position.mode !== 'preview'"
        class="editor-side min-w-0 overflow-hidden"
        :style="{
          flex:
            tab.position.mode === 'split' ? `${tab.position.ratio} 1 0` : '1',
        }"
      >
        <MarkdownEditor
          ref="editor"
          :content="document.content"
          :cursor="tab.position.cursor"
          :scroll="tab.position.scroll"
          @change="documents.update(document.id, $event)"
          @position="
            (cursor, scroll) => {
              tab.position.cursor = cursor
              tab.position.scroll = scroll
            }
          "
        />
      </div>
      <ResizeHandle
        v-if="tab.position.mode === 'split'"
        v-model="tab.position.ratio"
        :min="0.3"
        :max="0.7"
        :relative-to="width"
        label="调整编辑与阅读比例"
      />
      <div
        v-if="tab.position.mode !== 'edit'"
        class="preview-side min-w-0 overflow-hidden"
        :style="{
          flex:
            tab.position.mode === 'split'
              ? `${1 - tab.position.ratio} 1 0`
              : '1',
        }"
      >
        <MarkdownPreview
          ref="preview"
          :content="document.content"
          :scroll="tab.position.previewScroll ?? 0"
          @position="tab.position.previewScroll = $event"
        />
      </div>
    </div>
  </div>
</template>
