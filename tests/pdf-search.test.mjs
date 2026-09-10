import assert from 'node:assert/strict'
import test from 'node:test'
import {
  indexPdfText,
  findPdfMatches,
} from '../src/modules/pdf/services/search.ts'
import { fileSizeLimit, fileSizeError } from '../src/utils/file-limits.ts'

test('Chinese phrases span text items, spaces and line breaks without losing glyph offsets', () => {
  const index = indexPdfText([
    { str: '（完', hasEOL: true },
    { str: ' 整' },
    { str: '版） 完整' },
  ])
  const matches = findPdfMatches(index, '完整', 3)
  assert.equal(matches.length, 2)
  assert.deepEqual(matches[0], {
    id: '3:0',
    page: 3,
    from: { item: 0, offset: 1 },
    to: { item: 1, offset: 2 },
  })
  assert.deepEqual(matches[1].from, { item: 2, offset: 3 })
})

test('ligatures, full-width characters, non-BMP text and literal punctuation retain original offsets', () => {
  const index = indexPdfText([
    { str: '🎉 oﬃce ＰＤＦ a.b' },
    { str: ' needle Needle' },
  ])
  assert.deepEqual(findPdfMatches(index, 'office', 1)[0].to, {
    item: 0,
    offset: 7,
  })
  assert.equal(findPdfMatches(index, 'pdf', 1).length, 1)
  assert.equal(findPdfMatches(index, 'a.b', 1).length, 1)
  assert.equal(findPdfMatches(index, 'needle', 1).length, 2)
  assert.deepEqual(findPdfMatches(index, '🎉', 1)[0].to, { item: 0, offset: 2 })
  assert.deepEqual(findPdfMatches(index, ' ', 1), [])
})

test('English words keep their spaces, phrases can cross line breaks, empty items preserve indices', () => {
  const index = indexPdfText([
    { str: 'first', hasEOL: true },
    { str: '' },
    { str: 'page needle' },
  ])
  assert.equal(findPdfMatches(index, 'first page', 1).length, 1)
  assert.equal(findPdfMatches(index, 'firstpage', 1).length, 0)
  assert.deepEqual(findPdfMatches(index, 'needle', 1)[0].from, {
    item: 2,
    offset: 5,
  })
  assert.deepEqual(findPdfMatches(indexPdfText([]), 'abc', 1), [])
})

test('large PDFs have their own reader limit and oversized files receive a specific reason', () => {
  assert.equal(fileSizeError('讲义.PDF', 51 * 1024 * 1024), '')
  assert.equal(fileSizeLimit('讲义.pdf'), 250 * 1024 * 1024)
  assert.match(fileSizeError('讲义.pdf', 251 * 1024 * 1024), /250 MB/)
  assert.match(fileSizeError('讲义.docx', 51 * 1024 * 1024), /50 MB/)
})
