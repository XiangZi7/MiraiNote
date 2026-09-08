<script setup lang="ts">
import { shallowRef } from 'vue'
import { useOverlaysStore } from '@/stores/overlays'
import { AppButton, TextInput } from '@/components/ui'
import AppDialog from '@/components/ui/AppDialog.vue'
const overlays = useOverlaysStore()
const value = shallowRef(overlays.state.prompt?.value ?? '')
const error = shallowRef('')
async function submit() {
  const prompt = overlays.state.prompt
  if (!prompt) return
  try {
    await prompt.action(value.value)
    overlays.state.prompt = null
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '操作失败，请重试'
  }
}
</script>

<template>
  <AppDialog
    v-if="overlays.state.prompt"
    :title="overlays.state.prompt.title"
    width="420px"
    @close="overlays.state.prompt = null"
    ><form
      class="px-6 pt-2 pb-6"
      @submit.prevent="submit"
    >
      <label class="text-secondary block text-xs leading-6"
        >{{ overlays.state.prompt.label
        }}<TextInput
          v-if="!overlays.state.prompt.danger"
          v-model="value"
          class="mt-2"
          autofocus
      /></label>
      <p
        v-if="error"
        role="alert"
        class="text-danger mt-2 text-xs"
      >
        {{ error }}
      </p>
      <div class="mt-6 flex justify-end gap-2">
        <AppButton
          variant="ghost"
          @click="overlays.state.prompt = null"
          >取消</AppButton
        ><AppButton
          type="submit"
          :variant="overlays.state.prompt.danger ? 'danger' : 'primary'"
          >{{ overlays.state.prompt.confirm }}</AppButton
        >
      </div>
    </form></AppDialog
  >
</template>
