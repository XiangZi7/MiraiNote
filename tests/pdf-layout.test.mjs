import test from 'node:test'
import assert from 'node:assert/strict'
import { pageLayout, pageAtOffset } from '../src/modules/pdf/services/page-layout.ts'

test('continuous PDF rows keep different page sizes and gaps at any zoom', () => {
  const rows = pageLayout([{ width: 595, height: 842 }, { width: 842, height: 595 }], .5, 0)
  assert.deepEqual(rows.map(({ width, height, top }) => ({ width, height, top })), [
    { width: 297.5, height: 421, top: 0 }, { width: 421, height: 297.5, top: 447 },
  ])
  assert.equal(pageAtOffset(rows, 446), 0)
  assert.equal(pageAtOffset(rows, 447), 1)
})
test('rotated PDF rows swap dimensions without losing cumulative positions', () => {
  const rows = pageLayout(Array.from({ length: 99 }, () => ({ width: 595, height: 842 })), 1.5, 90)
  assert.equal(rows[0].width, 1263)
  assert.equal(rows[0].height, 892.5)
  assert.equal(pageAtOffset(rows, rows[98].top + 500), 98)
  assert.equal(pageAtOffset(rows, -10), 0)
})
