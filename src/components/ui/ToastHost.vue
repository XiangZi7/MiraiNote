<script setup lang="ts">
import { useOverlaysStore } from '@/stores/overlays'
import AppIcon from './AppIcon.vue'
const overlays = useOverlaysStore()
</script>

<template>
  <Teleport to="body"
    ><div
      class="pointer-events-none fixed right-5 bottom-5 z-100 flex max-w-[400px] flex-col gap-2"
      aria-live="polite"
    >
      <TransitionGroup name="fade"
        ><div
          v-for="toast in overlays.state.toasts"
          :key="toast.id"
          class="border-line bg-elevated shadow-floating pointer-events-auto flex items-start gap-2.5 rounded-lg border px-4 py-3 text-xs"
          :class="toast.error ? 'text-danger' : 'text-secondary'"
          :role="toast.error ? 'alert' : 'status'"
        >
          <AppIcon
            :name="toast.error ? 'lucide:circle-alert' : 'lucide:circle-check'"
            :size="16"
          /><span>{{ toast.message }}</span>
        </div></TransitionGroup
      >
      <div
        v-if="overlays.state.busy"
        class="border-line bg-elevated shadow-floating text-secondary pointer-events-auto flex items-center gap-2.5 rounded-lg border px-4 py-3 text-xs"
        role="status"
      >
        <AppIcon
          name="lucide:loader-circle"
          :size="16"
          class="animate-spin"
        /><span class="truncate">{{ overlays.state.busy }}</span>
      </div>
    </div></Teleport
  >
</template>
