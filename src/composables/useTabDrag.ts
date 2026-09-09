import { onBeforeUnmount, onDeactivated } from 'vue'
import { useEventListener } from '@vueuse/core'
import { useWorkspaceStore } from '@/stores/workspace'
import type { PaneNode } from '@/types/workspace'

/** Pointer capture works consistently in WebView2 and supports mouse, pen and touch. */
export function useTabDrag(pane: () => PaneNode) {
  const workspace = useWorkspaceStore()
  let gesture:
    | {
        pointer: number
        x: number
        y: number
        tabId: string
        handle: HTMLElement
        dragging: boolean
      }
    | undefined
  let suppressClick = false
  let previousCursor = ''

  function start(event: PointerEvent, tabId: string) {
    if (event.button !== 0 || (event.target as HTMLElement).closest('button'))
      return
    const handle = event.currentTarget as HTMLElement
    handle.setPointerCapture(event.pointerId)
    gesture = {
      pointer: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      tabId,
      handle,
      dragging: false,
    }
  }
  function targetAt(x: number, y: number) {
    const element = document.elementFromPoint(x, y)
    const section = element?.closest<HTMLElement>('[data-pane-id]')
    const target = workspace.panes.find(
      item => item.id === section?.dataset.paneId
    )
    if (!target || !section) {
      workspace.dropTarget = null
      return
    }
    const bar = element?.closest('.tab-bar')
    if (bar) {
      const tab = element?.closest<HTMLElement>('[data-tab-id]')
      const index = target.tabs.findIndex(
        item => item.id === tab?.dataset.tabId
      )
      const rect = tab?.getBoundingClientRect()
      workspace.dropTarget = {
        paneId: target.id,
        index:
          index < 0 || !rect
            ? target.tabs.length
            : index + (x > rect.left + rect.width / 2 ? 1 : 0),
      }
      const list = bar.querySelector('.tab-list')
      const bounds = list?.getBoundingClientRect()
      if (list && bounds && x > bounds.right - 32) list.scrollLeft += 16
      else if (list && bounds && x < bounds.left + 32) list.scrollLeft -= 16
      return
    }
    const content = section
      .querySelector('.pane-content')
      ?.getBoundingClientRect()
    if (!content) {
      workspace.dropTarget = null
      return
    }
    const rx = (x - content.left) / content.width,
      ry = (y - content.top) / content.height
    workspace.dropTarget = {
      paneId: target.id,
      edge:
        rx < 0.22
          ? 'left'
          : rx > 0.78
            ? 'right'
            : ry < 0.22
              ? 'top'
              : ry > 0.78
                ? 'bottom'
                : 'center',
    }
  }
  useEventListener(
    window,
    'pointermove',
    (event: PointerEvent) => {
      if (!gesture || gesture.pointer !== event.pointerId) return
      if (
        !gesture.dragging &&
        Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 6
      )
        return
      if (!gesture.dragging) {
        gesture.dragging = true
        previousCursor = document.body.style.cursor
        document.body.style.cursor = 'grabbing'
        workspace.drag = { paneId: pane().id, tabId: gesture.tabId }
      }
      targetAt(event.clientX, event.clientY)
      event.preventDefault()
    },
    { passive: false }
  )

  function finish(commit: boolean) {
    const current = gesture
    if (!current) return
    gesture = undefined
    if (current.handle.hasPointerCapture(current.pointer))
      current.handle.releasePointerCapture(current.pointer)
    if (!current.dragging) return
    const source = workspace.drag,
      target = workspace.dropTarget
    suppressClick = true
    window.setTimeout(() => {
      suppressClick = false
    }, 0)
    document.body.style.cursor = previousCursor
    workspace.drag = null
    workspace.dropTarget = null
    if (commit && source && target) {
      if ('index' in target)
        workspace.moveTab(
          source.paneId,
          source.tabId,
          target.paneId,
          target.index
        )
      else
        workspace.splitTab(
          source.paneId,
          source.tabId,
          target.paneId,
          target.edge
        )
    }
  }
  useEventListener(window, 'pointerup', (event: PointerEvent) => {
    if (gesture?.pointer === event.pointerId) {
      if (gesture.dragging) targetAt(event.clientX, event.clientY)
      finish(true)
    }
  })
  useEventListener(window, 'pointercancel', () => finish(false))
  useEventListener(window, 'blur', () => finish(false))
  useEventListener(window, 'keydown', (event: KeyboardEvent) => {
    if (event.key === 'Escape' && gesture?.dragging) {
      event.preventDefault()
      finish(false)
    }
  })
  onBeforeUnmount(() => finish(false))
  onDeactivated(() => finish(false))
  return {
    start,
    activate: (tabId: string) => {
      if (!suppressClick) workspace.activate(pane().id, tabId)
    },
  }
}
