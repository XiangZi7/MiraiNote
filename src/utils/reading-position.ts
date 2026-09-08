import type { ReadingPosition } from '../types/document'

export function validReadingPosition(value: unknown): value is ReadingPosition {
  if (!value || typeof value !== 'object') return false
  const position = value as Record<string, unknown>
  if (!['edit', 'preview', 'split'].includes(String(position.mode)))
    return false
  for (const key of ['ratio', 'cursor', 'scroll', 'page', 'zoom', 'rotation']) {
    if (typeof position[key] !== 'number' || !Number.isFinite(position[key]))
      return false
  }
  return (
    Number(position.ratio) >= 0.3 &&
    Number(position.ratio) <= 0.7 &&
    Number(position.cursor) >= 0 &&
    Number.isInteger(position.cursor) &&
    Number(position.scroll) >= 0 &&
    Number(position.page) >= 1 &&
    Number.isInteger(position.page) &&
    Number(position.zoom) >= 25 &&
    Number(position.zoom) <= 400 &&
    (position.pdfOffset === undefined ||
      (typeof position.pdfOffset === 'number' &&
        Number.isFinite(position.pdfOffset) &&
        position.pdfOffset >= -1 &&
        position.pdfOffset <= 1)) &&
    [0, 90, 180, 270].includes(Number(position.rotation))
  )
}
