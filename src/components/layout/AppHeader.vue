<script setup lang="ts">
import { computed } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSettingsStore } from '@/stores/settings'
import { useOverlaysStore } from '@/stores/overlays'
import { useDocumentActions } from '@/composables/useDocumentActions'
import { windowApi } from '@/api/ipc'
import { documentTypes } from '@/utils/documents'
import AppIcon from '@/components/ui/AppIcon.vue'
import AppLogo from '@/components/ui/AppLogo.vue'
import IconButton from '@/components/ui/IconButton.vue'

const workspace = useWorkspaceStore()
const settings = useSettingsStore()
const overlays = useOverlaysStore()
const actions = useDocumentActions()
const icon = computed(() =>
  workspace.currentDocument
    ? documentTypes[workspace.currentDocument.kind].icon
    : 'lucide:files'
)
const desktop = windowApi.isDesktop()
async function windowAction(action: () => Promise<void>) {
  try {
    await action()
  } catch {
    overlays.toast('窗口操作失败，请重试', true)
  }
}
function more(event: MouseEvent) {
  overlays.menu(event, [
    {
      label: '新建 Markdown',
      icon: 'lucide:file-plus-2',
      shortcut: 'Ctrl N',
      action: actions.create,
    },
    {
      label: '打开文件…',
      icon: 'lucide:folder-open',
      shortcut: 'Ctrl O',
      action: actions.openFiles,
    },
    {
      label: '保存工作区草稿',
      icon: 'lucide:save',
      shortcut: 'Ctrl S',
      action: actions.save,
    },
    {
      label: '文件信息',
      icon: 'lucide:panel-right',
      divider: true,
      action: () => {
        overlays.state.inspector = !overlays.state.inspector
      },
    },
    {
      label: 'AI 助手',
      icon: 'lucide:sparkles',
      action: () => {
        overlays.state.ai = !overlays.state.ai
      },
    },
    {
      label: '命令面板',
      icon: 'lucide:terminal',
      shortcut: 'Ctrl ⇧ P',
      action: () => {
        overlays.state.palette = 'commands'
      },
    },
    {
      label: '设置',
      icon: 'lucide:settings-2',
      divider: true,
      action: () => {
        overlays.state.settings = true
      },
    },
  ])
}
</script>

<template>
  <header
    class="app-header border-line bg-canvas flex h-12 shrink-0 items-center border-b select-none"
    data-tauri-drag-region
  >
    <div
      class="brand bg-sidebar flex h-full shrink-0 items-center gap-[9px] px-3.5 font-semibold tracking-[-.25px]"
      :style="{ width: `${settings.sidebarSize}px` }"
      data-tauri-drag-region
    >
      <IconButton
        icon="lucide:panel-left"
        label="切换侧栏 (Ctrl+Shift+B)"
        @click="
          settings.settings.sidebarCollapsed =
            !settings.settings.sidebarCollapsed
        "
      />
      <div
        v-if="!settings.settings.sidebarCollapsed"
        class="flex min-w-0 items-center gap-2"
        data-tauri-drag-region
      >
        <AppLogo
          :size="22"
          data-tauri-drag-region
        />
        <span
          class="truncate"
          data-tauri-drag-region
          >MiraiNote</span
        >
      </div>
    </div>
    <div
      class="header-center [&>svg]:text-secondary flex h-full min-w-0 flex-1 items-center justify-center gap-2 pl-[95px] font-medium max-[1050px]:pl-0 [&>span]:truncate"
      data-tauri-drag-region
    >
      <AppIcon
        :name="icon"
        :size="16"
      />
      <span data-tauri-drag-region>{{
        workspace.library
          ? '文档工作区'
          : (workspace.currentDocument?.name ?? 'MiraiNote')
      }}</span>
      <span
        v-if="workspace.currentDocument?.dirty && !workspace.library"
        class="dirty-dot bg-muted size-[5px] shrink-0 rounded-full"
        title="未保存的修改"
      />
    </div>
    <div
      class="header-actions flex items-center gap-3 px-5 max-[1050px]:gap-1 max-[1050px]:px-2.5"
    >
      <IconButton
        icon="lucide:search"
        label="搜索文档 (Ctrl+K)"
        @click="overlays.state.palette = 'search'"
      />
      <IconButton
        icon="lucide:share"
        label="导出文档 (Ctrl+Shift+S)"
        :disabled="!workspace.currentDocument"
        @click="actions.exportDocument"
      />
      <IconButton
        icon="lucide:ellipsis"
        label="更多操作"
        @click="more"
      />
    </div>
    <div
      v-if="desktop"
      class="window-controls [&>button:hover]:bg-hover ml-1.5 flex h-full [&>button]:grid [&>button]:w-11 [&>button]:place-items-center"
    >
      <button
        aria-label="最小化"
        title="最小化"
        @click="windowAction(windowApi.minimize)"
      >
        <AppIcon
          name="lucide:minus"
          :size="14"
        />
      </button>
      <button
        aria-label="最大化或还原"
        title="最大化或还原"
        @click="windowAction(windowApi.toggleMaximize)"
      >
        <AppIcon
          name="lucide:square"
          :size="12"
        />
      </button>
      <button
        class="window-close hover:!bg-[#c42b36] hover:!text-white"
        aria-label="关闭窗口"
        title="关闭窗口"
        @click="windowAction(windowApi.close)"
      >
        <AppIcon
          name="lucide:x"
          :size="16"
        />
      </button>
    </div>
  </header>
</template>
