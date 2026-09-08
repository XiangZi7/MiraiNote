<script setup lang="ts">
import { Icon } from '@iconify/vue/offline'
withDefaults(defineProps<{ name: string; size?: number }>(), { size: 16 })
</script>

<template>
  <Icon :icon="name" :width="size" :height="size" aria-hidden="true" class="inline-block shrink-0" />
</template>
