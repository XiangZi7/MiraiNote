<script setup lang="ts">
import {
  nextTick,
  onBeforeUnmount,
  onMounted,
  onActivated,
  onDeactivated,
  shallowRef,
  useId,
  useTemplateRef,
} from 'vue'
import AppIcon from '@/components/ui/AppIcon.vue'
import IconButton from '@/components/ui/IconButton.vue'

export interface OutlineEntry {
  id: string
  title: string
  level: number
  disabled?: boolean
}
withDefaults(
  defineProps<{
    items: OutlineEntry[]
    activeId?: string
    emptyText?: string
  }>(),
  {
    activeId: '',
    emptyText: '这份文档还没有标题，添加标题后会显示在这里。',
  }
)
const emit = defineEmits<{ select: [id: string] }>()
const open = shallowRef(false)
const panelId = useId()
const root = useTemplateRef('root')
const toggle = useTemplateRef('toggle')
const navigation = useTemplateRef('navigation')
function close(restoreFocus = true) {
  open.value = false
  if (restoreFocus) toggle.value?.focus()
}
async function expand(focus = false) {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    const current = navigation.value?.querySelector<HTMLButtonElement>(
      '[aria-current="location"]'
    )
    current?.scrollIntoView({ block: 'nearest' })
    if (focus)
      (
        current ??
        navigation.value?.querySelector<HTMLButtonElement>('button:enabled')
      )?.focus()
  }
}
function outside(event: PointerEvent) {
  if (
    open.value &&
    event.target instanceof Node &&
    !root.value?.contains(event.target)
  )
    close(false)
}
function select(id: string) {
  emit('select', id)
  close()
}
function keyboard(event: KeyboardEvent) {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  const buttons = Array.from(
    navigation.value?.querySelectorAll<HTMLButtonElement>('button:enabled') ??
      []
  )
  if (!buttons.length) return
  event.preventDefault()
  const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
  const next =
    event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? buttons.length - 1
        : (index + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) %
          buttons.length
  buttons[next]?.focus()
}
onMounted(() => document.addEventListener('pointerdown', outside))
onActivated(() => document.addEventListener('pointerdown', outside))
onDeactivated(() => document.removeEventListener('pointerdown', outside))
onBeforeUnmount(() => document.removeEventListener('pointerdown', outside))
</script>

<template>
  <div
    ref="root"
    class="document-outline"
    @keydown.esc.stop="close()"
  >
    <button
      ref="toggle"
      class="outline-toggle"
      :class="{ expanded: open }"
      :aria-expanded="open"
      :aria-controls="panelId"
      aria-label="文档目录"
      @click="expand()"
      @keydown.down.prevent="!open && expand(true)"
    >
      <AppIcon
        name="lucide:list-tree"
        :size="16"
      />
      <span>目录</span>
      <span
        v-if="items.length"
        class="outline-count"
        >{{ items.length }}</span
      >
      <AppIcon
        name="lucide:chevron-down"
        :size="12"
        class="outline-chevron"
      />
    </button>
    <Transition name="fade">
      <section
        v-if="open"
        :id="panelId"
        class="outline-panel"
      >
        <header class="outline-header">
          <div>
            <strong>文档目录</strong
            ><span>{{
              items.length ? `${items.length} 个章节 · 点击跳转` : '章节导航'
            }}</span>
          </div>
          <IconButton
            icon="lucide:x"
            label="收起目录"
            @click="close()"
          />
        </header>
        <nav
          ref="navigation"
          aria-label="文档标题目录"
          class="outline-navigation"
          @keydown="keyboard"
        >
          <button
            v-for="item in items"
            :key="item.id"
            :disabled="item.disabled"
            :title="item.title"
            :aria-current="item.id === activeId ? 'location' : undefined"
            class="outline-item"
            :class="{ 'outline-top-level': item.level === 1 }"
            :style="{
              '--heading-depth': Math.min(Math.max(item.level - 1, 0), 5),
            }"
            @click="select(item.id)"
          >
            <span
              class="outline-marker"
              aria-hidden="true"
            />
            <span class="outline-title">{{ item.title }}</span>
          </button>
          <div
            v-if="!items.length"
            class="outline-empty"
          >
            <AppIcon
              name="lucide:list-tree"
              :size="25"
            />
            <p>{{ emptyText }}</p>
          </div>
        </nav>
        <footer
          v-if="items.length"
          class="outline-footer"
        >
          <span>↑ ↓ 选择章节</span><span>Esc 收起</span>
        </footer>
      </section>
    </Transition>
  </div>
</template>

<style scoped>
.document-outline {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: var(--z-document-outline);
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  max-height: calc(100% - 24px);
  max-width: calc(100% - 24px);
}
.outline-toggle {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  height: 34px;
  padding: 0 11px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--surface);
  color: var(--secondary);
  box-shadow: 0 2px 6px #17203408;
  font-size: 12px;
  cursor: pointer;
  transition:
    color 150ms,
    border-color 150ms;
}
.outline-toggle:hover,
.outline-toggle.expanded {
  color: var(--accent);
  border-color: color-mix(in srgb, var(--accent) 45%, var(--border));
}
.outline-count {
  border-radius: 4px;
  padding: 0 5px;
  background: var(--bg);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}
.outline-chevron {
  transition: transform 150ms;
}
.expanded .outline-chevron {
  transform: rotate(180deg);
}
.outline-panel {
  display: flex;
  flex-direction: column;
  width: 280px;
  max-width: 100%;
  min-height: 0;
  margin-top: 8px;
  overflow: hidden;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: var(--surface);
  box-shadow: var(--shadow);
}
.outline-header {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 12px 12px 16px;
  border-bottom: 1px solid var(--border);
}
.outline-header strong {
  display: block;
  color: var(--text);
  font-size: 12px;
  font-weight: 600;
}
.outline-header div > span {
  display: block;
  margin-top: 3px;
  color: var(--secondary);
  font-size: 10px;
}
.outline-navigation {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 8px;
}
.outline-item {
  position: relative;
  display: flex;
  align-items: baseline;
  gap: 9px;
  width: 100%;
  margin: 2px 0;
  padding: 8px 10px 8px calc(10px + var(--heading-depth) * 12px);
  border-radius: 6px;
  color: var(--secondary);
  text-align: left;
  font-size: 12px;
  line-height: 1.6;
  cursor: pointer;
  transition:
    background 150ms,
    color 150ms;
}
.outline-item:enabled:hover {
  background: var(--hover);
  color: var(--text);
}
.outline-title {
  overflow-wrap: anywhere;
}
.outline-top-level {
  font-weight: 600;
  color: var(--text);
}
.outline-marker {
  position: relative;
  top: -2px;
  flex-shrink: 0;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--faint);
}
.outline-item[aria-current] {
  color: var(--accent);
  background: var(--accent-soft);
}
.outline-item[aria-current]::before {
  content: '';
  position: absolute;
  left: 0;
  top: 8px;
  bottom: 8px;
  width: 2px;
  border-radius: 2px;
  background: var(--accent);
}
.outline-item[aria-current] .outline-marker {
  background: var(--accent);
}
.outline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding: 22px 14px;
  color: var(--secondary);
  text-align: center;
  font-size: 12px;
  line-height: 1.8;
}
.outline-empty svg {
  color: var(--muted);
}
.outline-footer {
  display: flex;
  flex-shrink: 0;
  justify-content: space-between;
  padding: 9px 16px;
  border-top: 1px solid var(--border);
  background: var(--editor);
  color: var(--secondary);
  font-size: 10px;
}
</style>
