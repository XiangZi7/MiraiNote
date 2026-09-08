import { onMounted, onBeforeUnmount, type Ref } from 'vue'

export function useFocusTrap(element: Readonly<Ref<HTMLElement | null>>) {
  let previous: HTMLElement | null = null
  function keydown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return
    const candidates = Array.from(
      element.value?.querySelectorAll<HTMLElement>(
        'button:not(:disabled), [href], input:not(:disabled), select, textarea, [tabindex="0"]'
      ) ?? []
    ).filter(el => el.getClientRects().length)
    const first = candidates[0],
      last = candidates.at(-1)
    if (!first || !last) {
      event.preventDefault()
      return
    }
    if (event.shiftKey && globalThis.document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && globalThis.document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
  onMounted(() => {
    previous = globalThis.document.activeElement as HTMLElement | null
    element.value?.addEventListener('keydown', keydown)
    const focus = element.value?.querySelector<HTMLElement>(
      '[autofocus], input, button, [tabindex="0"]'
    )
    focus?.focus()
  })
  onBeforeUnmount(() => {
    element.value?.removeEventListener('keydown', keydown)
    if (previous?.isConnected) previous.focus()
  })
}
