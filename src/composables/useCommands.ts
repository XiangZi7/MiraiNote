import { useDocumentActions } from './useDocumentActions'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSettingsStore } from '@/stores/settings'
import { useOverlaysStore } from '@/stores/overlays'
import type { MenuItem } from '@/types/workspace'

export function useCommands(): MenuItem[] {
  const actions = useDocumentActions(),
    workspace = useWorkspaceStore(),
    settings = useSettingsStore(),
    overlays = useOverlaysStore()
  return [
    {
      label: '新建 Markdown',
      icon: 'lucide:file-plus-2',
      shortcut: 'Ctrl N',
      action: actions.create,
    },
    {
      label: '打开文档',
      icon: 'lucide:folder-open',
      shortcut: 'Ctrl O',
      action: actions.openFiles,
    },
    {
      label: '搜索文档',
      icon: 'lucide:search',
      shortcut: 'Ctrl K',
      action: () => {
        overlays.state.palette = 'search'
      },
    },
    {
      label: '保存工作区草稿',
      icon: 'lucide:save',
      shortcut: 'Ctrl S',
      action: actions.save,
    },
    {
      label: '导出文档 / 另存为',
      icon: 'lucide:share',
      shortcut: 'Ctrl ⇧ S',
      action: actions.exportDocument,
    },
    {
      label: '切换 Sidebar',
      icon: 'lucide:panel-left',
      shortcut: 'Ctrl ⇧ B',
      action: () => {
        settings.settings.sidebarCollapsed = !settings.settings.sidebarCollapsed
      },
    },
    {
      label: '切换文件信息 Inspector',
      icon: 'lucide:panel-right',
      action: () => {
        overlays.state.inspector = !overlays.state.inspector
      },
    },
    {
      label: '打开 AI 助手',
      icon: 'lucide:sparkles',
      action: () => {
        overlays.state.ai = true
      },
    },
    {
      label: '切换深色 / 浅色主题',
      icon: 'lucide:moon',
      action: () => {
        settings.settings.theme =
          globalThis.document.documentElement.dataset.theme === 'dark'
            ? 'light'
            : 'dark'
      },
    },
    {
      label: '关闭当前标签页',
      icon: 'lucide:x',
      shortcut: 'Ctrl W',
      action: () => {
        if (workspace.activeTab)
          workspace.close(workspace.activePane.id, workspace.activeTab.id)
      },
    },
    {
      label: '关闭其他标签页',
      icon: 'lucide:copy-x',
      action: () => {
        for (const tab of [...workspace.activePane.tabs])
          if (!tab.pinned && tab.id !== workspace.activeTab?.id)
            workspace.close(workspace.activePane.id, tab.id)
      },
    },
    {
      label: '恢复关闭的标签页',
      icon: 'lucide:rotate-ccw',
      shortcut: 'Ctrl ⇧ T',
      action: workspace.restore,
    },
    {
      label: '切换阅读模式',
      icon: 'lucide:book-open',
      action: () => {
        if (workspace.activeTab) workspace.activeTab.position.mode = 'preview'
      },
    },
    {
      label: '切换编辑模式',
      icon: 'lucide:pencil',
      action: () => {
        if (workspace.activeTab) workspace.activeTab.position.mode = 'edit'
      },
    },
    {
      label: '切换 Markdown 分屏',
      icon: 'lucide:columns-2',
      action: () => {
        if (workspace.activeTab) workspace.activeTab.position.mode = 'split'
      },
    },
    {
      label: '向右分屏打开文档',
      icon: 'lucide:panel-right-open',
      action: () => {
        if (workspace.activeTab)
          workspace.splitTab(
            workspace.activePane.id,
            workspace.activeTab.id,
            workspace.activePane.id,
            'right',
            true
          )
      },
    },
    {
      label: '向下分屏打开文档',
      icon: 'lucide:panel-bottom-open',
      action: () => {
        if (workspace.activeTab)
          workspace.splitTab(
            workspace.activePane.id,
            workspace.activeTab.id,
            workspace.activePane.id,
            'bottom',
            true
          )
      },
    },
  ]
}
