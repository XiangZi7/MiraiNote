<script setup lang="ts">
import { computed } from 'vue'
import { SegmentedControl } from '@/components/ui'
import { capacityPresets, type AgentLimits } from '../settings'
const model = defineModel<AgentLimits>({ required: true })
const preset = computed({
  get: () =>
    capacityPresets.find(item =>
      Object.entries(item.limits).every(
        ([key, value]) => model.value[key as keyof AgentLimits] === value
      )
    )?.value ?? 'custom',
  set: value => {
    const item = capacityPresets.find(item => item.value === value)
    if (item) model.value = { ...item.limits }
  },
})
const fields = [
  { key: 'maxSteps', label: '每轮模型请求', min: 1, max: 128, unit: '次' },
  { key: 'maxContextKb', label: '上下文容量', min: 64, max: 4000, unit: 'KB' },
  { key: 'maxMessages', label: '历史消息上限', min: 16, max: 2048, unit: '条' },
] as const
</script>
<template>
  <details class="border-line border-t pt-4">
    <summary class="text-secondary cursor-pointer text-xs font-medium">
      任务容量
      <span class="text-muted ml-2 font-normal">{{
        preset === 'custom'
          ? '自定义'
          : capacityPresets.find(item => item.value === preset)?.label
      }}</span>
    </summary>
    <div class="mt-4 space-y-4">
      <SegmentedControl
        v-model="preset"
        label="任务容量预设"
        :options="capacityPresets"
      />
      <div class="grid grid-cols-3 gap-3">
        <label
          v-for="field in fields"
          :key="field.key"
          class="grid gap-2 text-[11px]"
          ><span class="text-secondary">{{ field.label }}</span>
          <div
            class="border-line bg-surface focus-within:border-accent flex items-center rounded-md border px-2.5"
          >
            <input
              v-model.number="model[field.key]"
              type="number"
              :min="field.min"
              :max="field.max"
              step="1"
              class="w-full min-w-0 py-2 outline-none"
            /><span class="text-muted">{{ field.unit }}</span>
          </div>
          <span class="text-muted">{{ field.min }}–{{ field.max }}</span></label
        >
      </div>
      <p class="text-muted text-[11px] leading-5">
        容量包含文档、聊天内容及工具结果。超过上限会提示调整，模型服务仍可能有独立的上下文限制。
      </p>
    </div>
  </details>
</template>
