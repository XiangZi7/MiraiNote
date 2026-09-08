<script setup lang="ts">
import { nextTick, useTemplateRef, onMounted, onBeforeUnmount } from 'vue'
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

const props = defineProps<{ document: DocumentRecord; tab: DocumentTab }>()
const documents = useDocumentsStore()
const settings = useSettingsStore()
const workspace = useWorkspaceStore()
const editor = useTemplateRef('editor')
const split = useTemplateRef('split')
const { width } = useElementSize(split)
async function action(action: MarkdownAction) {
  if (props.tab.position.mode === 'preview') props.tab.position.mode = 'split'
  await nextTick()
  editor.value?.action(action)
}
function find() {
  if (workspace.activeTab?.id === props.tab.id) void action('find')
}
onMounted(() => window.addEventListener('mirai:find', find))
onBeforeUnmount(() => window.removeEventListener('mirai:find', find))
</script>

<template>
  <div
    class="markdown-view flex h-full flex-col"
    :style="{ '--editor-font-size': `${settings.settings.editorFontSize}px` }"
  >
    <MarkdownToolbar
      :mode="tab.position.mode"
      @mode="tab.position.mode = $event"
      @action="action"
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
        <MarkdownPreview :content="document.content" />
      </div>
    </div>
  </div>
</template>
