import { computed, reactive, watch } from 'vue'
import { defineStore } from 'pinia'
import { isObject, loadJson, persistJson } from '@/utils/storage'

interface Settings {
  theme: 'system' | 'light' | 'dark'
  sidebarWidth: number
  sidebarCollapsed: boolean
  inspectorWidth: number
  aiWidth: number
  pdfSidebarWidth: number
  editorFontSize: number
  autoSave: boolean
}

const defaults: Settings = {
  theme: 'system',
  sidebarWidth: 240,
  sidebarCollapsed: false,
  inspectorWidth: 280,
  aiWidth: 320,
  pdfSidebarWidth: 146,
  editorFontSize: 14,
  autoSave: true,
}
function valid(value: unknown): value is Settings {
  return (
    isObject(value) &&
    ['system', 'light', 'dark'].includes(String(value.theme)) &&
    typeof value.sidebarCollapsed === 'boolean' &&
    typeof value.autoSave === 'boolean' &&
    typeof value.sidebarWidth === 'number' &&
    value.sidebarWidth >= 180 &&
    value.sidebarWidth <= 420 &&
    typeof value.inspectorWidth === 'number' &&
    value.inspectorWidth >= 220 &&
    value.inspectorWidth <= 420 &&
    typeof value.aiWidth === 'number' &&
    value.aiWidth >= 280 &&
    value.aiWidth <= 480 &&
    (value.pdfSidebarWidth === undefined ||
      (typeof value.pdfSidebarWidth === 'number' &&
        value.pdfSidebarWidth >= 120 &&
        value.pdfSidebarWidth <= 360)) &&
    typeof value.editorFontSize === 'number' &&
    value.editorFontSize >= 12 &&
    value.editorFontSize <= 20
  )
}

export const useSettingsStore = defineStore('settings', () => {
  const settings = reactive({
    ...defaults,
    ...loadJson('settings', defaults, valid),
  })
  const sidebarSize = computed(() =>
    settings.sidebarCollapsed ? 56 : settings.sidebarWidth
  )
  const system = window.matchMedia('(prefers-color-scheme: dark)')
  function applyTheme() {
    document.documentElement.dataset.theme =
      settings.theme === 'system'
        ? system.matches
          ? 'dark'
          : 'light'
        : settings.theme
  }
  system.addEventListener('change', applyTheme)
  watch(() => settings.theme, applyTheme, { immediate: true })
  return {
    settings,
    sidebarSize,
    persist: () => persistJson('settings', settings),
  }
})
