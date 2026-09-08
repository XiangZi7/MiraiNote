<script setup lang="ts">
import AppIcon from './AppIcon.vue'
defineProps<{ icon: string; label: string; active?: boolean; disabled?: boolean }>()
</script>

<template>
  <button type="button" class="icon-button" :class="{ active }" :aria-label="label" :title="label" :aria-pressed="active === undefined ? undefined : active" :disabled="disabled">
    <AppIcon :name="icon" />
  </button>
</template>
