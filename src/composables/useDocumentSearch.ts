import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  reactive,
  watch,
} from 'vue'
import type { DocumentSearchTarget } from '@/utils/text-search'

export function useDocumentSearch(options: {
  target: () => DocumentSearchTarget | null | undefined
  active: () => boolean
  revision: () => unknown
  focusInput: () => void
}) {
  // 响应式状态
  const state = reactive({
    // 查找栏是否打开
    open: false,
    // 当前查询文本
    query: '',
    // 是否区分大小写
    caseSensitive: false,
    // 是否匹配完整单词
    wholeWord: false,
    // 匹配总数
    total: 0,
    // 当前匹配下标
    index: -1,
  })
  const current = computed(() => state.index + 1)
  let previousTarget: DocumentSearchTarget | null | undefined
  let disposed = false
  let scheduled = false
  let resetPending = false

  function scheduleRefresh(reset: boolean) {
    resetPending ||= reset
    if (scheduled) return
    scheduled = true
    // Template refs are assigned before a newly mounted editor initializes.
    void nextTick(() => {
      scheduled = false
      const reset = resetPending
      resetPending = false
      if (!disposed) refresh(reset)
    })
  }

  function refresh(reset = true, reveal = reset) {
    const target = options.target()
    if (previousTarget !== target) previousTarget?.clearSearch()
    previousTarget = target
    if (!state.open || !target) {
      target?.clearSearch()
      state.total = 0
      state.index = -1
      return
    }
    state.total = target.find(state)
    state.index = state.total
      ? reset
        ? 0
        : Math.min(Math.max(0, state.index), state.total - 1)
      : -1
    target.selectMatch(state.index, reveal)
  }
  watch(
    [
      () => state.open,
      () => state.query,
      () => state.caseSensitive,
      () => state.wholeWord,
      options.target,
    ],
    () => scheduleRefresh(true),
    { flush: 'post' }
  )
  watch(options.revision, () => scheduleRefresh(false), { flush: 'post' })

  async function open() {
    state.open = true
    await nextTick()
    options.focusInput()
  }
  function close() {
    state.open = false
    refresh()
    options.target()?.focus()
  }
  function move(direction: number) {
    if (!state.total) return
    state.index = (state.index + direction + state.total) % state.total
    options.target()?.selectMatch(state.index)
  }
  async function replace(replacement: string, all = false) {
    if (state.index < 0) return
    options.target()?.replaceMatch?.(state.index, replacement, all)
    await nextTick()
    refresh(false, true)
  }
  function find() {
    if (options.active()) void open()
  }
  onMounted(() => window.addEventListener('mirai:find', find))
  onBeforeUnmount(() => {
    disposed = true
    previousTarget?.clearSearch()
    window.removeEventListener('mirai:find', find)
  })
  return { state, current, open, close, move, replace, refresh }
}
