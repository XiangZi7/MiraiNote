import test from 'node:test'
import assert from 'node:assert/strict'
import { findTextMatches } from '../src/utils/text-search.ts'

const options = { query: 'needle', caseSensitive: false, wholeWord: false }
test('literal search supports metacharacters and preserves Unicode source offsets', () => {
  assert.deepEqual(
    findTextMatches('a.b a?b a.b', { ...options, query: 'a.b' }),
    [
      { from: 0, to: 3 },
      { from: 8, to: 11 },
    ]
  )
  assert.deepEqual(findTextMatches('İ 🎉 Needle', options), [
    { from: 5, to: 11 },
  ])
  assert.deepEqual(findTextMatches('中文中文', { ...options, query: '中文' }), [
    { from: 0, to: 2 },
    { from: 2, to: 4 },
  ])
  assert.deepEqual(findTextMatches('anything', { ...options, query: '' }), [])
})
test('case and whole-word options filter matches without changing their offsets', () => {
  const text = 'Needle needle needles'
  assert.equal(findTextMatches(text, options).length, 3)
  assert.deepEqual(
    findTextMatches(text, { ...options, caseSensitive: true, wholeWord: true }),
    [{ from: 7, to: 13 }]
  )
  assert.deepEqual(
    findTextMatches('中文 中文词', {
      ...options,
      query: '中文',
      wholeWord: true,
    }),
    [{ from: 0, to: 2 }]
  )
})
