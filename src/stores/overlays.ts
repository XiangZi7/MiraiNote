import { reactive } from 'vue'
import { defineStore } from 'pinia'
import type { MenuItem } from '@/types/workspace'

export const useOverlaysStore = defineStore('overlays', () => {
  const state = reactive({
    palette: null as 'search' | 'commands' | null,
    inspector: false,
    ai: false,
    settings: false,
    help: false,
    menu: null as { x: number; y: number; items: MenuItem[] } | null,
    toasts: [] as { id: string; message: string; error: boolean }[],
    prompt: null as {
      title: string
      label: string
      value: string
      confirm: string
      danger: boolean
      action: (value: string) => void | Promise<void>
    } | null,
  })
  function toast(message: string, error = false) {
    const id = crypto.randomUUID()
    state.toasts.push({ id, message, error })
    window.setTimeout(
      () => {
        state.toasts = state.toasts.filter(item => item.id !== id)
      },
      error ? 7000 : 3500
    )
  }
  function menu(event: MouseEvent, items: MenuItem[]) {
    state.menu = { x: event.clientX, y: event.clientY, items }
  }
  function close() {
    state.palette = null
    state.settings = false
    state.help = false
    state.menu = null
    state.prompt = null
  }
  return { state, toast, menu, close }
})
