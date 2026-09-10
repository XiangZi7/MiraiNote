<script setup lang="ts">
import {
  computed,
  onBeforeUnmount,
  onMounted,
  onActivated,
  onDeactivated,
  reactive,
  toRefs,
  shallowRef,
  useTemplateRef,
  nextTick,
  watch,
} from 'vue'
import type { PDFDocumentProxy, PDFDocumentLoadingTask } from 'pdfjs-dist'
import { loadPdf } from '../services/pdf'
import { readPdfOutline, type PdfOutlineEntry } from '../services/outline'
import DocumentOutline from '@/components/workspace/DocumentOutline.vue'
import DocumentSearchBar from '@/components/search/DocumentSearchBar.vue'
import { documentApi } from '@/api/ipc/document'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSettingsStore } from '@/stores/settings'
import PdfPagesViewport from './PdfPagesViewport.vue'
import PdfThumbnails from './PdfThumbnails.vue'
import PdfNavigationPanel from './PdfNavigationPanel.vue'
import type { PdfPageSize } from '../types'
import { AppToolbar, ToolbarSeparator, IconButton } from '@/components/ui'
import PdfCanvas from './PdfCanvas.vue'
import type { DocumentRecord, DocumentTab } from '@/types/document'
const props = defineProps<{ document: DocumentRecord; tab: DocumentTab }>()
const workspace = useWorkspaceStore()
const settings = useSettingsStore()
const navigationWidth = computed({
  get: () => settings.settings.pdfSidebarWidth ?? 146,
  set: (value: number) => {
    settings.settings.pdfSidebarWidth = value
  },
})
const pageSizes = shallowRef<PdfPageSize[]>([])
const pdf = shallowRef<PDFDocumentProxy>()
const outline = shallowRef<PdfOutlineEntry[]>([])
const outlineError = shallowRef('这份 PDF 没有书签目录')
const activeOutline = computed(() => {
  let active: PdfOutlineEntry | undefined
  for (const entry of outline.value) {
    if (
      entry.page &&
      entry.page <= props.tab.position.page &&
      (!active?.page || entry.page >= active.page)
    )
      active = entry
  }
  return active?.id ?? ''
})
const viewport = useTemplateRef('viewport'),
  searchBar = useTemplateRef('searchBar')
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
let loading: PDFDocumentLoadingTask | undefined
let disposed = false
let searchRevision = 0
watch(query, () => {
  searchRevision++
  state.progress = ''
})
function closeSearch() {
  searchRevision++
  state.searching = false
}
function go(page: number) {
  const target = Math.max(
    1,
    Math.min(pdf.value?.numPages ?? 1, Math.round(page) || 1)
  )
  void viewport.value?.go(target)
}
function goOutline(id: string) {
  const entry = outline.value.find(item => item.id === id)
  if (entry?.page) go(entry.page)
}
function position(page: number, offset: number) {
  props.tab.position.page = page
  props.tab.position.pdfOffset = offset
}
function zoom(value: number) {
  props.tab.position.zoom = Math.max(30, Math.min(250, Math.round(value)))
}
async function fit(whole = false) {
  const page = await pdf.value?.getPage(props.tab.position.page)
  if (!page) return
  const size = page.getViewport({
    scale: 1,
    rotation: (page.rotate + props.tab.position.rotation) % 360,
  })
  const viewportSize = viewport.value?.size()
  if (!viewportSize) return
  zoom(
    Math.min(
      (viewportSize.width - 64) / size.width,
      whole ? (viewportSize.height - 52) / size.height : 2.5
    ) * 100
  )
}
async function find() {
  if (workspace.library || workspace.activeTab?.id !== props.tab.id) return
  state.searching = true
  await nextTick()
  searchBar.value?.focus()
}
async function search(direction: 1 | -1) {
  if (!pdf.value || !state.query.trim()) return
  const run = ++searchRevision
  const current = pdf.value
  const query = state.query.trim().toLowerCase()
  const startPage = props.tab.position.page
  try {
    for (let offset = 1; offset <= current.numPages && !disposed; offset++) {
      const number =
        ((startPage - 1 + direction * offset + current.numPages) %
          current.numPages) +
        1
      state.progress = `正在搜索 ${number} / ${current.numPages}`
      const page = await current.getPage(number)
      const content = await page.getTextContent()
      if (disposed || run !== searchRevision) return
      if (
        content.items
          .map(item => ('str' in item ? item.str : ''))
          .join(' ')
          .toLowerCase()
          .includes(query)
      ) {
        go(number)
        state.progress = `找到第 ${number} 页`
        return
      }
    }
    state.progress = '没有找到匹配内容'
  } catch (reason) {
    if (!disposed && run === searchRevision)
      state.progress =
        reason instanceof Error ? reason.message : '搜索失败，请重试'
  }
}
onMounted(async () => {
  window.addEventListener('mirai:find', find)
  try {
    const blob = await documentApi.binary(props.document.assetId!)
    if (disposed) return
    loading = loadPdf(await blob.arrayBuffer())
    const loaded = await loading.promise
    if (disposed) return
    const sizes: PdfPageSize[] = []
    for (let number = 1; number <= loaded.numPages; number++) {
      const page = await loaded.getPage(number)
      if (disposed) return
      const viewport = page.getViewport({ scale: 1 })
      sizes.push({ width: viewport.width, height: viewport.height })
    }
    pageSizes.value = sizes
    props.document.pages = loaded.numPages
    pdf.value = loaded
    void readPdfOutline(loaded)
      .then(items => {
        if (!disposed) outline.value = items
      })
      .catch(() => {
        if (!disposed) outlineError.value = '无法读取这份 PDF 的书签目录'
      })
  } catch (reason) {
    if (!disposed)
      state.error = reason instanceof Error ? reason.message : 'PDF 读取失败'
  }
})
onActivated(() => window.addEventListener('mirai:find', find))
onDeactivated(() => {
  searchRevision++
  window.removeEventListener('mirai:find', find)
})
onBeforeUnmount(() => {
  disposed = true
  void loading?.destroy()
  window.removeEventListener('mirai:find', find)
})
</script>

