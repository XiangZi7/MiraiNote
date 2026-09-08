import assert from 'node:assert/strict'
import { test } from 'node:test'
import { captureAgentContext } from '../src/modules/ai/services/context.ts'

const document = () => ({ id: 'doc-1', name: '草稿.md', kind: 'markdown', path: '文档 / 草稿.md', content: '# 未保存的新内容', text: '旧内容' })
const tab = { id: 'tab-1', documentId: 'doc-1', position: { page: 1, cursor: 3 } }

test('agent context uses current unsaved Markdown and binds the active pane and tab', async () => {
  const doc = document()
  const context = await captureAgentContext(doc, tab, 'pane-1')
  assert.equal(context.document.text, doc.content)
  assert.equal(context.paneId, 'pane-1')
  assert.equal(context.tabId, 'tab-1')
  assert.equal(context.document.revision.length, 64)
})
test('captured requests remain immutable when the user edits or renames the document', async () => {
  const doc = document()
  const context = await captureAgentContext(doc, tab, 'pane-1')
  doc.content = '# 改过的内容'
  doc.name = '已重命名.md'
  const next = await captureAgentContext(doc, tab, 'pane-1')
  assert.equal(context.document.name, '草稿.md')
  assert.equal(context.document.text, '# 未保存的新内容')
  assert.notEqual(context.document.revision, next.document.revision)
})
test('rejects mismatched document and tab rather than sending the wrong context', async () => {
  await assert.rejects(captureAgentContext(document(), { ...tab, documentId: 'another' }, 'pane-1'), /不匹配/)
})
