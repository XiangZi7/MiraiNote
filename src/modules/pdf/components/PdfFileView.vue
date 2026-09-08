<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, toRefs, shallowRef, computed, useTemplateRef, nextTick } from 'vue'
import { useElementSize } from '@vueuse/core'
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from 'pdfjs-dist'
import { loadPdf } from '../services/pdf'
import { documentApi } from '@/api/ipc/document'
import { useWorkspaceStore } from '@/stores/workspace'
import { AppToolbar, ToolbarSeparator, IconButton, AppIcon } from '@/components/ui'
import PdfCanvas from './PdfCanvas.vue'
import type { DocumentRecord, DocumentTab } from '@/types/document'
const props = defineProps<{ document: DocumentRecord; tab: DocumentTab }>()
const workspace = useWorkspaceStore()
const pdf = shallowRef<PDFDocumentProxy>()
const viewport = useTemplateRef('viewport'), input = useTemplateRef('search')
const { width, height } = useElementSize(viewport)
// 响应式状态
const state = reactive({
  // 文档加载异常
  error: '',
  // 左侧导航显示状态
  thumbnails: true,
  // 搜索栏显示状态
  searching: false,
  // 查找关键字
  query: '',
  // 搜索进度
  progress: '',
})
const { error, thumbnails, searching, query, progress } = toRefs(state)
const pages = computed(() => Array.from({ length: pdf.value?.numPages ?? 0 }, (_, index) => index + 1))
let loading: PDFDocumentLoadingTask | undefined
let disposed = false
function go(page: number) { props.tab.position.page = Math.max(1, Math.min(pdf.value?.numPages ?? 1, Math.round(page) || 1)) }
function zoom(value: number) { props.tab.position.zoom = Math.max(30, Math.min(250, Math.round(value))) }
async function fit(whole = false) { const page = await pdf.value?.getPage(props.tab.position.page); if (!page) return; const size = page.getViewport({ scale: 1, rotation: props.tab.position.rotation }); zoom(Math.min((width.value - 64) / size.width, whole ? (height.value - 52) / size.height : 2.5) * 100) }
async function find() { if (workspace.activeTab?.id !== props.tab.id) return; state.searching = !state.searching; await nextTick(); input.value?.focus() }
async function search() {
  if (!pdf.value || !state.query.trim()) return
  const query = state.query.trim().toLowerCase()
  for (let offset = 1; offset <= pdf.value.numPages && !disposed; offset++) {
    const number = (props.tab.position.page - 1 + offset) % pdf.value.numPages + 1
    state.progress = `正在搜索 ${number} / ${pdf.value.numPages}`
    const page = await pdf.value.getPage(number)
    const content = await page.getTextContent()
    if (content.items.map(item => 'str' in item ? item.str : '').join(' ').toLowerCase().includes(query)) { go(number); state.progress = `找到第 ${number} 页`; return }
  }
  state.progress = '没有找到匹配内容'
}
onMounted(async () => {
  window.addEventListener('mirai:find', find)
  try { const blob = await documentApi.binary(props.document.assetId!); if (disposed) return; loading = loadPdf(await blob.arrayBuffer()); const loaded = await loading.promise; if (disposed) return; pdf.value = loaded; props.document.pages = loaded.numPages; go(props.tab.position.page) }
  catch (reason) { if (!disposed) state.error = reason instanceof Error ? reason.message : 'PDF 读取失败' }
})
onBeforeUnmount(() => { disposed = true; void loading?.destroy(); window.removeEventListener('mirai:find', find) })
</script>

<template><div class="flex h-full flex-col bg-canvas"><AppToolbar label="PDF 工具栏"><IconButton icon="lucide:panel-left" label="切换 PDF 缩略图" :active="thumbnails" @click="thumbnails = !thumbnails" /><ToolbarSeparator /><IconButton icon="lucide:chevron-left" label="上一页" :disabled="tab.position.page <= 1" @click="go(tab.position.page - 1)" /><input aria-label="PDF 页码" type="number" min="1" :max="pdf?.numPages" :value="tab.position.page" class="h-6 w-10 rounded border border-line bg-surface text-center text-xs" @change="go(Number(($event.target as HTMLInputElement).value))" /><span class="text-xs whitespace-nowrap text-muted">/ {{ pdf?.numPages ?? '…' }}</span><IconButton icon="lucide:chevron-right" label="下一页" :disabled="tab.position.page >= (pdf?.numPages ?? 1)" @click="go(tab.position.page + 1)" /><ToolbarSeparator /><IconButton icon="lucide:minus" label="缩小" @click="zoom(tab.position.zoom - 10)" /><button class="min-w-11 text-xs text-secondary" @click="zoom(100)">{{ tab.position.zoom }}%</button><IconButton icon="lucide:plus" label="放大" @click="zoom(tab.position.zoom + 10)" /><ToolbarSeparator /><IconButton icon="lucide:move-horizontal" label="适合宽度" @click="fit()" /><IconButton icon="lucide:scan" label="适合页面" @click="fit(true)" /><IconButton icon="lucide:rotate-cw" label="旋转页面" @click="tab.position.rotation = (tab.position.rotation + 90) % 360" /><span class="flex-1" /><IconButton icon="lucide:search" label="搜索 PDF (Ctrl+F)" @click="find" /></AppToolbar><div v-if="searching" class="flex items-center gap-3 border-b border-line px-5 py-2"><AppIcon name="lucide:search" /><input ref="search" v-model="query" aria-label="搜索 PDF 内容" placeholder="查找内容，按回车跳转…" class="min-w-0 flex-1 border-0 bg-transparent text-xs outline-none" @keydown.enter="search" /><span class="text-[11px] text-muted">{{ progress }}</span><IconButton icon="lucide:x" label="关闭查找" @click="searching = false" /></div><div v-if="error" role="alert" class="grid flex-1 place-items-center p-10 text-sm text-danger">{{ error }}</div><div v-else-if="!pdf" class="grid flex-1 place-items-center text-xs text-muted">正在加载 PDF…</div><div v-else class="flex min-h-0 flex-1"><aside v-if="thumbnails" class="w-[146px] shrink-0 overflow-auto border-r border-line bg-inspector px-5 py-5" aria-label="PDF 缩略图"><button v-for="number in pages" :key="number" class="mb-5 block border-2 p-0.5" :class="number === tab.position.page ? 'border-accent' : 'border-transparent'" :aria-label="`跳转第 ${number} 页`" @click="go(number)"><PdfCanvas :pdf="pdf" :page="number" :scale=".16" thumbnail /><span class="mt-1.5 block text-[11px] text-muted">{{ number }}</span></button></aside><div ref="viewport" class="min-w-0 flex-1 overflow-auto bg-sidebar px-8 py-[26px]"><div class="mx-auto w-max shadow-md"><PdfCanvas :pdf="pdf" :page="tab.position.page" :scale="tab.position.zoom / 100" :rotation="tab.position.rotation" /></div></div></div></div></template>
