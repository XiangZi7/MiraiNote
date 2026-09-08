<script setup lang="ts">
import { Icon } from '@iconify/vue/offline'
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 16 })
</script>

<template>
  <Icon :icon="name" :width="size" :height="size" aria-hidden="true" class="app-icon" />
</template>

<style scoped>
.app-icon { flex-shrink: 0; display: inline-block; }
</style>
