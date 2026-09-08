<script setup lang="ts">
import { useWorkspaceStore } from '@/stores/workspace'
import { useSettingsStore } from '@/stores/settings'
import { useOverlaysStore } from '@/stores/overlays'
import { useDocumentActions } from '@/composables/useDocumentActions'
import AppIcon from '@/components/ui/AppIcon.vue'
import type { LibraryFilter } from '@/types/workspace'

const workspace = useWorkspaceStore()
const settings = useSettingsStore()
const overlays = useOverlaysStore()
const actions = useDocumentActions()
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
      icon: 'lucide:folder-open',
      action: actions.openFiles,
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
    <nav aria-label="文档导航">
      <button
        class="nav-item hover:bg-hover [&.selected]:bg-selected [&>svg]:text-secondary my-px flex h-9 w-full items-center gap-3 rounded-md px-[11px] text-left text-[13px] whitespace-nowrap transition-colors duration-150 group-[.collapsed]:justify-center group-[.collapsed]:px-0 group-[.collapsed]:[&>span:not(.nav-icon)]:hidden"
        :class="{ selected: workspace.library === 'recent' }"
        title="最近打开"
        @click="workspace.library = 'recent'"
      >
        <AppIcon
          name="lucide:clock-3"
          :size="18"
        /><span>最近打开</span>
      </button>
      <button
        class="nav-item hover:bg-hover [&.selected]:bg-selected [&>svg]:text-secondary my-px flex h-9 w-full items-center gap-3 rounded-md px-[11px] text-left text-[13px] whitespace-nowrap transition-colors duration-150 group-[.collapsed]:justify-center group-[.collapsed]:px-0 group-[.collapsed]:[&>span:not(.nav-icon)]:hidden"
        :class="{ selected: workspace.library === 'favorites' }"
        title="收藏"
        @click="workspace.library = 'favorites'"
      >
        <AppIcon
          name="lucide:star"
          :size="18"
        /><span>收藏</span>
      </button>
      <div
        class="section-label text-muted px-[9px] pt-[23px] pb-[5px] text-xs group-[.collapsed]:h-[25px] group-[.collapsed]:p-0 group-[.collapsed]:text-[0px]"
      >
        工作区
      </div>
      <button
        v-for="item in sections"
        :key="item.filter"
        class="nav-item hover:bg-hover [&.selected]:bg-selected [&>svg]:text-secondary my-px flex h-9 w-full items-center gap-3 rounded-md px-[11px] text-left text-[13px] whitespace-nowrap transition-colors duration-150 group-[.collapsed]:justify-center group-[.collapsed]:px-0 group-[.collapsed]:[&>span:not(.nav-icon)]:hidden"
        :class="{
          selected:
            workspace.library === item.filter ||
            (workspace.library === null && item.filter === 'all'),
        }"
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
        class="nav-item hover:bg-hover [&.selected]:bg-selected [&>svg]:text-secondary my-px flex h-9 w-full items-center gap-3 rounded-md px-[11px] text-left text-[13px] whitespace-nowrap transition-colors duration-150 group-[.collapsed]:justify-center group-[.collapsed]:px-0 group-[.collapsed]:[&>span:not(.nav-icon)]:hidden"
        title="设置"
        @click="overlays.state.settings = true"
      >
        <AppIcon
          name="lucide:settings"
          :size="18"
        /><span>设置</span>
      </button>
      <button
        class="nav-item hover:bg-hover [&.selected]:bg-selected [&>svg]:text-secondary my-px flex h-9 w-full items-center gap-3 rounded-md px-[11px] text-left text-[13px] whitespace-nowrap transition-colors duration-150 group-[.collapsed]:justify-center group-[.collapsed]:px-0 group-[.collapsed]:[&>span:not(.nav-icon)]:hidden"
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
