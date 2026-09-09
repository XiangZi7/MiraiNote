<script setup lang="ts">
import { computed, onMounted, reactive, toRefs, useTemplateRef } from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import IconButton from '@/components/ui/IconButton.vue'

const query = defineModel<string>('query', { required: true })
const caseSensitive = defineModel<boolean>('caseSensitive', { default: false })
const wholeWord = defineModel<boolean>('wholeWord', { default: false })
const props = withDefaults(
  defineProps<{
    total: number
    current: number
    replaceAllowed?: boolean
    label?: string
  }>(),
  { label: '搜索文档内容', replaceAllowed: false }
)
const emit = defineEmits<{
  close: []
  next: []
  previous: []
  replace: [replacement: string, all: boolean]
}>()
// 响应式状态
const state = reactive({
  // 是否展开替换操作
  replacing: false,
  // 替换为的文本
  replacement: '',
})
const { replacing, replacement } = toRefs(state)
const input = useTemplateRef('input')
const status = computed(() =>
  !query.value
    ? '输入关键词'
    : props.total
      ? `${props.current} / ${props.total}`
      : '无匹配结果'
)
function focus() {
  input.value?.focus()
  input.value?.select()
}
function keydown(event: KeyboardEvent) {
  if (event.isComposing) return
  if (event.key === 'Escape') {
    event.preventDefault()
    event.stopPropagation()
    emit('close')
  } else if (event.key === 'Enter') {
    event.preventDefault()
    if (event.shiftKey) emit('previous')
    else emit('next')
  }
}
onMounted(focus)
defineExpose({ focus })
</script>

<template>
  <section
    class="document-search"
    role="search"
    aria-label="文内查找"
    @keydown="keydown"
  >
    <div class="search-row">
      <div class="search-field">
        <AppIcon
          name="lucide:search"
          :size="16"
          class="text-accent shrink-0"
        />
        <input
          ref="input"
          v-model="query"
          :aria-label="label"
          placeholder="在当前文档中查找…"
          autocomplete="off"
          spellcheck="false"
        />
        <span
          class="search-count"
          :class="{ 'search-empty': query && !total }"
          role="status"
          aria-live="polite"
          >{{ status }}</span
        >
        <button
          class="search-option"
          :class="{ selected: caseSensitive }"
          :aria-pressed="caseSensitive"
          title="区分大小写"
          aria-label="区分大小写"
          @click="caseSensitive = !caseSensitive"
        >
          Aa
        </button>
        <button
          class="search-option"
          :class="{ selected: wholeWord }"
          :aria-pressed="wholeWord"
          title="全词匹配"
          aria-label="全词匹配"
          @click="wholeWord = !wholeWord"
        >
          <AppIcon
            name="lucide:whole-word"
            :size="17"
          />
        </button>
      </div>
      <div class="search-actions">
        <IconButton
          icon="lucide:chevron-up"
          label="上一个匹配 (Shift+Enter)"
          :disabled="!total"
          @click="emit('previous')"
        />
        <IconButton
          icon="lucide:chevron-down"
          label="下一个匹配 (Enter)"
          :disabled="!total"
          @click="emit('next')"
        />
        <IconButton
          v-if="replaceAllowed"
          icon="lucide:replace"
          label="展开替换"
          :active="replacing"
          @click="replacing = !replacing"
        />
        <span class="search-divider" />
        <IconButton
          icon="lucide:x"
          label="关闭查找 (Esc)"
          @click="emit('close')"
        />
      </div>
    </div>
    <div
      v-if="replaceAllowed && replacing"
      class="search-row replacement-row"
    >
      <div class="search-field">
        <AppIcon
          name="lucide:replace"
          :size="16"
          class="text-secondary shrink-0"
        />
        <input
          v-model="replacement"
          aria-label="替换为"
          placeholder="替换为…"
          @keydown.enter.stop.prevent="emit('replace', replacement, false)"
        />
      </div>
      <button
        class="replace-button"
        :disabled="!total"
        @click="emit('replace', replacement, false)"
      >
        替换
      </button>
      <button
        class="replace-button"
        :disabled="!total"
        @click="emit('replace', replacement, true)"
      >
        全部替换
      </button>
    </div>
  </section>
</template>

<style scoped>
.document-search {
  position: relative;
  z-index: var(--z-document-search);
  flex-shrink: 0;
  padding: 10px 16px;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  container-type: inline-size;
}
.search-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}
.search-field {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
  padding: 4px 8px 4px 11px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--editor);
  transition:
    border-color 150ms,
    box-shadow 150ms;
}
.search-field:focus-within {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft);
}
.search-field input {
  width: 0;
  min-width: 40px;
  flex: 1;
  height: 26px;
  padding: 0;
  border: 0;
  outline: none;
  background: transparent;
  font-size: 12px;
}
.search-field input::placeholder {
  color: var(--muted);
}
.search-count {
  flex-shrink: 0;
  color: var(--secondary);
  font-size: 11px;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.search-empty {
  color: var(--danger);
}
.search-option {
  display: grid;
  place-items: center;
  width: 27px;
  height: 26px;
  flex-shrink: 0;
  border-radius: 5px;
  color: var(--secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
}
.search-option:hover {
  background: var(--hover);
}
.search-option.selected {
  background: var(--accent-soft);
  color: var(--accent);
}
.search-actions {
  display: flex;
  align-items: center;
  gap: 3px;
}
.search-actions :deep(button) {
  cursor: pointer;
}
.search-divider {
  width: 1px;
  height: 16px;
  margin: 0 3px;
  background: var(--border);
}
.replacement-row {
  margin-top: 8px;
}
.replace-button {
  flex-shrink: 0;
  padding: 7px 10px;
  border: 1px solid var(--border);
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
}
.replace-button:enabled:hover {
  background: var(--hover);
}
@container (max-width: 440px) {
  .search-row {
    flex-wrap: wrap;
    gap: 6px;
  }
  .search-field {
    flex-basis: 100%;
  }
  .search-actions {
    margin-left: auto;
  }
}
</style>
