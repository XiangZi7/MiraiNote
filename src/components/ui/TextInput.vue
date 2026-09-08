<script setup lang="ts">
const model = defineModel<string>({ required: true })
</script>

<template><input v-model="model" class="w-full rounded-md border border-line bg-surface px-2.5 py-2 text-primary outline-none transition-colors focus:border-accent" /></template>
