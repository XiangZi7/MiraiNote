<script setup lang="ts">
import { AppToolbar, ToolbarSeparator } from '@/components/ui'
import {
  computed,
  reactive,
  toRefs,
  useTemplateRef,
  onMounted,
  onBeforeUnmount,
  onActivated,
  onDeactivated,
  nextTick,
} from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useOverlaysStore } from '@/stores/overlays'
import IconButton from '@/components/ui/IconButton.vue'
import DocumentSearchBar from '@/components/search/DocumentSearchBar.vue'
import PdfPage from './PdfPage.vue'
import PdfFileView from './PdfFileView.vue'
import PdfPagesViewport from './PdfPagesViewport.vue'
import PdfNavigationPanel from './PdfNavigationPanel.vue'
import DocumentOutline from '@/components/workspace/DocumentOutline.vue'
import { useSettingsStore } from '@/stores/settings'
import { examplePages } from '../services/example-pages'
import type { DocumentRecord, DocumentTab } from '@/types/document'
const props = defineProps<{ document: DocumentRecord; tab: DocumentTab }>()
const workspace = useWorkspaceStore()
const overlays = useOverlaysStore()
const settings = useSettingsStore()
const navigationWidth = computed({
  get: () => settings.settings.pdfSidebarWidth ?? 146,
  set: (value: number) => {
    settings.settings.pdfSidebarWidth = value
  },
})
const pageSizes = examplePages.map(() => ({ width: 595, height: 842 }))
const thumbnailScale = (width: number) =>
  Math.min((width - 48) / 595, 320 / 842)
// 响应式状态
const state = reactive({
  // 左侧导航方式
  navigation: 'thumbnails' as 'thumbnails' | 'hidden',
  // 当前文档查找栏
  searching: false,
  // 页内查询文本
  query: '',
})
const { navigation, searching, query } = toRefs(state)
const root = useTemplateRef('root')
const viewport = useTemplateRef('viewport')
const searchBar = useTemplateRef('searchBar')
const scale = computed(() => props.tab.position.zoom / 100)
const matches = computed(() =>
  examplePages
    .map((page, index) => ({ page, number: index + 1 }))
    .filter(item =>
      JSON.stringify(item.page)
        .toLowerCase()
        .includes(state.query.toLowerCase())
    )
)
const outline = examplePages.map((page, index) => ({
  id: String(index + 1),
  title: page.section,
  level: 1,
}))
function go(page: number) {
  void viewport.value?.go(
    Math.max(1, Math.min(examplePages.length, Math.round(page) || 1))
  )
}
function position(page: number, offset: number) {
  props.tab.position.page = page
  props.tab.position.pdfOffset = offset
}
function zoom(value: number) {
  props.tab.position.zoom = Math.min(200, Math.max(40, value))
}
function fit(page = false) {
  const el = viewport.value?.size()
  if (el)
    zoom(
      Math.floor(
        Math.min(
          (el.width - 64) / (props.tab.position.rotation % 180 ? 842 : 595),
          page
            ? (el.height - 52) / (props.tab.position.rotation % 180 ? 595 : 842)
            : 2
        ) * 100
      )
    )
}
async function find() {
  if (
    props.document.assetId ||
    workspace.library ||
    workspace.activeTab?.id !== props.tab.id
  )
    return
  state.searching = true
  await nextTick()
  searchBar.value?.focus()
}
function search(direction: 1 | -1) {
  if (!state.query.trim()) return
  const items = matches.value
  const match =
    direction === 1
      ? (items.find(item => item.number > props.tab.position.page) ?? items[0])
      : ([...items]
          .reverse()
          .find(item => item.number < props.tab.position.page) ?? items.at(-1))
  if (match) go(match.number)
}
async function fullscreen() {
  try {
    if (globalThis.document.fullscreenElement)
      await globalThis.document.exitFullscreen()
    else await root.value?.requestFullscreen()
  } catch {
    overlays.toast('当前窗口不支持全屏阅读', true)
  }
}
onMounted(() => window.addEventListener('mirai:find', find))
onActivated(() => window.addEventListener('mirai:find', find))
onDeactivated(() => window.removeEventListener('mirai:find', find))
onBeforeUnmount(() => window.removeEventListener('mirai:find', find))
</script>

