<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useOverlaysStore } from '@/stores/overlays'
import { useSettingsStore } from '@/stores/settings'
import { documentTypes, formatDate, formatSize } from '@/utils/documents'
import { AppIcon, IconButton, TextInput } from '@/components/ui'
const workspace = useWorkspaceStore()
const overlays = useOverlaysStore()
const settings = useSettingsStore()
const document = computed(() => workspace.currentDocument)
const newTag = shallowRef('')
const adding = shallowRef(false)
function addTag() {
  const tag = newTag.value.trim()
  if (tag && document.value && !document.value.tags.includes(tag))
    document.value.tags.push(tag)
  newTag.value = ''
  adding.value = false
}
</script>

<template>
  <aside
    class="bg-inspector h-full shrink-0 overflow-y-auto"
    :style="{ width: `${settings.settings.inspectorWidth}px` }"
    aria-label="文件信息"
  >
    <header class="flex h-11 items-center justify-between px-5">
      <span class="text-muted text-xs">文件信息</span
      ><IconButton
        icon="lucide:x"
        label="关闭文件信息"
        @click="overlays.state.inspector = false"
      />
    </header>
    <template v-if="document">
      <section class="px-5 pt-5 pb-4">
        <div class="mb-4 flex items-start gap-3">
          <AppIcon
            :name="documentTypes[document.kind].icon"
            :size="21"
            class="text-secondary mt-0.5"
          />
          <h2
            class="min-w-0 flex-1 text-[14px] leading-6 font-semibold wrap-break-word"
          >
            {{ document.name }}
          </h2>
        </div>
        <p class="text-secondary mb-4">
          {{ documentTypes[document.kind].label }}
        </p>
        <dl class="space-y-3 text-xs">
          <div class="flex justify-between gap-3">
            <dt class="text-muted">大小</dt>
            <dd class="text-secondary">{{ formatSize(document.size) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted shrink-0">创建时间</dt>
            <dd class="text-secondary">{{ formatDate(document.createdAt) }}</dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted shrink-0">修改时间</dt>
            <dd class="text-secondary">
              {{ formatDate(document.modifiedAt) }}
            </dd>
          </div>
          <div class="flex justify-between gap-3">
            <dt class="text-muted shrink-0">所在位置</dt>
            <dd
              class="text-secondary truncate"
              :title="document.path"
            >
              {{ document.path.split('/').slice(0, -1).join('/') }}
            </dd>
          </div>
          <div
            v-if="document.pages"
            class="flex justify-between"
          >
            <dt class="text-muted">页数</dt>
            <dd class="text-secondary">{{ document.pages }}</dd>
          </div>
          <div
            v-if="document.kind === 'markdown'"
            class="flex justify-between"
          >
            <dt class="text-muted">字数</dt>
            <dd class="text-secondary">
              {{ document.content.replace(/\s/g, '').length }} 字
            </dd>
          </div>
        </dl>
      </section>
      <section class="border-line border-t px-5 py-5">
        <h3 class="text-muted mb-3 text-xs font-normal">标签</h3>
        <div class="flex flex-wrap items-center gap-1.5">
          <button
            v-for="tag in document.tags"
            :key="tag"
            class="border-line bg-sidebar/30 text-secondary hover:bg-hover rounded-full border px-2.5 py-0.5 text-xs"
            :title="`移除标签 ${tag}`"
            @click="document.tags = document.tags.filter(item => item !== tag)"
          >
            {{ tag }}</button
          ><IconButton
            icon="lucide:plus"
            label="添加标签"
            class="bg-hover/60 !size-6 !rounded-full"
            @click="adding = !adding"
          />
        </div>
        <form
          v-if="adding"
          class="mt-3"
          @submit.prevent="addTag"
        >
          <TextInput
            v-model="newTag"
            aria-label="新标签"
            placeholder="输入标签后按回车"
            maxlength="24"
            @keydown.esc="adding = false"
          />
        </form>
      </section>
      <section class="border-line border-t px-5 py-4">
        <button
          class="text-secondary hover:text-primary flex w-full items-center gap-3 rounded-md py-1.5 text-xs"
          :aria-pressed="document.favorite"
          @click="document.favorite = !document.favorite"
        >
          <AppIcon
            name="lucide:star"
            :size="16"
            :class="document.favorite ? 'fill-accent/20 text-accent' : ''"
          />{{ document.favorite ? '已收藏' : '添加到收藏' }}
        </button>
        <p
          v-if="document.source === 'example'"
          class="text-muted mt-5 text-[11px] leading-5"
        >
          示例文档 · 用于界面与交互预览
        </p>
      </section>
    </template>
    <div
      v-else
      class="text-muted px-5 py-12 text-center text-xs"
    >
      打开一份文档，查看文件属性。
    </div>
  </aside>
</template>
