<script setup lang="ts">
import { useWorkspaceStore } from '@/stores/workspace'
import { useSettingsStore } from '@/stores/settings'
import { useOverlaysStore } from '@/stores/overlays'
import { useFoldersStore } from '@/stores/folders'
import { useDocumentActions } from '@/composables/useDocumentActions'
import { fileSystemApi } from '@/api/ipc/filesystem'
import AppIcon from '@/components/ui/AppIcon.vue'
import IconButton from '@/components/ui/IconButton.vue'
import type { LibraryFilter } from '@/types/workspace'

const workspace = useWorkspaceStore()
const settings = useSettingsStore()
const overlays = useOverlaysStore()
const folders = useFoldersStore()
const actions = useDocumentActions()
const navItem =
  'nav-item hover:bg-hover [&.selected]:bg-selected [&>svg]:text-secondary my-px flex h-9 w-full items-center gap-3 rounded-md px-[11px] text-left text-[13px] whitespace-nowrap transition-colors duration-150 group-[.collapsed]:justify-center group-[.collapsed]:px-0 group-[.collapsed]:[&>span:not(.nav-icon)]:hidden'
const sections: {
  label: string
  icon: string
  filter: LibraryFilter
  badge?: string
}[] = [
  { label: '全部文档', icon: 'lucide:files', filter: 'all' },
  { label: 'Markdown', icon: 'lucide:code-xml', filter: 'markdown' },
  { label: 'PDF', icon: 'lucide:file-text', filter: 'pdf', badge: 'pdf' },
  { label: 'Word', icon: 'lucide:file-type-2', filter: 'word', badge: 'word' },
]
function selector(event: MouseEvent) {
  overlays.menu(event, [
    {
      label: '示例工作区',
      icon: 'lucide:check',
      action: () => {
        workspace.library = 'all'
      },
    },
    {
      label: '新建 Markdown',
      icon: 'lucide:file-plus-2',
      divider: true,
      shortcut: 'Ctrl N',
      action: actions.create,
    },
    {
      label: '导入文档…',
      icon: 'lucide:file-input',
      shortcut: 'Ctrl O',
      action: actions.openFiles,
    },
    {
      label: '打开文件夹…',
      icon: 'lucide:folder-open',
      shortcut: 'Ctrl ⇧ O',
      action: () => actions.openFolder(),
    },
    {
      label: '导入整个文件夹…',
      icon: 'lucide:import',
      action: () => actions.importFolder(),
    },
  ])
}
</script>

<template>
  <aside
    class="sidebar group bg-sidebar flex min-h-0 shrink-0 flex-col px-3 pt-2 pb-3.5 select-none [&.collapsed]:px-2"
    :class="{ collapsed: settings.settings.sidebarCollapsed }"
    :style="{ width: `${settings.sidebarSize}px` }"
    aria-label="侧栏"
  >
    <button
      class="nav-item hover:bg-hover [&.selected]:bg-selected [&>svg]:text-secondary workspace-selector bg-selected my-px mb-0.5 flex h-9 w-full items-center gap-3 rounded-md px-[11px] text-left text-[13px] font-medium whitespace-nowrap transition-colors duration-150 group-[.collapsed]:justify-center group-[.collapsed]:px-0 group-[.collapsed]:[&>span:not(.nav-icon)]:hidden"
      title="选择工作区"
      @click="selector"
    >
      <AppIcon
        name="lucide:file"
        :size="18"
      /><span>文档</span
      ><AppIcon
        name="lucide:chevron-down"
        :size="13"
        class="trailing ml-auto group-[.collapsed]:hidden"
      />
    </button>
    <nav
      class="min-h-0 overflow-y-auto"
      aria-label="文档导航"
    >
      <button
        :class="[navItem, { selected: workspace.library === 'recent' }]"
        title="最近打开"
        @click="workspace.library = 'recent'"
      >
        <AppIcon
          name="lucide:clock-3"
          :size="18"
        /><span>最近打开</span>
      </button>
      <button
        :class="[navItem, { selected: workspace.library === 'favorites' }]"
        title="收藏"
        @click="workspace.library = 'favorites'"
      >
        <AppIcon
          name="lucide:star"
          :size="18"
        /><span>收藏</span>
      </button>
      <template v-if="fileSystemApi.isDesktop() || folders.folders.length">
        <div
          class="section-label text-muted flex items-center justify-between px-[9px] pt-[23px] pb-[5px] text-xs group-[.collapsed]:h-[25px] group-[.collapsed]:p-0 group-[.collapsed]:text-[0px]"
        >
          <span>文件夹</span
          ><IconButton
            icon="lucide:folder-plus"
            label="打开文件夹 (Ctrl+Shift+O)"
            class="-my-1 group-[.collapsed]:hidden"
            @click="actions.openFolder()"
          />
        </div>
        <button
          v-for="folder in folders.folders"
          :key="folder.path"
          :class="[
            navItem,
            { selected: workspace.libraryFolder === folder.path },
          ]"
          :title="folder.path"
          @click="actions.showFolder(folder.path)"
          @contextmenu.prevent.stop="
            overlays.menu($event, actions.folderMenu(folder))
          "
        >
          <AppIcon
            :name="
              folders.scanning === folder.path
                ? 'lucide:loader-circle'
                : 'lucide:folder'
            "
            :size="18"
            :class="{ 'animate-spin': folders.scanning === folder.path }"
          /><span class="truncate">{{ folder.name }}</span>
        </button>
        <button
          v-if="!folders.folders.length"
          :class="navItem"
          title="打开文件夹，按需阅读其中的文档"
          @click="actions.openFolder()"
        >
          <AppIcon
            name="lucide:folder-plus"
            :size="18"
          /><span class="text-muted">打开文件夹…</span>
        </button>
      </template>
      <div
        class="section-label text-muted px-[9px] pt-[23px] pb-[5px] text-xs group-[.collapsed]:h-[25px] group-[.collapsed]:p-0 group-[.collapsed]:text-[0px]"
      >
        工作区
      </div>
      <button
        v-for="item in sections"
        :key="item.filter"
        :class="[
          navItem,
          {
            selected:
              workspace.library === item.filter ||
              (workspace.library === null && item.filter === 'all'),
          },
        ]"
        :title="item.label"
        @click="workspace.library = item.filter"
      >
        <span
          class="nav-icon"
          :class="
            item.filter !== 'all'
              ? 'type-icon from-line to-sidebar text-secondary -mx-0.5 grid h-[26px] w-[22px] place-items-center rounded-[5px] bg-linear-to-br shadow-sm group-[.collapsed]:m-0'
              : 'text-secondary'
          "
          ><AppIcon
            :name="item.icon"
            :size="17" /></span
        ><span>{{ item.label }}</span>
      </button>
    </nav>
    <div class="sidebar-bottom mt-auto pt-[30px]">
      <button
        :class="navItem"
        title="设置"
        @click="overlays.state.settings = true"
      >
        <AppIcon
          name="lucide:settings"
          :size="18"
        /><span>设置</span>
      </button>
      <button
        :class="navItem"
        title="帮助"
        @click="overlays.state.help = true"
      >
        <AppIcon
          name="lucide:circle-help"
          :size="18"
        /><span>帮助</span>
      </button>
    </div>
  </aside>
</template>
