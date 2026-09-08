<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template>
  <div
    role="toolbar"
    :aria-label="label"
    class="border-line bg-canvas flex h-11 shrink-0 [scrollbar-width:none] items-center gap-1.5 overflow-x-auto border-b px-5"
  >
    <slot />
  </div>
</template>
