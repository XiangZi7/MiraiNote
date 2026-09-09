import { StateEffect, StateField } from '@codemirror/state'
import { Decoration, EditorView, type DecorationSet } from '@codemirror/view'
import {
  findTextMatches,
  type DocumentSearchTarget,
  type TextMatch,
} from '@/utils/text-search'

const setMatches = StateEffect.define<{
  matches: TextMatch[]
  active: number
}>()
export const documentSearchExtension = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, transaction) {
    value = value.map(transaction.changes)
    for (const effect of transaction.effects) {
      if (effect.is(setMatches)) {
        value = Decoration.set(
          effect.value.matches.map((match, index) =>
            Decoration.mark({
              class:
                index === effect.value.active
                  ? 'document-find-active'
                  : 'document-find-match',
            }).range(match.from, match.to)
          )
        )
      }
    }
    return value
  },
  provide: field => EditorView.decorations.from(field),
})

export function editorSearchTarget(
  getEditor: () => EditorView | undefined
): DocumentSearchTarget {
  let matches: TextMatch[] = []
  return {
    find(options) {
      matches = findTextMatches(
        getEditor()?.state.doc.toString() ?? '',
        options
      )
      return matches.length
    },
    selectMatch(index, reveal = true) {
      const editor = getEditor()
      if (!editor) return
      const match = matches[index]
      editor.dispatch({
        effects: [
          setMatches.of({ matches, active: index }),
          ...(match && reveal
            ? [EditorView.scrollIntoView(match.from, { y: 'center' })]
            : []),
        ],
        ...(match && reveal
          ? { selection: { anchor: match.from, head: match.to } }
          : {}),
      })
    },
    clearSearch() {
      matches = []
      getEditor()?.dispatch({ effects: setMatches.of({ matches, active: -1 }) })
    },
    focus: () => getEditor()?.focus(),
    replaceMatch(index, replacement, all) {
      const selected = all ? matches : matches.slice(index, index + 1)
      getEditor()?.dispatch({
        changes: selected.map(match => ({ ...match, insert: replacement })),
      })
    },
  }
}