<template>
  <PdfFileView
    v-if="document.assetId"
    :document="document"
    :tab="tab"
  />
  <div
    v-else
    ref="root"
    class="pdf-view bg-canvas relative flex h-full flex-col"
    :style="{
      '--document-search-offset': searching
        ? `${(searchBar?.height ?? 0) + 8}px`
        : '0px',
    }"
  >
    <AppToolbar label="PDF 工具栏">
      <IconButton
        icon="lucide:panel-left"
        label="切换页面导航"
        :active="navigation !== 'hidden'"
        @click="navigation = navigation === 'hidden' ? 'thumbnails' : 'hidden'"
      />
      <ToolbarSeparator /><IconButton
        icon="lucide:chevron-left"
        label="上一页"
        :disabled="tab.position.page <= 1"
        @click="go(tab.position.page - 1)"
      />
      <div
        class="page-control text-muted [&>input]:border-line [&>input]:bg-surface flex items-center gap-[7px] text-xs whitespace-nowrap [&_input::-webkit-inner-spin-button]:appearance-none [&>input]:h-6 [&>input]:w-[31px] [&>input]:appearance-none [&>input]:rounded [&>input]:border [&>input]:text-center"
      >
        <input
          aria-label="PDF 页码"
          type="number"
          :value="tab.position.page"
          min="1"
          :max="examplePages.length"
          @change="go(Number(($event.target as HTMLInputElement).value))"
        /><span>/ {{ examplePages.length }}</span>
      </div>
      <IconButton
        icon="lucide:chevron-right"
        label="下一页"
        :disabled="tab.position.page >= examplePages.length"
        @click="go(tab.position.page + 1)"
      />
      <ToolbarSeparator /><IconButton
        icon="lucide:minus"
        label="缩小"
        @click="zoom(tab.position.zoom - 10)"
      />
      <button
        class="zoom-value text-secondary min-w-[43px] text-xs"
        title="重置为 100%"
        @click="zoom(100)"
      >
        {{ tab.position.zoom }}%</button
      ><IconButton
        icon="lucide:plus"
        label="放大"
        @click="zoom(tab.position.zoom + 10)"
      />
      <ToolbarSeparator /><IconButton
        icon="lucide:move-horizontal"
        label="适合宽度"
        @click="fit()"
      /><IconButton
        icon="lucide:scan"
        label="适合页面"
        @click="fit(true)"
      />
      <IconButton
        icon="lucide:rotate-cw"
        label="顺时针旋转"
        @click="tab.position.rotation = (tab.position.rotation + 90) % 360"
      />
      <span class="flex-1" /><span
        class="sample-label text-muted mr-1 text-[11px] whitespace-nowrap"
        >示例 PDF</span
      ><IconButton
        icon="lucide:search"
        label="搜索 PDF (Ctrl+F)"
        @click="find"
      /><IconButton
        icon="lucide:maximize"
        label="全屏阅读"
        @click="fullscreen"
      />
    </AppToolbar>
    <DocumentSearchBar
      v-if="searching"
      ref="searchBar"
      v-model:query="query"
      :total="query.trim() ? matches.length : 0"
      :current="0"
      :status-text="query.trim() ? `${matches.length} 页匹配` : '输入关键词'"
      :show-options="false"
      label="搜索 PDF 内容"
      @next="search(1)"
      @previous="search(-1)"
      @close="searching = false"
    />
    <div class="pdf-body relative flex min-h-0 flex-1">
      <PdfNavigationPanel
        v-if="navigation !== 'hidden'"
        v-model:width="navigationWidth"
        :pages="examplePages.length"
        @close="navigation = 'hidden'"
      >
        <template #default="{ width }">
          <div
            class="thumbnails grid justify-center gap-4 overflow-y-auto px-2.5 pt-4 pb-6"
          >
            <button
              v-for="item in matches"
              :key="item.number"
              class="thumbnail group text-muted [&.selected]:text-accent flex flex-col items-center gap-2 text-[11px]"
              :class="{ selected: tab.position.page === item.number }"
              :aria-label="`第 ${item.number} 页`"
              :aria-current="
                tab.position.page === item.number ? 'page' : undefined
              "
              @click="go(item.number)"
            >
              <div
                class="thumbnail-paper group-[.selected]:border-accent relative border-2 border-transparent shadow-sm"
                :style="{
                  width: `${595 * thumbnailScale(width) + 4}px`,
                  height: `${842 * thumbnailScale(width) + 4}px`,
                }"
              >
                <PdfPage
                  :page="item.number"
                  :style="{
                    transform: `scale(${thumbnailScale(width)})`,
                    transformOrigin: 'top left',
                  }"
                />
              </div>
              <span>{{ item.number }}</span>
            </button>
          </div>
        </template>
      </PdfNavigationPanel>
      <PdfPagesViewport
        ref="viewport"
        :sizes="pageSizes"
        :position="tab.position"
        @position="position"
      >
        <template #default="{ page }">
          <div class="relative size-full overflow-hidden">
            <div
              class="absolute top-1/2 left-1/2 h-[842px] w-[595px] origin-center"
              :style="{
                transform: `translate(-50%, -50%) scale(${scale}) rotate(${tab.position.rotation}deg)`,
              }"
            >
              <PdfPage :page="page" />
            </div>
          </div>
        </template>
      </PdfPagesViewport>
      <DocumentOutline
        :items="outline"
        :active-id="String(tab.position.page)"
        @select="go(Number($event))"
      />
    </div>
  </div>
</template>
