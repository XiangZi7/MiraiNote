<script setup lang="ts">
import AppIcon from './AppIcon.vue'
withDefaults(
  defineProps<{
    icon: string
    label: string
    active?: boolean
    disabled?: boolean
  }>(),
  { active: undefined, disabled: false }
)
</script>

<template>
  <button
    type="button"
    class="text-secondary enabled:hover:bg-hover enabled:hover:text-primary inline-flex size-7 shrink-0 items-center justify-center rounded-[5px] transition-colors duration-150 disabled:cursor-default disabled:opacity-40"
    :class="{ 'bg-hover text-primary': active }"
    :aria-label="label"
    :title="label"
    :aria-pressed="active === undefined ? undefined : active"
    :disabled="disabled"
  >
    <AppIcon :name="icon" />
  </button>
</template>