<template>
  <div
    class="bg-canvas relative flex h-full flex-col"
    :style="{
      '--document-search-offset': searching
        ? `${(searchBar?.height ?? 0) + 8}px`
        : '0px',
    }"
  >
    <AppToolbar label="PDF 工具栏"
      ><IconButton
        icon="lucide:panel-left"
        label="切换 PDF 缩略图"
        :active="thumbnails"
        @click="thumbnails = !thumbnails" /><ToolbarSeparator /><IconButton
        icon="lucide:chevron-left"
        label="上一页"
        :disabled="tab.position.page <= 1"
        @click="go(tab.position.page - 1)" /><input
        aria-label="PDF 页码"
        type="number"
        min="1"
        :max="pdf?.numPages"
        :value="tab.position.page"
        class="border-line bg-surface h-6 w-10 rounded border text-center text-xs"
        @change="go(Number(($event.target as HTMLInputElement).value))" /><span
        class="text-muted text-xs whitespace-nowrap"
        >/ {{ pdf?.numPages ?? '…' }}</span
      ><IconButton
        icon="lucide:chevron-right"
        label="下一页"
        :disabled="tab.position.page >= (pdf?.numPages ?? 1)"
        @click="go(tab.position.page + 1)" /><ToolbarSeparator /><IconButton
        icon="lucide:minus"
        label="缩小"
        @click="zoom(tab.position.zoom - 10)" /><button
        class="text-secondary min-w-11 text-xs"
        @click="zoom(100)"
      >
        {{ tab.position.zoom }}%</button
      ><IconButton
        icon="lucide:plus"
        label="放大"
        @click="zoom(tab.position.zoom + 10)" /><ToolbarSeparator /><IconButton
        icon="lucide:move-horizontal"
        label="适合宽度"
        @click="fit()" /><IconButton
        icon="lucide:scan"
        label="适合页面"
        @click="fit(true)" /><IconButton
        icon="lucide:rotate-cw"
        label="旋转页面"
        @click="
          tab.position.rotation = (tab.position.rotation + 90) % 360
        " /><span class="flex-1" /><IconButton
        icon="lucide:search"
        label="搜索 PDF (Ctrl+F)"
        @click="find"
    /></AppToolbar>
    <DocumentSearchBar
      v-if="searching"
      ref="searchBar"
      v-model:query="query"
      :total="0"
      :current="0"
      :navigation-enabled="!!query.trim() && !!pdf"
      :status-text="progress || (query.trim() ? 'Enter 查找' : '输入关键词')"
      :show-options="false"
      label="搜索 PDF 内容"
      @next="search(1)"
      @previous="search(-1)"
      @close="closeSearch"
    />
    <div
      v-if="error"
      role="alert"
      class="text-danger grid flex-1 place-items-center p-10 text-sm"
    >
      {{ error }}
    </div>
    <div
      v-else-if="!pdf"
      class="text-muted grid flex-1 place-items-center text-xs"
    >
      正在加载 PDF…
    </div>
    <div
      v-else
      class="relative flex min-h-0 flex-1"
    >
      <PdfNavigationPanel
        v-if="thumbnails"
        v-model:width="navigationWidth"
        :pages="pdf.numPages"
        @close="thumbnails = false"
      >
        <template #default="{ width }">
          <PdfThumbnails
            :pdf="pdf"
            :sizes="pageSizes"
            :width="width"
            :page="tab.position.page"
            @select="go"
          />
        </template>
      </PdfNavigationPanel>
      <PdfPagesViewport
        ref="viewport"
        :sizes="pageSizes"
        :position="tab.position"
        @position="position"
      >
        <template #default="{ page }">
          <PdfCanvas
            :pdf="pdf"
            :page="page"
            :size="pageSizes[page - 1]"
            :scale="tab.position.zoom / 100"
            :rotation="tab.position.rotation"
          />
        </template>
      </PdfPagesViewport>
      <DocumentOutline
        :items="outline"
        :active-id="activeOutline"
        :empty-text="outlineError"
        @select="goOutline"
      />
    </div>
  </div>
</template>
