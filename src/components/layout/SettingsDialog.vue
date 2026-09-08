<script setup lang="ts">
import { useSettingsStore } from '@/stores/settings'
import { useOverlaysStore } from '@/stores/overlays'
import { AppIcon, SegmentedControl } from '@/components/ui'
import AppDialog from '@/components/ui/AppDialog.vue'
const settings = useSettingsStore(),
  overlays = useOverlaysStore()
</script>

<template>
  <AppDialog
    title="设置"
    @close="overlays.state.settings = false"
    ><div class="space-y-7 px-6 pt-3 pb-7">
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
      <section class="border-line border-t pt-5">
        <h3 class="text-muted mb-3 text-xs font-medium">关于</h3>
        <div class="flex justify-between">
          <span class="font-medium">MiraiHub Docs</span
          ><span class="text-muted text-xs">0.1.0 · UI 阶段</span>
        </div>
        <p class="text-muted mt-3 text-xs leading-6">
          当前版本提供工作台界面与示例交互。使用
          CodeMirror、PDF.js、docx-preview 与 Tiptap。可导入
          Markdown、PDF、DOCX；编辑保存为本地草稿。桌面源文件写回与 AI
          连接仍待接入。
        </p>
      </section>
    </div></AppDialog
  >
</template>
