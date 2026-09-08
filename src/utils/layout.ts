import type { LayoutNode, PaneNode } from '@/types/workspace'

export function panesOf(node: LayoutNode): PaneNode[] {
  return node.type === 'pane' ? [node] : node.children.flatMap(panesOf)
}

export function replaceNode(root: LayoutNode, id: string, replacement: LayoutNode): LayoutNode {
  if (root.id === id) return replacement
  if (root.type === 'pane') return root
  return { ...root, children: [replaceNode(root.children[0], id, replacement), replaceNode(root.children[1], id, replacement)] }
}

export function compactLayout(node: LayoutNode): LayoutNode {
  if (node.type === 'pane') return node
  const left = compactLayout(node.children[0])
  const right = compactLayout(node.children[1])
  if (left.type === 'pane' && !left.tabs.length) return right
  if (right.type === 'pane' && !right.tabs.length) return left
  return { ...node, children: [left, right] }
}

export function emptyPane(): PaneNode {
  return { id: crypto.randomUUID(), type: 'pane', tabs: [], activeTabId: null }
}
