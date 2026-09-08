<script setup lang="ts">
import { useId, useTemplateRef } from 'vue'
import { useFocusTrap } from '@/composables/useFocusTrap'
import IconButton from './IconButton.vue'
withDefaults(
  defineProps<{ title: string; width?: string; scrollable?: boolean }>(),
  {
    width: '520px',
    scrollable: true,
  }
)
const emit = defineEmits<{ close: [] }>()
const dialog = useTemplateRef('dialog')
const titleId = useId()
useFocusTrap(dialog)
</script>

<template>
  <Teleport to="body"
    ><div
      class="fixed inset-0 z-60 flex items-start justify-center bg-[#182130]/15 px-6 pt-[14vh] pb-6 backdrop-blur-[3px]"
      @pointerdown.self="emit('close')"
      @keydown.esc.stop="emit('close')"
    >
      <section
        ref="dialog"
        role="dialog"
        aria-modal="true"
        :aria-labelledby="titleId"
        class="border-line bg-elevated shadow-floating max-h-[76vh] max-w-full rounded-xl border"
        :class="scrollable ? 'overflow-auto' : 'flex flex-col overflow-hidden'"
        :style="{ width }"
      >
        <header
          class="flex shrink-0 items-center justify-between px-6 pt-5 pb-3.5"
        >
          <h2
            :id="titleId"
            class="text-base font-semibold"
          >
            {{ title }}
          </h2>
          <IconButton
            icon="lucide:x"
            label="关闭对话框"
            @click="emit('close')"
          />
        </header>
        <slot />
      </section></div
  ></Teleport>
</template>
