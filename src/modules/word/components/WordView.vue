<script setup lang="ts">
import { reactive, toRefs, computed, useTemplateRef, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import DOMPurify from 'dompurify'
import { useDocumentsStore } from '@/stores/documents'
import { useWorkspaceStore } from '@/stores/workspace'
import { useDocumentActions } from '@/composables/useDocumentActions'
import WordToolbar from './WordToolbar.vue'
import IconButton from '@/components/ui/IconButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import type { DocumentRecord, DocumentTab } from '@/types/document'

const props = defineProps<{ document: DocumentRecord; tab: DocumentTab }>()
const documents = useDocumentsStore()
const workspace = useWorkspaceStore()
const actions = useDocumentActions()
// 响应式状态
const state = reactive({
  // 是否编辑富文本草稿
  editing: false,
  // 查找栏显示状态
  searching: false,
  // 当前查询
  query: '',
})
const { editing, searching, query } = toRefs(state)
const page = useTemplateRef('page')
const viewport = useTemplateRef('viewport')
const searchInput = useTemplateRef('search')
const matchCount = computed(() => state.query ? props.document.text.toLowerCase().split(state.query.toLowerCase()).length - 1 : 0)
function changed() { if (page.value) documents.update(props.document.id, DOMPurify.sanitize(page.value.innerHTML), page.value.innerText) }
async function format(command: string, value?: string) {
  state.editing = true; await nextTick(); page.value?.focus()
  globalThis.document.execCommand(command, false, value); changed()
}
async function find() { if (workspace.activeTab?.id !== props.tab.id) return; state.searching = !state.searching; await nextTick(); searchInput.value?.focus() }
function findNext() {
  if (!state.query || !page.value) return
  const target = Array.from(page.value.querySelectorAll('p, h1, h2, li, td')).find(node => node.textContent?.toLowerCase().includes(state.query.toLowerCase()))
  target?.scrollIntoView({ block: 'center', behavior: 'smooth' })
}
function paste(event: ClipboardEvent) {
  event.preventDefault()
  const html = event.clipboardData?.getData('text/html')
  if (html) globalThis.document.execCommand('insertHTML', false, DOMPurify.sanitize(html))
  else globalThis.document.execCommand('insertText', false, event.clipboardData?.getData('text/plain') ?? '')
  changed()
}
onMounted(() => {
  if (page.value) page.value.innerHTML = DOMPurify.sanitize(props.document.content)
  if (viewport.value) viewport.value.scrollTop = props.tab.position.scroll
  window.addEventListener('mirai:find', find)
})
watch(() => props.document.content, value => { if (page.value && globalThis.document.activeElement !== page.value) page.value.innerHTML = DOMPurify.sanitize(value) })
onBeforeUnmount(() => window.removeEventListener('mirai:find', find))
</script>

<template>
  <div class="word-view flex h-full flex-col">
    <WordToolbar :editing="editing" :zoom="tab.position.zoom" @editing="editing = $event" @zoom="tab.position.zoom = $event" @format="format" @find="find" @save="actions.save" />
    <div v-if="searching" class="word-search flex items-center gap-2.5 bg-canvas px-5 py-2 [&>input]:flex-1 [&>input]:border-0 [&>input]:bg-transparent [&>input]:outline-none [&>span]:text-[11px] [&>span]:text-muted"><AppIcon name="lucide:search" /><input ref="search" v-model="query" placeholder="在文档中查找…" aria-label="搜索 Word 内容" @keydown.enter="findNext"><span>{{ query ? `${matchCount} 处匹配` : '' }}</span><IconButton icon="lucide:arrow-down" label="跳转到匹配内容" @click="findNext" /><IconButton icon="lucide:x" label="关闭查找" @click="searching = false" /></div>
    <div class="word-ruler flex h-[26px] shrink-0 items-center justify-center gap-[29px] overflow-hidden border-b border-line bg-canvas text-[9px] text-faint [&>span]:relative [&>span]:after:absolute [&>span]:after:-bottom-[5px] [&>span]:after:left-1/2 [&>span]:after:h-1 [&>span]:after:w-px [&>span]:after:bg-faint"><span v-for="n in 14" :key="n">{{ n }}</span></div>
    <div ref="viewport" class="word-viewport flex-1 overflow-auto bg-sidebar px-10 py-[30px]" @scroll="tab.position.scroll = ($event.target as HTMLElement).scrollTop">
      <div class="word-paper relative mx-auto min-h-[920px] w-[680px] bg-surface px-[58px] py-10 shadow-[0_2px_12px_#17203410]" :style="{ zoom: tab.position.zoom / 100 }"><div class="paper-heading mb-5 flex justify-between border-b border-line pb-[25px] text-[9px] tracking-[1.3px] text-muted"><span>MIRAIHUB DOCS</span><span>产品 / 规划</span></div><article ref="page" class="document-prose word-content min-h-[730px] caret-accent outline-none [&_h1]:text-[25px] [&_h2]:text-[17px] [&_p]:text-[13px] [&_p]:leading-loose" :contenteditable="editing" :aria-label="editing ? 'Word 富文本编辑器' : 'Word 阅读区域'" :role="editing ? 'textbox' : undefined" :aria-multiline="editing ? true : undefined" spellcheck="false" @input="changed" @paste="paste" /><div class="paper-footer mt-7 flex justify-between border-t border-line pt-3.5 text-[10px] text-muted">产品规划与设计方案<span>01</span></div></div>
    </div>
  </div>
</template>

