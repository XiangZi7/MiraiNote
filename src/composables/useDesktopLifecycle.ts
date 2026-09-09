import { onBeforeUnmount, onMounted } from 'vue'
import { windowApi } from '@/api/ipc/window'
import { useOverlaysStore } from '@/stores/overlays'

// Native quit waits for persistence to finish; hiding keeps the webview alive.
export function useDesktopLifecycle(persist: () => boolean) {
  const overlays = useOverlaysStore()
  let stopped = false
  let quitting = false
  const unlisten: Array<() => void> = []

  async function saveOrQuit(quit: boolean) {
    if (stopped || quitting) return
    quitting = quit
    try {
      if (!persist()) {
        await windowApi.show()
        return
      }
      if (quit) await windowApi.finishExit()
    } catch {
      overlays.toast('退出失败，请重试；正在编辑的文档仍保留在工作区。', true)
      await windowApi.show().catch(() => {})
    } finally {
      quitting = false
    }
  }

  onMounted(async () => {
    if (!windowApi.isDesktop()) return
    try {
      unlisten.push(
        await windowApi.onSaveRequested(() => void saveOrQuit(false))
      )
      unlisten.push(
        await windowApi.onQuitRequested(() => void saveOrQuit(true))
      )
      if (!stopped) await windowApi.setReady(true)
      if (stopped) {
        await windowApi.setReady(false)
        unlisten.splice(0).forEach(stop => stop())
      }
    } catch {
      unlisten.splice(0).forEach(stop => stop())
      overlays.toast('托盘连接失败，关闭窗口将直接退出；请重启应用。', true)
    }
  })

  onBeforeUnmount(() => {
    stopped = true
    unlisten.splice(0).forEach(stop => stop())
    if (windowApi.isDesktop()) void windowApi.setReady(false).catch(() => {})
  })
}
