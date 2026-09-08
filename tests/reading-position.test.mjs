import test from 'node:test'
import assert from 'node:assert/strict'
import { validReadingPosition } from '../src/utils/reading-position.ts'

const valid = { mode: 'split', ratio: .5, cursor: 10, scroll: 240, page: 2, zoom: 125, rotation: 90 }
test('accept persisted document reading position', () => assert.equal(validReadingPosition(valid), true))
test('reject corrupt persisted values before they reach an editor or PDF renderer', () => {
  for (const patch of [{ cursor: NaN }, { scroll: -1 }, { zoom: Infinity }, { page: 0 }, { page: 1.2 }, { ratio: 4 }, { rotation: 1 }, { mode: 'unknown' }]) {
    assert.equal(validReadingPosition({ ...valid, ...patch }), false, JSON.stringify(patch))
  }
})
