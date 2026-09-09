import { onBeforeUnmount, onMounted, watch } from 'vue'
import { useDebounceFn } from '@vueuse/core'
import { useDocumentsStore } from '@/stores/documents'
import { useWorkspaceStore } from '@/stores/workspace'
import { useSettingsStore } from '@/stores/settings'
import { useOverlaysStore } from '@/stores/overlays'
import { useFoldersStore } from '@/stores/folders'
import { useDocumentActions } from './useDocumentActions'
import { useDesktopLifecycle } from './useDesktopLifecycle'
import { useLaunchFiles } from './useLaunchFiles'

export function useWorkspaceLifecycle() {
  const documents = useDocumentsStore(),
    workspace = useWorkspaceStore(),
    settings = useSettingsStore(),
    overlays = useOverlaysStore(),
    folders = useFoldersStore()
  const actions = useDocumentActions()
  let stopped = false
  let storageError = false
  let persisting = false
  function persist() {
    persisting = true
    try {
      if (settings.settings.autoSave)
        for (const doc of documents.documents)
          if (doc.dirty) documents.save(doc.id, true)
      documents.persist()
      workspace.persist()
      settings.persist()
      folders.persist()
      storageError = false
    } catch {
      if (!storageError)
        overlays.toast('工作区保存失败，请导出正在编辑的文档。', true)
      storageError = true
    } finally {
      persisting = false
    }
    return !storageError
  }
  useDesktopLifecycle(persist)
  useLaunchFiles()
  const schedule = useDebounceFn(
    () => {
      if (!stopped) persist()
    },
    650,
    { maxWait: 3000 }
  )
  const stop = watch(
    [
      () => documents.documents,
      () => workspace.root,
      () => workspace.activePaneId,
      () => settings.settings,
      () => folders.folders,
      () => folders.recent,
    ],
    () => {
      if (!persisting) void schedule()
    },
    { deep: true, flush: 'sync' }
  )
  function keydown(event: KeyboardEvent) {
    if (!(event.ctrlKey || event.metaKey) || event.altKey) return
    const key = event.key.toLowerCase()
    if (
      overlays.state.palette ||
      overlays.state.settings ||
      overlays.state.help ||
      overlays.state.prompt
    )
      return
    const shortcuts: Record<string, () => void | Promise<void>> = {
      n: actions.create,
      o: actions.openFiles,
      s: event.shiftKey ? actions.exportDocument : actions.save,
      w: () => {
        if (workspace.activeTab)
          workspace.close(workspace.activePane.id, workspace.activeTab.id)
      },
      k: () => {
        overlays.state.palette = 'search'
      },
      f: () => {
        window.dispatchEvent(new CustomEvent('mirai:find'))
      },
      tab: () => workspace.cycle(event.shiftKey),
    }
    const action =
      event.shiftKey && key === 't'
        ? workspace.restore
        : event.shiftKey && key === 'o'
          ? () => actions.openFolder()
          : event.shiftKey && key === 'p'
            ? () => {
                overlays.state.palette = 'commands'
              }
            : event.shiftKey && key === 'b'
              ? () => {
                  settings.settings.sidebarCollapsed =
                    !settings.settings.sidebarCollapsed
                }
              : shortcuts[key]
    if (action) {
      event.preventDefault()
      void action()
    }
  }
  onMounted(() => {
    window.addEventListener('keydown', keydown)
    window.addEventListener('beforeunload', persist)
  })
  onBeforeUnmount(() => {
    stopped = true
    stop()
    persist()
    window.removeEventListener('keydown', keydown)
    window.removeEventListener('beforeunload', persist)
  })
}
