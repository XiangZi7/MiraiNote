export interface SearchOptions {
  query: string
  caseSensitive: boolean
  wholeWord: boolean
}

export interface TextMatch {
  from: number
  to: number
}

export interface DocumentSearchTarget {
  find: (options: SearchOptions) => number
  selectMatch: (index: number, reveal?: boolean) => void
  clearSearch: () => void
  focus: () => void
  replaceMatch?: (index: number, replacement: string, all: boolean) => void
}

export function findTextMatches(
  text: string,
  options: SearchOptions
): TextMatch[] {
  if (!options.query) return []
  const escaped = options.query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Unicode boundaries keep Chinese searches useful and preserve source offsets.
  const pattern = options.wholeWord
    ? `(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`
    : escaped
  const expression = new RegExp(pattern, options.caseSensitive ? 'gu' : 'giu')
  return Array.from(text.matchAll(expression), match => ({
    from: match.index!,
    to: match.index! + match[0].length,
  }))
}
