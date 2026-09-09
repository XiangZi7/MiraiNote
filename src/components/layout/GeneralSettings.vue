<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'
import { AppIcon, SegmentedControl } from '@/components/ui'
import { windowApi } from '@/api/ipc/window'
import AboutSection from './AboutSection.vue'
const settings = useSettingsStore()
const desktop = windowApi.isDesktop()
</script>
<template>
  <div class="space-y-7 px-6 pt-3 pb-7">
    <section>
      <h3 class="text-muted mb-4 text-xs font-medium">外观</h3>
      <div class="flex items-center justify-between gap-4">
        <span class="flex items-center gap-3 text-[13px]"
          ><AppIcon
            name="lucide:palette"
            class="text-secondary"
          />主题</span
        ><SegmentedControl
          v-model="settings.settings.theme"
          label="应用主题"
          :options="[
            { label: '跟随系统', value: 'system' },
            { label: '浅色', value: 'light' },
            { label: '深色', value: 'dark' },
          ]"
        />
      </div>
    </section>
    <section class="border-line border-t pt-5">
      <h3 class="text-muted mb-4 text-xs font-medium">编辑器</h3>
      <label class="flex items-center justify-between gap-4"
        ><span>字体大小</span>
        <div class="flex items-center gap-3">
          <input
            v-model.number="settings.settings.editorFontSize"
            aria-label="编辑器字体大小"
            type="range"
            min="12"
            max="20"
            step="1"
            class="accent-accent w-28"
          /><span class="text-secondary w-9 text-xs"
            >{{ settings.settings.editorFontSize }} px</span
          >
        </div></label
      ><label class="mt-5 flex cursor-pointer items-center justify-between"
        ><span
          ><span class="block">自动保存草稿</span
          ><span class="text-muted mt-1 block text-[11px]"
            >编辑后自动保存到此设备的工作区</span
          ></span
        ><input
          v-model="settings.settings.autoSave"
          type="checkbox"
          class="peer sr-only" /><span
          class="bg-faint peer-checked:bg-accent peer-focus-visible:outline-accent relative h-5 w-9 rounded-full transition-colors peer-focus-visible:outline-2 after:absolute after:top-0.5 after:left-0.5 after:size-4 after:rounded-full after:bg-white after:shadow-sm after:transition-transform peer-checked:after:translate-x-4"
      /></label>
    </section>
    <section
      v-if="desktop"
      class="border-line border-t pt-5"
    >
      <h3 class="text-muted mb-3 text-xs font-medium">系统托盘</h3>
      <p class="text-muted mt-3 text-xs leading-6">
        关闭窗口后继续在托盘运行，点击托盘图标可恢复窗口。
        完全退出请右键托盘图标，选择“退出
        MiraiNote”。再次打开应用会恢复已有窗口。
      </p>
    </section>
    <AboutSection />
  </div>
</template>
