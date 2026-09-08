<script setup lang="ts" generic="T extends string">
defineProps<{ modelValue: T; options: { label: string; value: T }[]; label: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: T] }>()
</script>

<template>
  <div class="flex shrink-0 items-center rounded-md bg-hover p-0.5" role="group" :aria-label="label"><button v-for="option in options" :key="option.value" type="button" class="rounded px-2.5 py-0.5 text-xs whitespace-nowrap transition-colors duration-150" :class="modelValue === option.value ? 'bg-surface font-medium text-primary shadow-sm' : 'text-secondary hover:text-primary'" :aria-pressed="modelValue === option.value" @click="emit('update:modelValue', option.value)">{{ option.label }}</button></div>
</template>
