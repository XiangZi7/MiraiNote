<script setup lang="ts">
import { AppIcon, AppButton, AppSelect } from '@/components/ui'
import { agentApi } from '@/api/ipc/agent'
import { providerPresets } from '../settings'
import { useAgentSettings } from '../composables/useAgentSettings'
import AgentProfileForm from './AgentProfileForm.vue'
const {
  selectedId,
  preset,
  draft,
  options,
  loading,
  busy,
  error,
  message,
  add,
  submit,
  remove,
  initialize,
} = useAgentSettings()
const desktop = agentApi.isDesktop()
</script>
<template>
  <section
    class="flex h-full min-h-0 flex-col"
    aria-label="AI Agent 配置"
  >
    <div class="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
      <div>
        <h3 class="flex items-center gap-2 text-[15px] font-semibold">
          <AppIcon
            name="lucide:sparkles"
            :size="18"
            class="text-accent"
          />AI Agent
        </h3>
        <p class="text-muted mt-2 text-xs leading-6">
          为你的文档选择模型。支持多份配置，在阅读与写作时随时切换。
        </p>
      </div>
      <p
        v-if="!desktop"
        class="bg-hover text-secondary rounded-md px-3 py-2.5 text-xs leading-5"
      >
        浏览器可预览配置界面，请在 MiraiNote 桌面程序中保存、测试和使用 AI。
      </p>
      <p
        v-if="loading"
        role="status"
        class="text-muted text-xs"
      >
        正在读取配置…
      </p>
      <div
        v-else
        class="space-y-4"
      >
        <AppSelect
          v-if="options.length"
          v-model="selectedId"
          label="我的配置"
          :options="options"
          :disabled="busy"
        />
        <div class="flex items-end gap-2">
          <AppSelect
            v-model="preset"
            class="min-w-0 flex-1"
            label="添加服务配置"
            :options="providerPresets"
            :disabled="busy"
          /><AppButton
            :disabled="busy"
            class="mb-px shrink-0"
            @click="add"
            ><AppIcon
              name="lucide:plus"
              :size="14"
            />添加</AppButton
          >
        </div>
      </div>
      <AgentProfileForm
        v-if="draft"
        :key="selectedId"
        v-model="draft"
        :disabled="busy || loading"
      />
      <div class="text-muted flex items-start gap-2 text-[11px] leading-5">
        <AppIcon
          name="lucide:lock-keyhole"
          :size="14"
          class="mt-0.5 shrink-0"
        />
        <p>
          密钥由 Windows
          为当前用户加密保存。发送消息会将当前文档内容交给所选模型；测试连接只发送固定测试消息。
        </p>
      </div>
    </div>
    <footer
      class="border-line bg-elevated shrink-0 space-y-2 border-t px-6 py-3.5"
    >
      <p
        v-if="error"
        role="alert"
        class="text-danger text-xs leading-5"
      >
        {{ error
        }}<button
          v-if="!draft"
          class="ml-2 underline"
          @click="initialize"
        >
          重试
        </button>
      </p>
      <p
        v-if="message"
        role="status"
        class="text-accent text-xs leading-5"
      >
        {{ message }}
      </p>
      <div class="flex flex-wrap items-center gap-2">
        <AppButton
          variant="primary"
          :disabled="busy || loading || !desktop || !draft"
          @click="submit()"
          >{{ busy ? '处理中…' : '保存并使用' }}</AppButton
        ><AppButton
          :disabled="busy || loading || !desktop || !draft?.enabled"
          @click="submit(true)"
          >测试连接</AppButton
        ><AppButton
          variant="ghost"
          class="ml-auto text-xs"
          :disabled="busy || loading || !draft || (!!draft.id && !desktop)"
          @click="remove"
          >删除配置</AppButton
        >
      </div>
      <p class="text-muted text-[10px] leading-5">
        保存或切换配置会停止当前任务，并开始新的对话。
      </p>
    </footer>
  </section>
</template>
