import { invoke, isTauri } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'

export const windowApi = {
  isDesktop: isTauri,
  async minimize() {
    if (isTauri()) await getCurrentWindow().minimize()
  },
  async toggleMaximize() {
    if (isTauri()) await getCurrentWindow().toggleMaximize()
  },
  async close() {
    if (isTauri()) await getCurrentWindow().close()
  },
  async setReady(ready: boolean) {
    if (isTauri()) await invoke('desktop_set_ready', { ready })
  },
  async finishExit() {
    if (isTauri()) await invoke('desktop_finish_exit')
  },
  async show() {
    if (isTauri()) await invoke('desktop_show_main')
  },
  async onSaveRequested(handler: () => void) {
    return getCurrentWindow().listen('desktop:save-requested', handler)
  },
  async onQuitRequested(handler: () => void) {
    return getCurrentWindow().listen('desktop:quit-requested', handler)
  },
}
