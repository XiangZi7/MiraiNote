<script setup lang="ts">
const model = defineModel<string>({ required: true })
</script>

<template>
  <input
    v-model="model"
    class="border-line bg-surface text-primary focus:border-accent w-full rounded-md border px-2.5 py-2 transition-colors outline-none"
  />
</template>
