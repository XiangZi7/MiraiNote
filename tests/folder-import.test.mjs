import test from 'node:test'
import assert from 'node:assert/strict'
import {
  groupEntries,
  isSupportedName,
  workspacePath,
} from '../src/utils/documents.ts'

const entry = (relativePath, kind = 'markdown') => ({
  path: `D:\\笔记\\${relativePath.replaceAll('/', '\\')}`,
  name: relativePath.split('/').at(-1),
  relativePath,
  kind,
  size: 10,
  modifiedAt: 0,
})

test('只把支持的文档类型算作可导入文件', () => {
  for (const name of ['说明.md', 'a.MARKDOWN', '报告.pdf', '合同.DOCX'])
    assert.equal(isSupportedName(name), true, name)
  for (const name of [
    '旧稿.doc',
    '备注.txt',
    'README',
    'setup.exe',
    'a.md.bak',
  ])
    assert.equal(isSupportedName(name), false, name)
})

test('导入路径保留文件夹层级', () => {
  assert.equal(
    workspacePath('子目录/合同.docx', '笔记'),
    '笔记 / 子目录 / 合同.docx'
  )
  assert.equal(workspacePath('说明.md'), '导入文件 / 说明.md')
  assert.equal(
    workspacePath('/前导斜杠//空段.md', '笔记'),
    '笔记 / 前导斜杠 / 空段.md'
  )
})

test('文件夹条目按子目录分组，根目录排在最前', () => {
  const groups = groupEntries([
    entry('reports/b.md'),
    entry('总览.md'),
    entry('reports/a.md'),
    entry('archive/old.pdf', 'pdf'),
  ])
  assert.deepEqual(
    groups.map(group => group.dir),
    ['', 'archive', 'reports']
  )
  assert.deepEqual(
    groups[0].items.map(item => item.name),
    ['总览.md']
  )
  assert.deepEqual(
    groups[2].items.map(item => item.name),
    ['a.md', 'b.md']
  )
})

test('筛选关键词同时匹配文件名与所在目录', () => {
  const entries = [
    entry('周报/一月.md'),
    entry('周报/二月.md'),
    entry('总览.md'),
  ]
  const inFolder = groupEntries(entries, '周报')
  assert.deepEqual(
    inFolder.map(group => group.dir),
    ['周报']
  )
  assert.equal(inFolder[0].items.length, 2)
  assert.deepEqual(
    groupEntries(entries, '总览').map(group => group.items[0].name),
    ['总览.md']
  )
  assert.deepEqual(groupEntries(entries, '没有这个'), [])
})
