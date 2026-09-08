import type { PdfPageSize } from '../types'

export const PAGE_GAP = 26

export function pageLayout(
  sizes: PdfPageSize[],
  scale: number,
  rotation: number
) {
  let top = 0
  return sizes.map(size => {
    const rotated = rotation % 180 !== 0
    const width = (rotated ? size.height : size.width) * scale
    const height = (rotated ? size.width : size.height) * scale
    const row = { width, height, top, extent: height + PAGE_GAP }
    top += row.extent
    return row
  })
}

export function pageAtOffset(rows: { top: number }[], offset: number) {
  let low = 0,
    high = rows.length - 1
  while (low <= high) {
    const mid = (low + high) >>> 1
    if (rows[mid]!.top <= offset) low = mid + 1
    else high = mid - 1
  }
  return Math.max(0, high)
}
