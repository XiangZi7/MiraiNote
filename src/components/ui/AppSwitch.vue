<script setup lang="ts">
defineProps<{ label: string; description?: string; disabled?: boolean }>()
const model = defineModel<boolean>({ required: true })
</script>
<template>
  <label
    class="flex cursor-pointer items-center justify-between gap-4 text-xs"
    :class="{ 'opacity-50': disabled }"
  >
    <span
      ><span class="block font-medium">{{ label }}</span
      ><span
        v-if="description"
        class="text-muted mt-1 block text-[11px] leading-5"
        >{{ description }}</span
      ></span
    >
    <input
      v-model="model"
      :disabled="disabled"
      type="checkbox"
      role="switch"
      class="peer sr-only"
    />
    <span
      class="bg-faint peer-checked:bg-accent peer-focus-visible:outline-accent relative h-5 w-9 shrink-0 rounded-full transition-colors peer-focus-visible:outline-2 after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4"
    />
  </label>
</template>
