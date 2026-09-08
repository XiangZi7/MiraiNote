<script setup lang="ts" generic="T extends string">
import { useId } from 'vue'
defineProps<{
  label: string
  options: readonly { value: T; label: string; disabled?: boolean }[]
  disabled?: boolean
}>()
const model = defineModel<T>({ required: true })
const id = useId()
</script>
<template>
  <div class="grid min-w-0 gap-2 text-xs">
    <label
      :for="id"
      class="text-secondary"
      >{{ label }}</label
    >
    <select
      :id="id"
      v-model="model"
      :disabled="disabled"
      class="border-line bg-surface text-primary focus:border-accent w-full min-w-0 rounded-md border px-2.5 py-2 text-xs outline-none disabled:opacity-50"
    >
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :disabled="option.disabled"
      >
        {{ option.label }}
      </option>
    </select>
  </div>
</template>
