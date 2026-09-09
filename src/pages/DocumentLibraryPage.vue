<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useDocumentsStore } from '@/stores/documents'
import { useFoldersStore } from '@/stores/folders'
import { useOverlaysStore } from '@/stores/overlays'
import { useDocumentActions } from '@/composables/useDocumentActions'
import { fileSystemApi } from '@/api/ipc/filesystem'
import { documentTypes, formatSize, formatDate } from '@/utils/documents'
import { AppIcon, AppButton, IconButton } from '@/components/ui'
import type { LibrarySection } from '@/types/workspace'
defineOptions({ name: 'DocumentLibraryPage' })
const props = defineProps<{ section: LibrarySection }>()
const workspace = useWorkspaceStore()
const documents = useDocumentsStore()
const folders = useFoldersStore()
const overlays = useOverlaysStore()
const actions = useDocumentActions()
const query = shallowRef('')
const titles: Record<LibrarySection, string> = {
  all: '全部文档',
  recent: '最近打开',
  favorites: '收藏',
  markdown: 'Markdown',
  pdf: 'PDF',
  word: 'Word',
}
const section = computed(() => props.section)
const title = computed(() => titles[section.value])
const filtered = computed(() =>
  documents
    .filtered(section.value)
    .filter(doc =>
      `${doc.name} ${doc.tags.join(' ')}`
        .toLowerCase()
        .includes(query.value.toLowerCase())
    )
)
const inWorkspace = computed(
  () =>
    new Set(
      documents.documents
        .map(doc => doc.sourcePath?.toLowerCase())
        .filter((value): value is string => !!value)
    )
)
// 已经从工作区移除、但最近打开过的磁盘文件，仍然可以一键载回。
const detached = computed(() =>
  section.value === 'recent'
    ? folders.recent.filter(
        item => !inWorkspace.value.has(item.path.toLowerCase())
      )
    : []
)
</script>

