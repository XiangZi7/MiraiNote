import { EditorState } from '@codemirror/state'
import { EditorView, keymap, lineNumbers, drawSelection, highlightActiveLine } from '@codemirror/view'
import { defaultKeymap, history, historyKeymap, indentWithTab, undo, redo } from '@codemirror/commands'
import { markdown } from '@codemirror/lang-markdown'
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language'
import { search, searchKeymap, openSearchPanel } from '@codemirror/search'
import { tags } from '@lezer/highlight'
import type { MarkdownAction } from '../types'

const highlight = HighlightStyle.define([
  { tag: tags.heading1, color: 'var(--text)', fontWeight: '600' },
  { tag: [tags.heading2, tags.heading3, tags.heading4], color: 'var(--accent)', fontWeight: '600' },
  { tag: tags.processingInstruction, color: 'var(--faint)' },
  { tag: tags.monospace, color: 'var(--secondary)' },
  { tag: tags.strong, fontWeight: '600' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.strikethrough, textDecoration: 'line-through' },
  { tag: tags.link, color: 'var(--accent)', textDecoration: 'underline' },
  { tag: tags.url, color: 'var(--muted)' },
  { tag: tags.quote, color: 'var(--muted)' },
  { tag: tags.meta, color: 'var(--faint)' },
])

export function applyMarkdownAction(view: EditorView, action: MarkdownAction): boolean {
  if (action === 'undo') return undo(view)
  if (action === 'redo') return redo(view)
  if (action === 'find') return openSearchPanel(view)
  const { from, to } = view.state.selection.main
  const selected = view.state.sliceDoc(from, to)
  const surrounds: Partial<Record<MarkdownAction, [string, string, string]>> = {
    bold: ['**', '**', '粗体文本'], italic: ['*', '*', '斜体文本'], strike: ['~~', '~~', '删除线文本'], code: ['`', '`', '代码'],
    link: ['[', '](https://example.com)', '链接文本'], image: ['![', '](https://example.com/image.png)', '图片说明'], codeblock: ['\n```text\n', '\n```\n', '代码'],
  }
  const wrap = surrounds[action]
  if (wrap) {
    const text = selected || wrap[2]
    view.dispatch({ changes: { from, to, insert: wrap[0] + text + wrap[1] }, selection: { anchor: from + wrap[0].length, head: from + wrap[0].length + text.length } })
  } else if (action === 'table') {
    view.dispatch({ changes: { from, to, insert: '\n| 列一 | 列二 |\n| --- | --- |\n| 内容 | 内容 |\n' } })
  } else {
    const prefixes: Partial<Record<MarkdownAction, string>> = { h1: '# ', h2: '## ', h3: '### ', quote: '> ', bullet: '- ', ordered: '1. ', task: '- [ ] ' }
    const prefix = prefixes[action]
    if (prefix) {
      const line = view.state.doc.lineAt(from)
      const content = view.state.sliceDoc(line.from, to)
      const insert = action.startsWith('h') ? prefix + content.replace(/^#{1,6}\s/, '') : content.split('\n').map(value => prefix + value).join('\n')
      view.dispatch({ changes: { from: line.from, to, insert } })
    }
  }
  view.focus()
  return true
}

export function createEditor(parent: HTMLElement, content: string, onChange: (content: string) => void, onPosition: (cursor: number, scroll: number) => void): EditorView {
  return new EditorView({ parent, state: EditorState.create({ doc: content, extensions: [
    lineNumbers(), history(), drawSelection(), highlightActiveLine(), markdown(), syntaxHighlighting(highlight), EditorView.lineWrapping,
    search({ top: true }),
    keymap.of([{ key: 'Mod-b', run: view => applyMarkdownAction(view, 'bold') }, { key: 'Mod-i', run: view => applyMarkdownAction(view, 'italic') }, ...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
    EditorView.updateListener.of(update => {
      if (update.docChanged) onChange(update.state.doc.toString())
      if (update.selectionSet || update.docChanged) onPosition(update.state.selection.main.head, update.view.scrollDOM.scrollTop)
    }),
    EditorView.domEventHandlers({ scroll: (_, view) => { onPosition(view.state.selection.main.head, view.scrollDOM.scrollTop) } }),
    EditorView.contentAttributes.of({ 'aria-label': 'Markdown 编辑器', spellcheck: 'false' }),
    EditorView.theme({
      '&': { height: '100%', backgroundColor: 'var(--editor)', color: 'var(--secondary)', fontSize: 'var(--editor-font-size, 14px)' },
      '&.cm-focused': { outline: 'none' },
      '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '26px', overflow: 'auto' },
      '.cm-content': { padding: '24px 28px 100px 12px', caretColor: 'var(--text)' },
      '.cm-line': { padding: '0 0 0 8px' },
      '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--faint)', border: 'none', padding: '0 4px 0 22px', fontSize: '12px' },
      '.cm-gutterElement': { minWidth: '23px' },
      '.cm-activeLine': { backgroundColor: 'transparent' },
      '.cm-cursor': { borderLeftColor: 'var(--text)' },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': { backgroundColor: 'var(--accent-soft)' },
      '.cm-panels': { backgroundColor: 'var(--bg)', color: 'var(--secondary)' },
      '.cm-panels-top': { borderBottom: '1px solid var(--border)' },
      '.cm-search': { padding: '8px 12px', font: '12px var(--font-ui)' },
      '.cm-textfield': { border: '1px solid var(--border)', borderRadius: '4px', backgroundColor: 'var(--surface)' },
      '.cm-button': { background: 'var(--hover)', color: 'var(--text)', border: 'none', borderRadius: '4px', fontSize: '12px' },
    }),
  ] }) })
}
