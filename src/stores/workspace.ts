import { computed, ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { useDocumentsStore } from './documents'
import { compactLayout, emptyPane, panesOf, replaceNode } from '@/utils/layout'
import { isObject, loadJson, persistJson } from '@/utils/storage'
import { defaultPosition } from '@/types/document'
import type { DocumentTab } from '@/types/document'
import type {
  DropEdge,
  LayoutNode,
  LibraryFilter,
  PaneNode,
  SplitNode,
} from '@/types/workspace'

function validLayout(value: unknown, depth = 0): value is LayoutNode {
  if (depth > 20 || !isObject(value) || typeof value.id !== 'string')
    return false
  if (value.type === 'split')
    return (
      ['horizontal', 'vertical'].includes(String(value.axis)) &&
      typeof value.ratio === 'number' &&
      value.ratio >= 0.15 &&
      value.ratio <= 0.85 &&
      Array.isArray(value.children) &&
      value.children.length === 2 &&
      value.children.every(child => validLayout(child, depth + 1))
    )
  return (
    value.type === 'pane' &&
    Array.isArray(value.tabs) &&
    value.tabs.every(
      tab =>
        isObject(tab) &&
        typeof tab.id === 'string' &&
        typeof tab.documentId === 'string' &&
        typeof tab.pinned === 'boolean' &&
        isObject(tab.position) &&
        ['edit', 'preview', 'split'].includes(String(tab.position.mode)) &&
        ['ratio', 'cursor', 'scroll', 'page', 'zoom', 'rotation'].every(
          key =>
            typeof (tab.position as Record<string, unknown>)[key] === 'number'
        )
    ) &&
    (value.activeTabId === null || typeof value.activeTabId === 'string')
  )
}

export const useWorkspaceStore = defineStore('workspace', () => {
  const documents = useDocumentsStore()
  const initial = emptyPane()
  if (documents.documents[0]) {
    const tab = {
      id: crypto.randomUUID(),
      documentId: documents.documents[0].id,
      pinned: false,
      position: defaultPosition(),
    }
    initial.tabs.push(tab)
    initial.activeTabId = tab.id
  }
  const root = ref<LayoutNode>(loadJson('layout', initial, validLayout))
  for (const pane of panesOf(root.value)) {
    pane.tabs = pane.tabs.filter(tab => documents.get(tab.documentId))
    if (!pane.tabs.some(tab => tab.id === pane.activeTabId))
      pane.activeTabId = pane.tabs[0]?.id ?? null
  }
  root.value = compactLayout(root.value)
  const activePaneId = shallowRef(panesOf(root.value)[0]!.id)
  const library = shallowRef<LibraryFilter | null>(null)
  const drag = shallowRef<{ paneId: string; tabId: string } | null>(null)
  const closedTabs = ref<DocumentTab[]>([])
  const panes = computed(() => panesOf(root.value))
  const activePane = computed(
    () =>
      panes.value.find(pane => pane.id === activePaneId.value) ??
      panes.value[0]!
  )
  const activeTab = computed(() =>
    activePane.value.tabs.find(tab => tab.id === activePane.value.activeTabId)
  )
  const currentDocument = computed(() =>
    documents.get(activeTab.value?.documentId)
  )

  function activate(paneId: string, tabId?: string) {
    const pane = panes.value.find(item => item.id === paneId)
    if (!pane) return
    activePaneId.value = pane.id
    if (tabId && pane.tabs.some(tab => tab.id === tabId))
      pane.activeTabId = tabId
    library.value = null
  }
  function open(documentId: string, targetPaneId = activePane.value.id) {
    const pane = panes.value.find(item => item.id === targetPaneId)
    const doc = documents.get(documentId)
    if (!pane || !doc) return
    let tab = pane.tabs.find(item => item.documentId === documentId)
    if (!tab) {
      tab = {
        id: crypto.randomUUID(),
        documentId,
        pinned: false,
        position: defaultPosition(),
      }
      pane.tabs.push(tab)
    }
    activate(pane.id, tab.id)
    doc.openedAt = new Date().toISOString()
  }
  function detach(pane: PaneNode, tabId: string) {
    const index = pane.tabs.findIndex(tab => tab.id === tabId)
    if (index < 0) return
    const tab = pane.tabs.splice(index, 1)[0]!
    if (pane.activeTabId === tabId)
      pane.activeTabId =
        pane.tabs[Math.min(index, pane.tabs.length - 1)]?.id ?? null
    return tab
  }
  function tidy() {
    root.value = compactLayout(root.value)
    if (!panes.value.some(pane => pane.id === activePaneId.value))
      activePaneId.value = panes.value[0]!.id
  }
  function close(paneId: string, tabId: string) {
    const pane = panes.value.find(item => item.id === paneId)
    if (!pane) return
    const tab = detach(pane, tabId)
    if (tab) {
      closedTabs.value.push(tab)
      closedTabs.value = closedTabs.value.slice(-30)
    }
    tidy()
  }
  function restore() {
    const tab = closedTabs.value.pop()
    if (!tab || !documents.get(tab.documentId)) return
    const pane = activePane.value
    const existing = pane.tabs.find(item => item.documentId === tab.documentId)
    if (existing) activate(pane.id, existing.id)
    else {
      pane.tabs.push(tab)
      activate(pane.id, tab.id)
    }
  }
  function moveTab(
    sourceId: string,
    tabId: string,
    targetId: string,
    index: number
  ) {
    const source = panes.value.find(pane => pane.id === sourceId)
    const target = panes.value.find(pane => pane.id === targetId)
    if (!source || !target) return
    const previousIndex = source.tabs.findIndex(tab => tab.id === tabId)
    const tab = detach(source, tabId)
    if (!tab) return
    const duplicate = target.tabs.find(
      item => item.documentId === tab.documentId
    )
    if (duplicate) target.activeTabId = duplicate.id
    else {
      let nextIndex =
        source === target && previousIndex < index ? index - 1 : index
      const pinnedCount = target.tabs.filter(item => item.pinned).length
      nextIndex = tab.pinned
        ? Math.min(nextIndex, pinnedCount)
        : Math.max(nextIndex, pinnedCount)
      target.tabs.splice(
        Math.max(0, Math.min(nextIndex, target.tabs.length)),
        0,
        tab
      )
      target.activeTabId = tab.id
    }
    activePaneId.value = target.id
    drag.value = null
    library.value = null
    tidy()
  }
  function splitTab(
    sourceId: string,
    tabId: string,
    targetId: string,
    edge: DropEdge,
    copy = false
  ) {
    if (edge === 'center') {
      moveTab(sourceId, tabId, targetId, 999)
      return
    }
    const source = panes.value.find(pane => pane.id === sourceId)
    const target = panes.value.find(pane => pane.id === targetId)
    const original = source?.tabs.find(tab => tab.id === tabId)
    if (
      !source ||
      !target ||
      !original ||
      (!copy && source === target && source.tabs.length === 1)
    ) {
      drag.value = null
      return
    }
    const tab = copy
      ? {
          ...original,
          id: crypto.randomUUID(),
          position: { ...original.position },
        }
      : detach(source, tabId)!
    const pane = emptyPane()
    pane.tabs = [tab]
    pane.activeTabId = tab.id
    const first = edge === 'left' || edge === 'top'
    const split: SplitNode = {
      type: 'split',
      id: crypto.randomUUID(),
      axis: edge === 'left' || edge === 'right' ? 'horizontal' : 'vertical',
      ratio: 0.5,
      children: first ? [pane, target] : [target, pane],
    }
    root.value = replaceNode(root.value, target.id, split)
    activePaneId.value = pane.id
    drag.value = null
    library.value = null
    tidy()
  }
  function togglePin(paneId: string, tabId: string) {
    const pane = panes.value.find(item => item.id === paneId)
    const tab = pane?.tabs.find(item => item.id === tabId)
    if (!pane || !tab) return
    tab.pinned = !tab.pinned
    pane.tabs.sort((a, b) => Number(b.pinned) - Number(a.pinned))
  }
  function cycle(backward = false) {
    const pane = activePane.value
    const index = pane.tabs.findIndex(tab => tab.id === pane.activeTabId)
    const tab =
      pane.tabs[
        (index + (backward ? -1 : 1) + pane.tabs.length) % pane.tabs.length
      ]
    if (tab) activate(pane.id, tab.id)
  }
  function removeDocument(id: string) {
    for (const pane of panes.value)
      for (const tab of [...pane.tabs])
        if (tab.documentId === id) detach(pane, tab.id)
    closedTabs.value = closedTabs.value.filter(tab => tab.documentId !== id)
    tidy()
  }
  return {
    root,
    panes,
    activePaneId,
    activePane,
    activeTab,
    currentDocument,
    library,
    drag,
    closedTabs,
    activate,
    open,
    close,
    restore,
    moveTab,
    splitTab,
    togglePin,
    cycle,
    removeDocument,
    persist: () => persistJson('layout', root.value),
  }
})
