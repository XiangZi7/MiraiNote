import { onBeforeUnmount, toValue, type MaybeRefOrGetter, type Ref } from 'vue'
import { findTextMatches, type DocumentSearchTarget } from '@/utils/text-search'

const highlights = new Map<object, { ranges: Range[]; active?: Range }>()
function paint() {
  if (!globalThis.CSS?.highlights || !globalThis.Highlight) return
  const all = new Highlight()
  const active = new Highlight()
  active.priority = 1
  for (const entry of highlights.values()) {
    for (const range of entry.ranges) all.add(range)
    if (entry.active) active.add(entry.active)
  }
  CSS.highlights.set('document-find', all)
  CSS.highlights.set('document-find-active', active)
}

function textIndex(root: HTMLElement) {
  let text = ''
  const nodes: { node: Text; from: number; to: number }[] = []
  const block = /^(P|DIV|H[1-6]|LI|TD|TH|PRE|BLOCKQUOTE|SECTION|ARTICLE|TR)$/
  function walk(node: Node) {
    if (node instanceof Text) {
      const from = text.length
      text += node.data
      nodes.push({ node, from, to: text.length })
    } else if (node instanceof HTMLElement) {
      if (node.matches('script, style, [hidden], [aria-hidden="true"]')) return
      if (node.tagName === 'BR' || block.test(node.tagName)) text += '\n'
      for (const child of node.childNodes) walk(child)
      if (block.test(node.tagName)) text += '\n'
    }
  }
  walk(root)
  return { text, nodes }
}

export function useDomTextSearch(
  root: MaybeRefOrGetter<HTMLElement | null>,
  scroller: Readonly<Ref<HTMLElement | null>>
): DocumentSearchTarget {
  const owner = {}
  let ranges: Range[] = []
  function clearSearch() {
    ranges = []
    highlights.delete(owner)
    paint()
  }
  onBeforeUnmount(clearSearch)
  return {
    find(options) {
      clearSearch()
      const element = toValue(root)
      if (!element || !options.query) return 0
      const index = textIndex(element)
      const matches = findTextMatches(index.text, options)
      let nodeIndex = 0
      for (const match of matches) {
        while (
          nodeIndex < index.nodes.length &&
          index.nodes[nodeIndex]!.to <= match.from
        )
          nodeIndex++
        const start = index.nodes[nodeIndex]
        let endIndex = nodeIndex
        while (
          endIndex < index.nodes.length &&
          index.nodes[endIndex]!.to < match.to
        )
          endIndex++
        const end = index.nodes[endIndex]
        if (!start || !end) continue
        const range = document.createRange()
        range.setStart(start.node, Math.max(0, match.from - start.from))
        range.setEnd(end.node, match.to - end.from)
        ranges.push(range)
      }
      highlights.set(owner, { ranges })
      paint()
      return ranges.length
    },
    selectMatch(index, reveal = true) {
      const range = ranges[index]
      highlights.set(owner, { ranges, active: range })
      paint()
      const container = scroller.value
      if (!range || !container || !reveal) return
      const bounds = range.getBoundingClientRect()
      const viewport = container.getBoundingClientRect()
      container.scrollBy({
        top:
          bounds.top -
          viewport.top -
          container.clientHeight / 2 +
          bounds.height / 2,
        left:
          bounds.left < viewport.left || bounds.right > viewport.right
            ? bounds.left - viewport.left - container.clientWidth / 2
            : 0,
        behavior: 'instant',
      })
    },
    clearSearch,
    focus: () => scroller.value?.focus({ preventScroll: true }),
  }
}
