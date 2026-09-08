<script setup lang="ts">
defineProps<{ label: string }>()
</script>

<template><div role="toolbar" :aria-label="label" class="flex h-11 shrink-0 items-center gap-1.5 overflow-x-auto border-b border-line bg-canvas px-5 [scrollbar-width:none]"><slot /></div></template>
