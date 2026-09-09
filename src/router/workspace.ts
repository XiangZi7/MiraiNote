import { watch } from 'vue'
import type { Pinia } from 'pinia'
import type { Router, RouteLocationRaw } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import { useFoldersStore } from '@/stores/folders'
import { useOverlaysStore } from '@/stores/overlays'
import type { LibrarySection } from '@/types/workspace'

const sections = new Set(['all', 'recent', 'favorites', 'markdown', 'pdf', 'word'])

/** Keep existing tab/IPC actions and browser back/forward navigation in sync. */
export function bindWorkspaceRouter(router: Router, pinia: Pinia) {
  const workspace = useWorkspaceStore(pinia)
  const folders = useFoldersStore(pinia)
  const overlays = useOverlaysStore(pinia)
  let started = false
  function documentRoute(): RouteLocationRaw {
    return workspace.activeTab ? {
      name: 'document',
      params: { paneId: workspace.activePane.id, tabId: workspace.activeTab.id },
    } : { name: 'workspace' }
  }
  function destination(): RouteLocationRaw {
    if (workspace.libraryFolder) return { name: 'folder', params: { folderPath: workspace.libraryFolder } }
    if (workspace.library) return { name: 'library', params: { section: workspace.library } }
    return documentRoute()
  }
  const removeGuard = router.beforeEach(to => {
    if (to.name === 'workspace' && workspace.activeTab) return documentRoute()
    if (to.name === 'document') {
      const pane = workspace.panes.find(pane => pane.id === to.params.paneId)
      if (!pane?.tabs.some(tab => tab.id === to.params.tabId)) return documentRoute()
    }
    if (to.name === 'library' && !sections.has(String(to.params.section))) return { name: 'library', params: { section: 'all' } }
    if (to.name === 'folder' && !folders.get(String(to.params.folderPath))) return { name: 'library', params: { section: 'all' } }
  })
  const removeAfter = router.afterEach((to, _from, failure) => {
    if (failure) return
    started = true
    if (to.name === 'library') workspace.library = to.params.section as LibrarySection
    else if (to.name === 'folder') workspace.library = `folder:${String(to.params.folderPath)}`
    else {
      workspace.library = null
      if (to.name === 'document') {
        const pane = workspace.panes.find(pane => pane.id === to.params.paneId)
        if (pane) {
          workspace.activePaneId = pane.id
          pane.activeTabId = String(to.params.tabId)
        }
      }
    }
  })
  const stop = watch(
    () => [workspace.library, workspace.activePaneId, workspace.activeTab?.id],
    () => {
      if (!started) return
      const target = destination()
      if (router.resolve(target).fullPath !== router.currentRoute.value.fullPath) {
        void router.push(target).catch(() => overlays.toast('页面切换失败，请重试', true))
      }
    },
    { flush: 'post' }
  )
  return () => { stop(); removeGuard(); removeAfter() }
}
