<script setup lang="ts">
import {
  computed,
  nextTick,
  reactive,
  toRefs,
  useId,
  useTemplateRef,
} from 'vue'
import { onClickOutside, useEventListener } from '@vueuse/core'
import { AppButton, AppIcon, IconButton, TextInput } from '@/components/ui'
import type { AgentConversationSummary } from '../types'
const props = defineProps<{
  conversations: AgentConversationSummary[]
  activeId: string
  loading: boolean
  mutating: boolean
  disabled: boolean
  error: string
}>()
const emit = defineEmits<{
  select: [id: string]
  rename: [id: string, title: string]
  remove: [id: string]
  refresh: []
}>()
const trigger = useTemplateRef<HTMLButtonElement>('trigger')
const menu = useTemplateRef<HTMLElement>('menu')
const search = useTemplateRef<HTMLInputElement>('search')
const menuId = useId()
const titleId = useId()
// 响应式状态
const state = reactive({
  // 是否展开聊天记录
  open: false,
  // 会话搜索关键词
  keyword: '',
  // 正在改名的会话 ID
  editingId: '',
  // 编辑中的会话名称
  draft: '',
  // 等待确认删除的会话
  deleting: null as AgentConversationSummary | null,
  // 弹层位置
  left: 0,
  top: 0,
  width: 320,
  maxHeight: 420,
})
const { open, keyword, editingId, draft, deleting } = toRefs(state)
const visible = computed(() => {
  const term = state.keyword.trim().toLocaleLowerCase()
  return props.conversations.filter(item =>
    `${item.title} ${item.model}`.toLocaleLowerCase().includes(term)
  )
})
const unavailable = computed(() => props.disabled || props.mutating)
const style = computed(() => ({
  left: `${state.left}px`,
  top: `${state.top}px`,
  width: `${state.width}px`,
  maxHeight: `${state.maxHeight}px`,
}))
function when(value: number) {
  return new Date(value).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}
