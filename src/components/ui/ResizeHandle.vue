<script setup lang="ts">
import { onBeforeUnmount } from 'vue'
const props = withDefaults(
  defineProps<{
    modelValue: number
    min: number
    max: number
    axis?: 'horizontal' | 'vertical'
    reverse?: boolean
    relativeTo?: number
    label?: string
  }>(),
  { axis: 'horizontal', reverse: false, relativeTo: 1, label: '调整面板大小' }
)
const emit = defineEmits<{ 'update:modelValue': [value: number]; end: [] }>()
let cleanup: (() => void) | undefined
function clamp(value: number) {
  return Math.max(props.min, Math.min(props.max, value))
}
function start(event: PointerEvent) {
  if (event.button !== 0) return
  event.preventDefault()
  const handle = event.currentTarget as HTMLElement
  handle.setPointerCapture(event.pointerId)
  const startPoint = props.axis === 'horizontal' ? event.clientX : event.clientY
  const initial = props.modelValue
  const previousCursor = document.body.style.cursor
  document.body.style.cursor =
    props.axis === 'horizontal' ? 'col-resize' : 'row-resize'
  document.body.style.userSelect = 'none'
  function move(event: PointerEvent) {
    const point = props.axis === 'horizontal' ? event.clientX : event.clientY
    emit(
      'update:modelValue',
      clamp(
        initial +
          ((point - startPoint) * (props.reverse ? -1 : 1)) /
            Math.max(props.relativeTo, 1)
      )
    )
  }
  function end() {
    cleanup?.()
    emit('end')
  }
  cleanup = () => {
    handle.removeEventListener('pointermove', move)
    handle.removeEventListener('pointerup', end)
    handle.removeEventListener('pointercancel', end)
    document.body.style.cursor = previousCursor
    document.body.style.userSelect = ''
    cleanup = undefined
  }
  handle.addEventListener('pointermove', move)
  handle.addEventListener('pointerup', end)
  handle.addEventListener('pointercancel', end)
}
function keyboard(event: KeyboardEvent) {
  const negative = props.axis === 'horizontal' ? 'ArrowLeft' : 'ArrowUp'
  const positive = props.axis === 'horizontal' ? 'ArrowRight' : 'ArrowDown'
  if (![negative, positive, 'Home', 'End'].includes(event.key)) return
  event.preventDefault()
  const step = props.relativeTo > 1 ? 0.05 : 10
  const value =
    event.key === 'Home'
      ? props.min
      : event.key === 'End'
        ? props.max
        : props.modelValue +
          (event.key === positive ? 1 : -1) * (props.reverse ? -1 : 1) * step
  emit('update:modelValue', clamp(value))
  emit('end')
}
onBeforeUnmount(() => cleanup?.())
</script>

<template>
  <div
    class="bg-line hover:after:bg-accent/25 focus-visible:after:bg-accent/25 relative z-4 shrink-0 touch-none after:absolute after:transition-colors after:duration-150"
    :class="
      axis === 'horizontal'
        ? 'h-full w-px cursor-col-resize after:-inset-x-[3px] after:inset-y-0'
        : 'h-px w-full cursor-row-resize after:inset-x-0 after:-inset-y-[3px]'
    "
    role="separator"
    tabindex="0"
    :aria-label="label"
    :aria-orientation="axis === 'horizontal' ? 'vertical' : 'horizontal'"
    :aria-valuemin="min"
    :aria-valuemax="max"
    :aria-valuenow="modelValue"
    @pointerdown="start"
    @keydown="keyboard"
  />
</template>
