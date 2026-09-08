<script setup lang="ts">
import { nextTick, onMounted, onBeforeUnmount, reactive, toRefs, useTemplateRef } from 'vue'
import AppIcon from './AppIcon.vue'
import type { MenuItem } from '@/types/workspace'
const props = defineProps<{ x: number; y: number; items: MenuItem[] }>()
const emit = defineEmits<{ close: []; error: [error: unknown] }>()
const menu = useTemplateRef('menu')
// 响应式状态
const state = reactive({
  // 约束后的横坐标
  left: props.x,
  // 约束后的纵坐标
  top: props.y,
})
const { left, top } = toRefs(state)
const previous = document.activeElement as HTMLElement | null
async function execute(item: MenuItem) {
  if (item.disabled) return
  emit('close')
  try { await item.action() } catch (error) { emit('error', error) }
}
function keyboard(event: KeyboardEvent) {
  const buttons = Array.from(menu.value?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); buttons[(index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus() }
  if (event.key === 'Escape' || event.key === 'Tab') { event.preventDefault(); emit('close') }
}
onMounted(async () => { await nextTick(); const rect = menu.value?.getBoundingClientRect(); if (rect) { state.left = Math.max(8, Math.min(props.x, window.innerWidth - rect.width - 8)); state.top = Math.max(8, Math.min(props.y, window.innerHeight - rect.height - 8)) }; menu.value?.querySelector('button:not(:disabled)')?.focus() })
onBeforeUnmount(() => previous?.isConnected && previous.focus())
</script>

<template>
  <Teleport to="body"><div class="fixed inset-0 z-80" @pointerdown.self="emit('close')" @contextmenu.prevent="emit('close')"><div ref="menu" role="menu" aria-label="操作菜单" class="fixed max-h-[calc(100vh-16px)] min-w-[220px] overflow-auto rounded-[10px] border border-line bg-elevated p-1.5 shadow-floating" :style="{ left: `${left}px`, top: `${top}px` }" @keydown="keyboard"><template v-for="(item, index) in items" :key="`${item.label}-${index}`"><div v-if="item.divider && index" class="mx-1 my-1 h-px bg-line" role="separator" /><button role="menuitem" :disabled="item.disabled" class="flex h-8 w-full items-center gap-2.5 rounded-[5px] px-2.5 text-left text-xs outline-none enabled:hover:bg-hover focus-visible:bg-hover disabled:opacity-40" :class="item.danger ? 'text-danger' : 'text-secondary'" @click="execute(item)"><AppIcon v-if="item.icon" :name="item.icon" :size="15" /><span v-else class="w-[15px]" /><span class="flex-1">{{ item.label }}</span><kbd v-if="item.shortcut" class="ml-5">{{ item.shortcut }}</kbd></button></template></div></div></Teleport>
</template>
