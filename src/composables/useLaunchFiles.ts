import { onBeforeUnmount, onMounted } from 'vue'
import { windowApi } from '@/api/ipc/window'
import { useOverlaysStore } from '@/stores/overlays'
import { useDocumentActions } from './useDocumentActions'

export function useLaunchFiles() {
  const actions = useDocumentActions()
  const overlays = useOverlaysStore()
  let stopped = false
  let unlisten: (() => void) | undefined
  let pending = Promise.resolve()
  function drain() {
    // Serialize notifications so arrivals during an import are drained afterwards.
    pending = pending.then(async () => {
      if (stopped) return
      const files = await windowApi.takeLaunchFiles()
      if (!stopped && files.length) await actions.importLaunchFiles(files)
    }).catch(() => {
      if (!stopped) overlays.toast('无法打开启动时传入的文档，请尝试重新打开。', true)
    })
  }
  onMounted(async () => {
    if (!windowApi.isDesktop()) return
    try {
      unlisten = await windowApi.onFilesOpened(drain)
      if (stopped) unlisten()
      else drain()
    } catch {
      overlays.toast('文档打开监听失败，请重启应用。', true)
    }
  })
  onBeforeUnmount(() => {
    stopped = true
    unlisten?.()
  })
}
