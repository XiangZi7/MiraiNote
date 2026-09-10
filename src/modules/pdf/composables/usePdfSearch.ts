import {
  computed,
  onBeforeUnmount,
  onActivated,
  onDeactivated,
  reactive,
  shallowRef,
  watch,
} from 'vue'
import type { PDFDocumentProxy } from 'pdfjs-dist'
import {
  findPdfMatches,
  indexPdfText,
  type PdfSearchMatch,
  type PdfTextIndex,
} from '../services/search'

export function usePdfSearch(options: {
  pdf: () => PDFDocumentProxy | undefined
  page: () => number
  reveal: (match: PdfSearchMatch) => void
}) {
  // 响应式状态
  const state = reactive({
    // 查找栏是否显示
    open: false,
    // 当前查找文本
    query: '',
    // 当前匹配的下标
    index: -1,
    // 已扫描的页数
    scanned: 0,
    // 无法提取文字的页数
    failed: 0,
    // 是否正在建立查询结果
    busy: false,
  })
  const matches = shallowRef<PdfSearchMatch[]>([])
  const selected = computed(() => matches.value[state.index])
  const byPage = computed(() => {
    const pages = new Map<number, PdfSearchMatch[]>()
    for (const match of matches.value) {
      const list = pages.get(match.page) ?? []
      list.push(match)
      pages.set(match.page, list)
    }
    return pages
  })
  const status = computed(() => {
    if (!state.query.trim()) return '输入关键词'
    if (state.busy)
      return `正在搜索 ${state.scanned} / ${options.pdf()?.numPages ?? 0}`
    const count = matches.value.length
      ? `${state.index + 1} / ${matches.value.length}`
      : '无匹配结果'
    return state.failed ? `${count}（${state.failed} 页无法搜索）` : count
  })
  let cache = new Map<number, PdfTextIndex>()
  let cachedPdf: PDFDocumentProxy | undefined
  let revision = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let active = true

  async function run(version: number) {
    const pdf = options.pdf()
    if (!pdf) {
      state.busy = false
      return
    }
    if (cachedPdf !== pdf) {
      cache = new Map()
      cachedPdf = pdf
    }
    const query = state.query
    const startPage = options.page()
    const found: PdfSearchMatch[] = []
    for (let page = 1; page <= pdf.numPages; page++) {
      if (version !== revision || !active) return
      try {
        let index = cache.get(page)
        if (!index) {
          const content = await (await pdf.getPage(page)).getTextContent()
          if (version !== revision || !active) return
          index = indexPdfText(content.items.filter(item => 'str' in item))
          cache.set(page, index)
        }
        found.push(...findPdfMatches(index, query, page))
      } catch {
        if (version !== revision || !active) return
        state.failed++
      }
      state.scanned = page
      if (page % 8 === 0) await new Promise(resolve => setTimeout(resolve, 0))
    }
    if (version !== revision || !active) return
    matches.value = found
    const first = found.findIndex(match => match.page >= startPage)
    state.index = found.length ? Math.max(0, first) : -1
    state.busy = false
    if (selected.value) options.reveal(selected.value)
  }
  function refresh() {
    const version = ++revision
    clearTimeout(timer)
    matches.value = []
    state.index = -1
    state.scanned = 0
    state.failed = 0
    state.busy = active && state.open && !!state.query.trim() && !!options.pdf()
    if (state.busy) timer = setTimeout(() => void run(version), 150)
  }
  function move(direction: 1 | -1) {
    if (state.busy || !matches.value.length) return
    state.index =
      (state.index + direction + matches.value.length) % matches.value.length
    if (selected.value) options.reveal(selected.value)
  }
  watch([() => state.query, () => state.open, options.pdf], refresh, {
    flush: 'sync',
  })
  onDeactivated(() => {
    active = false
    refresh()
  })
  onActivated(() => {
    active = true
    refresh()
  })
  onBeforeUnmount(() => {
    active = false
    revision++
    clearTimeout(timer)
    cache.clear()
  })
  return { state, matches, selected, byPage, status, move }
}
