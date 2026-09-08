<script setup lang="ts">
import { AppToolbar, ToolbarSeparator } from '@/components/ui'
import {
  computed,
  reactive,
  toRefs,
  useTemplateRef,
  onMounted,
  onBeforeUnmount,
  nextTick,
} from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useOverlaysStore } from '@/stores/overlays'
import IconButton from '@/components/ui/IconButton.vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import PdfPage from './PdfPage.vue'
import PdfFileView from './PdfFileView.vue'
import { examplePages } from '../services/example-pages'
import type { DocumentRecord, DocumentTab } from '@/types/document'
const props = defineProps<{ document: DocumentRecord; tab: DocumentTab }>()
const workspace = useWorkspaceStore()
const overlays = useOverlaysStore()
// 响应式状态
const state = reactive({
  // 左侧导航方式
  navigation: 'thumbnails' as 'thumbnails' | 'outline' | 'hidden',
  // 当前文档查找栏
  searching: false,
  // 页内查询文本
  query: '',
})
const { navigation, searching, query } = toRefs(state)
const root = useTemplateRef('root')
const viewport = useTemplateRef('viewport')
const searchInput = useTemplateRef('search')
const scale = computed(() => props.tab.position.zoom / 100)
const rotated = computed(() => props.tab.position.rotation % 180 !== 0)
const matches = computed(() =>
  examplePages
    .map((page, index) => ({ page, number: index + 1 }))
    .filter(item =>
      JSON.stringify(item.page)
        .toLowerCase()
        .includes(state.query.toLowerCase())
    )
)
function go(page: number) {
  props.tab.position.page = Math.max(
    1,
    Math.min(examplePages.length, Math.round(page) || 1)
  )
  if (viewport.value) viewport.value.scrollTop = 0
}
function zoom(value: number) {
  props.tab.position.zoom = Math.min(200, Math.max(40, value))
}
function fit(page = false) {
  const el = viewport.value
  if (el)
    zoom(
      Math.floor(
        Math.min(
          (el.clientWidth - 70) / 595,
          page ? (el.clientHeight - 52) / 842 : 2
        ) * 100
      )
    )
}
async function find() {
  if (workspace.activeTab?.id !== props.tab.id) return
  state.searching = !state.searching
  await nextTick()
  searchInput.value?.focus()
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
    class="pdf-view bg-canvas flex h-full flex-col"
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
    <div
      v-if="searching"
      class="pdf-search border-line [&>span]:text-muted flex items-center gap-2.5 border-b px-5 py-2 [&>input]:flex-1 [&>input]:border-0 [&>input]:bg-transparent [&>input]:outline-none [&>span]:text-[11px]"
    >
      <AppIcon name="lucide:search" /><input
        ref="search"
        v-model="query"
        aria-label="搜索 PDF 内容"
        placeholder="查找文档内容…"
        @keydown.enter="matches[0] && go(matches[0].number)"
      /><span>{{ query ? `${matches.length} 页匹配` : '输入关键词' }}</span
      ><IconButton
        icon="lucide:x"
        label="关闭查找"
        @click="searching = false"
      />
    </div>
    <div class="pdf-body flex min-h-0 flex-1">
      <aside
        v-if="navigation !== 'hidden'"
        class="pdf-navigation border-line bg-inspector w-[156px] shrink-0 overflow-auto border-r"
        aria-label="PDF 页面导航"
      >
        <div
          class="navigation-modes bg-inspector sticky top-0 z-1 flex justify-center gap-3 p-3"
        >
          <IconButton
            icon="lucide:layout-grid"
            label="缩略图"
            :active="navigation === 'thumbnails'"
            @click="navigation = 'thumbnails'"
          /><IconButton
            icon="lucide:list-tree"
            label="目录"
            :active="navigation === 'outline'"
            @click="navigation = 'outline'"
          />
        </div>
        <div
          v-if="navigation === 'thumbnails'"
          class="thumbnails grid justify-center gap-4 px-2.5 pt-1 pb-6"
        >
          <button
            v-for="item in matches"
            :key="item.number"
            class="thumbnail group text-muted [&.selected]:text-accent flex flex-col items-center gap-2 text-[11px]"
            :class="{ selected: tab.position.page === item.number }"
            :aria-label="`第 ${item.number} 页`"
            @click="go(item.number)"
          >
            <div
              class="thumbnail-paper group-[.selected]:border-accent relative h-[147px] w-[104px] border-2 border-transparent shadow-[0_1px_5px_#17203415] [&_.pdf-page]:origin-top-left [&_.pdf-page]:scale-[.168]"
            >
              <PdfPage :page="item.number" />
            </div>
            <span>{{ item.number }}</span>
          </button>
        </div>
        <div
          v-else
          class="[&>button]:text-secondary [&>button:hover]:bg-selected [&>.selected]:bg-selected [&_span]:text-muted px-2.5 outline [&>button]:flex [&>button]:w-full [&>button]:justify-between [&>button]:rounded-[5px] [&>button]:px-2 [&>button]:py-2.5 [&>button]:text-xs"
        >
          <button
            v-for="item in matches"
            :key="item.number"
            :class="{ selected: tab.position.page === item.number }"
            @click="go(item.number)"
          >
            {{ item.page.section }}<span>{{ item.number }}</span>
          </button>
        </div>
      </aside>
      <div
        ref="viewport"
        class="pdf-viewport bg-sidebar min-w-0 flex-1 overflow-auto px-[35px] py-[26px]"
      >
        <div
          class="page-frame relative mx-auto shrink-0 bg-white shadow-[0_2px_12px_#18243718]"
          :style="{
            width: `${(rotated ? 842 : 595) * scale}px`,
            height: `${(rotated ? 595 : 842) * scale}px`,
          }"
        >
          <div
            class="scaled-page absolute top-1/2 left-1/2 h-[842px] w-[595px] origin-center"
            :style="{
              transform: `translate(-50%, -50%) scale(${scale}) rotate(${tab.position.rotation}deg)`,
            }"
          >
            <PdfPage :page="tab.position.page" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
