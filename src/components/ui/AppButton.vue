<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'default' | 'primary' | 'danger' | 'ghost'
    disabled?: boolean
  }>(),
  { variant: 'default' }
)
</script>

<template>
  <button
    type="button"
    :disabled="disabled"
    class="inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors duration-150 disabled:cursor-default disabled:opacity-40"
    :class="{
      'bg-hover enabled:hover:bg-selected': variant === 'default',
      'bg-primary text-surface enabled:hover:bg-secondary':
        variant === 'primary',
      'bg-danger enabled:hover:bg-danger/90 text-white': variant === 'danger',
      'text-secondary enabled:hover:bg-hover enabled:hover:text-primary':
        variant === 'ghost',
    }"
  >
    <slot />
  </button>
</template>