<template>
  <section
    class="bg-surface flex h-full flex-col overflow-hidden"
    :aria-label="title"
  >
    <div
      class="border-line bg-canvas flex h-9 shrink-0 items-center gap-2 border-b px-4"
    >
      <IconButton
        icon="lucide:arrow-left"
        label="返回打开的文档"
        @click="workspace.library = null"
      /><span class="text-muted text-xs">文档工作区</span
      ><AppIcon
        name="lucide:chevron-right"
        :size="12"
        class="text-faint"
      /><span class="text-secondary text-xs">{{ title }}</span>
    </div>
    <div class="min-h-0 flex-1 overflow-auto px-12 py-10 max-[1050px]:px-7">
      <div class="mx-auto max-w-[1000px]">
        <div class="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 class="text-[25px] font-semibold tracking-tight">
              {{ title }}
            </h1>
            <p class="text-muted mt-2 text-xs">
              {{
                section === 'favorites'
                  ? '留住值得反复阅读的内容。'
                  : section === 'recent'
                    ? '接着上一次的思考，继续向前。'
                    : '让文档井然有序，让思考自由发生。'
              }}
            </p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <AppButton
              variant="ghost"
              @click="actions.openFolder()"
              ><AppIcon
                name="lucide:folder-open"
                :size="15"
              />打开文件夹</AppButton
            ><AppButton @click="actions.create"
              ><AppIcon
                name="lucide:plus"
                :size="15"
              />新建文档</AppButton
            >
          </div>
        </div>
        <template v-if="section === 'recent' && folders.folders.length">
          <div class="text-muted mb-2.5 text-[11px]">最近打开的文件夹</div>
          <div class="mb-8 flex flex-wrap gap-2">
            <button
              v-for="folder in folders.folders"
              :key="folder.path"
              class="border-line bg-canvas hover:bg-hover text-secondary flex max-w-[260px] items-center gap-2 rounded-md border px-3 py-2 text-xs transition-colors"
              :title="folder.path"
              @click="actions.showFolder(folder.path)"
              @contextmenu.prevent.stop="
                overlays.menu($event, actions.folderMenu(folder))
              "
            >
              <AppIcon
                name="lucide:folder"
                :size="15"
              /><span class="truncate">{{ folder.name }}</span>
            </button>
          </div>
        </template>
        <div class="mb-5 flex items-center justify-between">
          <span class="text-muted text-xs">{{ filtered.length }} 份文档</span>
          <div class="text-muted flex items-center gap-2">
            <AppIcon
              name="lucide:search"
              :size="15"
            /><input
              v-model="query"
              aria-label="筛选文档"
              placeholder="筛选文档…"
              class="w-[160px] border-0 bg-transparent py-1 text-xs outline-none"
            />
          </div>
        </div>
        <div
          class="border-line text-muted grid grid-cols-[minmax(180px,1fr)_110px_150px_38px] gap-3 border-b px-3 pb-3 text-[11px] max-[900px]:grid-cols-[1fr_70px_32px]"
        >
          <span>名称</span><span>类型 / 大小</span
          ><span class="max-[900px]:hidden">修改时间</span><span />
        </div>
        <div
          v-for="doc in filtered"
          :key="doc.id"
          class="group border-line/70 hover:bg-canvas grid grid-cols-[minmax(180px,1fr)_110px_150px_38px] items-center gap-3 border-b px-3 py-4 transition-colors max-[900px]:grid-cols-[1fr_70px_32px]"
          @contextmenu.prevent.stop="
            overlays.menu($event, actions.documentMenu(doc))
          "
        >
          <button
            class="flex min-w-0 items-center gap-3.5 text-left"
            @click="workspace.open(doc.id)"
          >
            <span
              class="border-line bg-canvas text-secondary grid h-11 w-9 shrink-0 place-items-center rounded-md border"
              ><AppIcon
                :name="documentTypes[doc.kind].icon"
                :size="21" /></span
            ><span class="min-w-0"
              ><span class="block truncate text-[13px] font-medium">{{
                doc.name
              }}</span
              ><span class="text-muted mt-1 block truncate text-[11px]"
                >{{ doc.tags.length ? doc.tags.join(' · ') : doc.path
                }}<span v-if="doc.source === 'example'"> · 示例</span></span
              ></span
            >
          </button>
          <div class="text-secondary text-xs">
            <span class="block">{{ documentTypes[doc.kind].label }}</span
            ><span class="text-muted mt-1 block text-[11px]">{{
              formatSize(doc.size)
            }}</span>
          </div>
          <span class="text-muted text-xs max-[900px]:hidden">{{
            formatDate(doc.modifiedAt)
          }}</span
          ><IconButton
            icon="lucide:star"
            :label="doc.favorite ? '取消收藏' : '收藏文档'"
            :class="
              doc.favorite
                ? '[&_svg]:fill-accent/20 [&_svg]:text-accent'
                : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'
            "
            @click="doc.favorite = !doc.favorite"
          />
        </div>
        <div
          v-if="!filtered.length"
          class="text-muted flex flex-col items-center py-24"
        >
          <AppIcon
            :name="section === 'favorites' ? 'lucide:star' : 'lucide:files'"
            :size="30"
            class="text-faint mb-5"
          />
          <p class="text-sm">
            {{ query ? '没有找到匹配的文档' : '这里还没有文档' }}
          </p>
          <p class="mt-2 text-xs">
            {{
              query
                ? '试试文件名或标签中的其他关键词。'
                : '打开或收藏一份文档，它就会出现在这里。'
            }}
          </p>
        </div>
        <template v-if="detached.length">
          <div class="text-muted mt-9 mb-2.5 text-[11px]">
            不在工作区的最近文件
          </div>
          <button
            v-for="item in detached"
            :key="item.path"
            class="border-line/70 hover:bg-canvas flex w-full items-center gap-3.5 border-b px-3 py-3 text-left transition-colors"
            :title="item.path"
            @click="actions.reopenFile(item.path)"
          >
            <span
              class="border-line bg-canvas text-secondary grid h-9 w-8 shrink-0 place-items-center rounded-md border"
              ><AppIcon
                :name="documentTypes[item.kind].icon"
                :size="18" /></span
            ><span class="min-w-0"
              ><span class="block truncate text-[13px] font-medium">{{
                item.name
              }}</span
              ><span class="text-muted mt-1 block truncate text-[11px]">{{
                item.path
              }}</span></span
            ><AppIcon
              name="lucide:rotate-ccw"
              :size="15"
              class="text-faint ml-auto shrink-0"
            />
          </button>
        </template>
        <div class="text-muted mt-8 flex items-center gap-3 text-[11px]">
          <AppIcon
            name="lucide:folder-open"
            :size="14"
          /><button
            class="hover:text-accent"
            @click="actions.openFiles"
          >
            导入文档
          </button>
          <span class="text-faint">·</span>
          <button
            class="hover:text-accent"
            @click="actions.importFolder()"
          >
            {{ fileSystemApi.isDesktop() ? '导入整个文件夹' : '导入文件夹' }}
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
