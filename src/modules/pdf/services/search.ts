import { findTextMatches } from '../../../utils/text-search.ts'

interface TextItem {
  str: string
  hasEOL?: boolean
}
export interface PdfTextPosition {
  item: number
  offset: number
}
export interface PdfTextIndex {
  text: string
  starts: PdfTextPosition[]
  ends: PdfTextPosition[]
}
export interface PdfSearchMatch {
  id: string
  page: number
  from: PdfTextPosition
  to: PdfTextPosition
}

const cjk =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u

/** Keep offsets into PDF.js text items, including split Chinese glyphs and ligatures. */
export function indexPdfText(items: readonly TextItem[]): PdfTextIndex {
  const chars: { value: string; from: PdfTextPosition; to: PdfTextPosition }[] =
    []
  items.forEach((item, index) => {
    let offset = 0
    for (const char of item.str) {
      const from = { item: index, offset }
      offset += char.length
      const to = { item: index, offset }
      for (const value of char.normalize('NFKC')) {
        if (/[\u00ad\u200b\ufeff]/u.test(value)) continue
        chars.push({ value: /\s/u.test(value) ? ' ' : value, from, to })
      }
    }
    if (item.hasEOL)
      chars.push({
        value: ' ',
        from: { item: index, offset },
        to: { item: index, offset },
      })
  })
  const result: PdfTextIndex = { text: '', starts: [], ends: [] }
  for (let index = 0; index < chars.length; index++) {
    const char = chars[index]!
    if (char.value === ' ') {
      let end = index
      while (chars[end + 1]?.value === ' ') end++
      // Line breaks/spaces between CJK glyphs are layout, not word separators.
      if (
        cjk.test(chars[index - 1]?.value ?? '') &&
        cjk.test(chars[end + 1]?.value ?? '')
      ) {
        index = end
        continue
      }
      char.to = chars[end]!.to
      index = end
    }
    result.text += char.value
    for (let unit = 0; unit < char.value.length; unit++) {
      result.starts.push(char.from)
      result.ends.push(char.to)
    }
  }
  return result
}

export function findPdfMatches(
  index: PdfTextIndex,
  query: string,
  page: number
): PdfSearchMatch[] {
  const normalized = indexPdfText([{ str: query.trim() }]).text
  return findTextMatches(index.text, {
    query: normalized,
    caseSensitive: false,
    wholeWord: false,
  }).map((match, number) => ({
    id: `${page}:${number}`,
    page,
    from: index.starts[match.from]!,
    to: index.ends[match.to - 1]!,
  }))
}
