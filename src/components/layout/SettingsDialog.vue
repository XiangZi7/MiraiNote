<script setup lang="ts">
import { defineAsyncComponent } from 'vue'
import { useOverlaysStore } from '@/stores/overlays'
import { AppIcon } from '@/components/ui'
import AppDialog from '@/components/ui/AppDialog.vue'
import GeneralSettings from './GeneralSettings.vue'
const AgentSettingsPanel = defineAsyncComponent(
  () => import('@/modules/ai/components/AgentSettingsPanel.vue')
)
const overlays = useOverlaysStore()
const sections = [
  { id: 'general', label: '通用', icon: 'lucide:settings-2' },
  { id: 'ai', label: 'AI Agent', icon: 'lucide:sparkles' },
] as const
</script>
<template>
  <AppDialog
    title="设置"
    width="840px"
    :scrollable="false"
    @close="overlays.state.settings = false"
  >
    <div class="border-line flex h-[min(620px,60vh)] min-h-0 border-t">
      <nav
        aria-label="设置分类"
        class="border-line bg-sidebar/50 w-36 shrink-0 space-y-1 border-r p-3"
      >
        <button
          v-for="section in sections"
          :key="section.id"
          class="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-xs"
          :class="
            overlays.state.settingsSection === section.id
              ? 'bg-selected text-primary font-medium'
              : 'text-secondary hover:bg-hover'
          "
          :aria-current="
            overlays.state.settingsSection === section.id ? 'page' : undefined
          "
          @click="overlays.state.settingsSection = section.id"
        >
          <AppIcon
            :name="section.icon"
            :size="15"
          />{{ section.label }}
        </button>
      </nav>
      <div class="min-h-0 min-w-0 flex-1">
        <GeneralSettings
          v-show="overlays.state.settingsSection === 'general'"
          class="h-full overflow-y-auto pt-5"
        />
        <KeepAlive
          ><AgentSettingsPanel v-if="overlays.state.settingsSection === 'ai'"
        /></KeepAlive>
      </div>
    </div>
  </AppDialog>
</template>
