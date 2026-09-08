import { isTauri } from '@tauri-apps/api/core'
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
}
