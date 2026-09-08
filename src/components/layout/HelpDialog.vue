<script setup lang="ts">
import { useOverlaysStore } from '@/stores/overlays'
import AppDialog from '@/components/ui/AppDialog.vue'
const overlays = useOverlaysStore()
const shortcuts = [
  ['新建 Markdown', 'Ctrl N'],
  ['打开 Markdown', 'Ctrl O'],
  ['保存工作区草稿', 'Ctrl S'],
  ['导出文档', 'Ctrl Shift S'],
  ['关闭标签页', 'Ctrl W'],
  ['恢复标签页', 'Ctrl Shift T'],
  ['切换标签页', 'Ctrl Tab'],
  ['全局搜索', 'Ctrl K'],
  ['文档内查找', 'Ctrl F'],
  ['粗体 / 斜体', 'Ctrl B / I'],
  ['命令面板', 'Ctrl Shift P'],
  ['切换侧栏', 'Ctrl Shift B'],
]
</script>

<template>
  <AppDialog
    title="键盘快捷键"
    @close="overlays.state.help = false"
    ><div class="px-6 pt-2 pb-6">
      <div
        v-for="[label, key] in shortcuts"
        :key="label"
        class="border-line/70 text-secondary flex items-center justify-between border-b py-2.5 text-xs"
      >
        <span>{{ label }}</span
        ><kbd>{{ key }}</kbd>
      </div>
      <p class="text-muted mt-5 text-xs leading-6">
        拖动标签页可排序；拖到文档面板边缘可分屏。拖动分隔线调整空间。双击标题栏可最大化或还原窗口。
      </p>
    </div></AppDialog
  >
</template>
