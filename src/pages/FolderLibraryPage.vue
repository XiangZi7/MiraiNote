<script setup lang="ts">
import { computed, shallowRef, onActivated } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useDocumentsStore } from '@/stores/documents'
import { useFoldersStore } from '@/stores/folders'
import { useOverlaysStore } from '@/stores/overlays'
import { useDocumentActions } from '@/composables/useDocumentActions'
import {
  documentTypes,
  formatSize,
  formatDate,
  groupEntries,
} from '@/utils/documents'
import { AppIcon, AppButton, IconButton } from '@/components/ui'
defineOptions({ name: 'FolderLibraryPage' })
const props = defineProps<{ folderPath: string }>()

const workspace = useWorkspaceStore()
const documents = useDocumentsStore()
const folders = useFoldersStore()
const overlays = useOverlaysStore()
const actions = useDocumentActions()
const query = shallowRef('')
const path = computed(() => props.folderPath)
const folder = computed(() => folders.get(path.value))
const notice = computed(() => folders.notices[path.value])
const scanning = computed(() => folders.scanning === path.value)
const entries = computed(() => folders.entries[path.value] ?? [])
const opened = computed(
  () =>
    new Set(
      documents.documents
        .map(doc => doc.sourcePath?.toLowerCase())
        .filter((value): value is string => !!value)
    )
)
const groups = computed(() => groupEntries(entries.value, query.value))
const total = computed(() =>
  groups.value.reduce((count, group) => count + group.items.length, 0)
)
onActivated(() => {
  if (!folders.entries[path.value] && folders.scanning !== path.value) void actions.refreshFolder(path.value)
})
</script>

<template>
  <section
    class="bg-surface flex h-full flex-col overflow-hidden"
    :aria-label="folder?.name ?? '文件夹'"
  >
    <div
      class="border-line bg-canvas flex h-9 shrink-0 items-center gap-2 border-b px-4"
    >
      <IconButton
        icon="lucide:arrow-left"
        label="返回打开的文档"
        @click="workspace.library = null"
      /><span class="text-muted text-xs">文件夹</span
      ><AppIcon
        name="lucide:chevron-right"
        :size="12"
        class="text-faint"
      /><span class="text-secondary truncate text-xs">{{
        folder?.name ?? path
      }}</span>
    </div>
    <div class="min-h-0 flex-1 overflow-auto px-12 py-10 max-[1050px]:px-7">
      <div class="mx-auto max-w-[1000px]">
        <div class="mb-8 flex items-start justify-between gap-4">
          <div class="min-w-0">
            <h1 class="truncate text-[25px] font-semibold tracking-tight">
              {{ folder?.name ?? '文件夹' }}
            </h1>
            <p class="text-muted mt-2 truncate text-xs">{{ path }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <AppButton
              variant="ghost"
              :disabled="scanning"
              @click="actions.refreshFolder(path)"
              ><AppIcon
                name="lucide:refresh-cw"
                :size="15"
              />重新扫描</AppButton
            ><AppButton
              :disabled="!entries.length || scanning"
              @click="actions.importFolder(path)"
              ><AppIcon
                name="lucide:import"
                :size="15"
              />全部导入</AppButton
            >
          </div>
        </div>
        <div class="mb-5 flex items-center justify-between">
          <span class="text-muted text-xs">{{
            scanning ? '正在扫描文件夹…' : `${total} 份文档`
          }}</span>
          <div class="text-muted flex items-center gap-2">
            <AppIcon
              name="lucide:search"
              :size="15"
            /><input
              v-model="query"
              aria-label="筛选文件夹中的文档"
              placeholder="筛选文档…"
              class="w-[160px] border-0 bg-transparent py-1 text-xs outline-none"
            />
          </div>
        </div>
        <p
          v-if="notice?.truncated || notice?.oversized"
          class="border-line text-muted mb-5 rounded-lg border border-dashed px-4 py-3 text-[11px]"
        >
          <template v-if="notice?.truncated"
            >文件夹很大，这里只列出前 2000 份文档。</template
          ><template v-if="notice?.oversized"
            >已跳过 {{ notice.oversized }} 份超过 50 MB 的文件。</template
          >
        </p>
        <template
          v-for="group in groups"
          :key="group.dir"
        >
          <div
            class="text-muted flex items-center gap-2 pt-4 pb-2 text-[11px] first:pt-0"
          >
            <AppIcon
              :name="group.dir ? 'lucide:folder' : 'lucide:folder-open'"
              :size="13"
            /><span class="truncate">{{ group.dir || '根目录' }}</span
            ><span class="text-faint">{{ group.items.length }}</span>
          </div>
          <button
            v-for="entry in group.items"
            :key="entry.path"
            class="group border-line/70 hover:bg-canvas grid w-full grid-cols-[minmax(180px,1fr)_110px_150px] items-center gap-3 border-b px-3 py-3 text-left transition-colors max-[900px]:grid-cols-[1fr_70px]"
            @click="actions.importEntries([entry], folder?.name)"
          >
            <span class="flex min-w-0 items-center gap-3.5">
              <span
                class="border-line bg-canvas text-secondary grid h-9 w-8 shrink-0 place-items-center rounded-md border"
                ><AppIcon
                  :name="documentTypes[entry.kind].icon"
                  :size="18" /></span
              ><span class="min-w-0"
                ><span class="block truncate text-[13px] font-medium">{{
                  entry.name
                }}</span
                ><span class="text-muted mt-1 block truncate text-[11px]">{{
                  opened.has(entry.path.toLowerCase())
                    ? '已在工作区'
                    : '点击载入到工作区'
                }}</span></span
              ></span
            >
            <span class="text-secondary text-xs">
              <span class="block">{{ documentTypes[entry.kind].label }}</span
              ><span class="text-muted mt-1 block text-[11px]">{{
                formatSize(entry.size)
              }}</span>
            </span>
            <span class="text-muted text-xs max-[900px]:hidden">{{
              formatDate(new Date(entry.modifiedAt).toISOString())
            }}</span>
          </button>
        </template>
        <div
          v-if="!total"
          class="text-muted flex flex-col items-center py-24"
        >
          <AppIcon
            name="lucide:folder-open"
            :size="30"
            class="text-faint mb-5"
          />
          <p class="text-sm">
            {{
              scanning
                ? '正在扫描文件夹…'
                : query
                  ? '没有找到匹配的文档'
                  : '这个文件夹里没有可打开的文档'
            }}
          </p>
          <p class="mt-2 text-xs">
            {{
              query
                ? '试试文件名中的其他关键词。'
                : '支持 Markdown、PDF 和 Word（.docx）。'
            }}
          </p>
        </div>
        <div class="text-muted mt-8 flex items-center gap-3 text-[11px]">
          <button
            class="hover:text-accent"
            @click="actions.reveal(path)"
          >
            在资源管理器中显示
          </button>
          <span class="text-faint">·</span>
          <button
            class="hover:text-accent"
            @click="
              overlays.menu($event, folder ? actions.folderMenu(folder) : [])
            "
          >
            更多操作
          </button>
        </div>
      </div>
    </div>
  </section>
</template>
