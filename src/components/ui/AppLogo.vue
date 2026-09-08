<script setup lang="ts">
import logo from '@/assets/logo.png'

withDefaults(defineProps<{ size?: number }>(), { size: 24 })
</script>

<template>
  <img
    :src="logo"
    alt=""
    aria-hidden="true"
    :width="size"
    :height="size"
    :style="{ width: `${size}px`, height: `${size}px` }"
    class="shrink-0 object-contain"
    :draggable="false"
  />
</template>
