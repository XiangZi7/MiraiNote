<script setup lang="ts">
import { useOverlaysStore } from '@/stores/overlays'
import AppIcon from './AppIcon.vue'
const overlays = useOverlaysStore()
</script>

<template>
  <Teleport to="body"><div class="pointer-events-none fixed right-5 bottom-5 z-100 flex max-w-[400px] flex-col gap-2" aria-live="polite"><TransitionGroup name="fade"><div v-for="toast in overlays.state.toasts" :key="toast.id" class="pointer-events-auto flex items-start gap-2.5 rounded-lg border border-line bg-elevated px-4 py-3 text-xs shadow-floating" :class="toast.error ? 'text-danger' : 'text-secondary'" :role="toast.error ? 'alert' : 'status'"><AppIcon :name="toast.error ? 'lucide:circle-alert' : 'lucide:circle-check'" :size="16" /><span>{{ toast.message }}</span></div></TransitionGroup></div></Teleport>
</template>
