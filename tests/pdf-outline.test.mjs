import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readPdfOutline } from '../src/modules/pdf/services/outline.ts'

test('PDF bookmarks resolve named and reference destinations and preserve nesting', async () => {
  const pdf = {
    numPages: 5,
    getOutline: async () => [
      {
        title: 'Parent',
        dest: 'intro',
        items: [
          { title: 'Child', dest: [{ num: 42, gen: 0 }], items: [] },
          { title: 'Broken', dest: 'missing', items: [] },
        ],
      },
    ],
    getDestination: async name => (name === 'intro' ? [0] : null),
    getPageIndex: async reference => (reference.num === 42 ? 3 : -1),
  }
  const entries = await readPdfOutline(pdf)
  assert.deepEqual(
    entries.map(({ title, level, page, disabled }) => ({
      title,
      level,
      page,
      disabled,
    })),
    [
      { title: 'Parent', level: 1, page: 1, disabled: false },
      { title: 'Child', level: 2, page: 4, disabled: false },
      { title: 'Broken', level: 2, page: undefined, disabled: true },
    ]
  )
})

test('PDF files without an outline remain readable', async () => {
  assert.deepEqual(await readPdfOutline({ getOutline: async () => null }), [])
})
