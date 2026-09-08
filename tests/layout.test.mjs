import assert from 'node:assert/strict'
import { test } from 'node:test'
import { emptyPane, panesOf, compactLayout, replaceNode } from '../src/utils/layout.ts'

const pane = (id, ids = []) => ({ type: 'pane', id, activeTabId: ids[0] ?? null, tabs: ids.map(id => ({ id, documentId: id, pinned: false })) })
const split = (id, left, right) => ({ type: 'split', id, axis: 'horizontal', ratio: .5, children: [left, right] })

test('enumerates nested panes in visual order', () => {
  const root = split('root', pane('a', ['one']), split('nested', pane('b', ['two']), pane('c', ['three'])))
  assert.deepEqual(panesOf(root).map(node => node.id), ['a', 'b', 'c'])
})
test('closing the final tab collapses nested empty panes and preserves remaining tabs', () => {
  const survivor = pane('survivor', ['one', 'two'])
  const root = split('root', pane('empty'), split('nested', pane('also-empty'), survivor))
  assert.equal(compactLayout(root), survivor)
  assert.equal(survivor.activeTabId, 'one')
})
test('keeps a usable empty pane after all documents close', () => {
  const result = compactLayout(split('root', pane('left'), pane('right')))
  assert.equal(result.type, 'pane')
  assert.equal(result.tabs.length, 0)
})
test('splitting a nested pane preserves siblings and does not mutate the previous tree', () => {
  const left = pane('left', ['a'])
  const original = split('root', left, pane('right', ['b']))
  const replacement = split('child-split', pane('right', ['b']), pane('new', ['c']))
  const next = replaceNode(original, 'right', replacement)
  assert.equal(next.children[0], left)
  assert.equal(next.children[1], replacement)
  assert.equal(original.children[1].type, 'pane')
  assert.deepEqual(panesOf(next).flatMap(node => node.tabs.map(tab => tab.id)), ['a', 'b', 'c'])
})
test('pane identities are unique', () => assert.notEqual(emptyPane().id, emptyPane().id))