function position() {
  const rect = trigger.value?.getBoundingClientRect()
  if (!rect) return
  state.width = Math.min(320, window.innerWidth - 16)
  state.left = Math.max(
    8,
    Math.min(rect.right - state.width, window.innerWidth - state.width - 8)
  )
  state.top = rect.bottom + 6
  state.maxHeight = Math.max(160, window.innerHeight - state.top - 16)
}
function close(restoreFocus = true) {
  state.open = false
  state.editingId = ''
  state.deleting = null
  if (restoreFocus) trigger.value?.focus()
}
async function toggle() {
  if (state.open) {
    close()
    return
  }
  state.keyword = ''
  state.open = true
  position()
  emit('refresh')
  await nextTick()
  search.value?.focus()
}
function select(id: string) {
  if (unavailable.value) return
  close()
  emit('select', id)
}
async function edit(item: AgentConversationSummary) {
  state.deleting = null
  state.editingId = item.id
  state.draft = item.title
  await nextTick()
  const input = menu.value?.querySelector<HTMLInputElement>('[data-rename]')
  input?.focus()
  input?.select()
}
function save() {
  const title = state.draft.trim()
  if (!title || unavailable.value) return
  const id = state.editingId
  state.editingId = ''
  if (props.conversations.find(item => item.id === id)?.title !== title)
    emit('rename', id, title)
}
function escape() {
  if (props.mutating) return
  if (state.editingId) state.editingId = ''
  else if (state.deleting) state.deleting = null
  else close()
}
function confirmRemove() {
  const item = state.deleting
  if (!item || props.mutating) return
  state.deleting = null
  emit('remove', item.id)
}
onClickOutside(
  menu,
  () => {
    if (state.open && !state.editingId && !props.mutating) close(false)
  },
  { ignore: [trigger] }
)
useEventListener(window, 'resize', () => {
  if (state.open) position()
})
</script>
<template>
  <button
    ref="trigger"
    type="button"
    class="text-secondary enabled:hover:bg-hover enabled:hover:text-primary inline-flex size-7 shrink-0 items-center justify-center rounded-[5px] transition-colors duration-150 disabled:cursor-default disabled:opacity-40"
    :class="{ 'text-accent': open, 'text-danger': error }"
    aria-label="聊天记录"
    title="聊天记录"
    :disabled="disabled"
    aria-haspopup="dialog"
    :aria-expanded="open"
    :aria-controls="open ? menuId : undefined"
    @click="toggle"
  >
    <AppIcon name="lucide:history" />
  </button>
  <Teleport to="body">
    <section
      v-if="open"
      :id="menuId"
      ref="menu"
      role="dialog"
      :aria-labelledby="titleId"
      class="border-line bg-elevated fixed z-50 flex flex-col rounded-lg border shadow-lg"
      :style="style"
      tabindex="-1"
      @keydown.esc.prevent.stop="escape"
    >
      <header class="flex shrink-0 items-center gap-1.5 px-3 py-2">
        <h3
          :id="titleId"
          class="flex-1 text-xs font-medium"
        >
          聊天记录
        </h3>
        <span class="text-muted text-[10px]">{{ conversations.length }}</span>
        <IconButton
          icon="lucide:refresh-cw"
          label="刷新聊天记录"
          :disabled="loading || unavailable"
          @click="emit('refresh')"
        /><IconButton
          icon="lucide:x"
          label="关闭聊天记录"
          @click="close()"
        />
      </header>
      <label
        class="border-line bg-surface focus-within:border-accent mx-3 mb-2 flex shrink-0 items-center gap-2 rounded-md border px-2 py-1.5"
      >
        <AppIcon
          name="lucide:search"
          class="text-muted shrink-0"
        /><input
          ref="search"
          v-model="keyword"
          aria-label="搜索聊天记录"
          placeholder="搜索会话"
          class="min-w-0 flex-1 bg-transparent text-xs outline-none"
          :disabled="Boolean(editingId) || mutating"
        />
      </label>
      <div class="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <p
          v-if="loading && !conversations.length"
          role="status"
          class="text-muted py-6 text-center text-[11px]"
        >
          正在加载…
        </p>
        <ul
          v-else
          aria-label="历史会话列表"
        >
          <li
            v-for="item in visible"
            :key="item.id"
            class="hover:bg-hover flex items-center gap-1 rounded-md"
            :class="item.id === activeId && 'bg-accent-soft'"
          >
            <form
              v-if="editingId === item.id"
              class="flex min-w-0 flex-1 items-center gap-1 p-1.5"
              @submit.prevent="save"
            >
              <TextInput
                v-model="draft"
                data-rename
                aria-label="会话名称"
                maxlength="60"
                :disabled="unavailable"
              /><button
                type="submit"
                class="text-secondary enabled:hover:bg-hover enabled:hover:text-primary inline-flex size-7 shrink-0 items-center justify-center rounded-[5px] disabled:cursor-default disabled:opacity-40"
                aria-label="保存名称"
                title="保存名称"
                :disabled="unavailable || !draft.trim()"
              >
                <AppIcon name="lucide:check" /></button
              ><IconButton
                icon="lucide:x"
                label="取消改名"
                :disabled="mutating"
                @click="editingId = ''"
              />
            </form>
            <template v-else>
              <button
                class="flex min-w-0 flex-1 flex-col gap-0.5 px-2 py-2 text-left"
                :aria-current="item.id === activeId ? 'true' : undefined"
                :title="item.title"
                :disabled="unavailable"
                @click="select(item.id)"
              >
                <span class="truncate text-xs">{{ item.title }}</span
                ><span class="text-muted truncate text-[10px]"
                  >{{ when(item.updatedAt) }} · {{ item.model }}</span
                >
              </button>
              <IconButton
                icon="lucide:pencil"
                :label="`重命名 ${item.title}`"
                :disabled="unavailable"
                @click="edit(item)"
              /><IconButton
                icon="lucide:trash-2"
                :label="`删除 ${item.title}`"
                :disabled="unavailable"
                @click="deleting = item"
              />
            </template>
          </li>
        </ul>
        <p
          v-if="!loading && !visible.length"
          class="text-muted py-6 text-center text-[11px]"
        >
          {{ keyword.trim() ? '没有匹配的会话' : '这份文档还没有聊天记录' }}
        </p>
      </div>
      <div
        v-if="deleting"
        class="border-line text-secondary shrink-0 border-t px-3 py-2.5 text-[11px] leading-5"
      >
        <p>删除「{{ deleting.title }}」及其聊天记录？此操作无法撤销。</p>
        <div class="mt-2 flex justify-end gap-2">
          <AppButton
            variant="ghost"
            class="text-xs"
            :disabled="mutating"
            @click="deleting = null"
            >取消</AppButton
          ><AppButton
            class="text-danger text-xs"
            :disabled="mutating"
            @click="confirmRemove"
            >确认删除</AppButton
          >
        </div>
      </div>
      <p
        v-if="error"
        role="alert"
        class="text-danger shrink-0 px-3 py-2 text-[11px] leading-5"
      >
        {{ error }}
      </p>
    </section>
  </Teleport>
</template>
