import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const markdown = new MarkdownIt({ html: false, linkify: true, typographer: true, breaks: true })
const defaultFence = markdown.renderer.rules.fence
markdown.renderer.rules.fence = (tokens, index, options, env, renderer) => {
  const html = defaultFence?.(tokens, index, options, env, renderer) ?? ''
  const language = markdown.utils.escapeHtml(tokens[index]?.info.trim().split(/\s+/)[0] ?? '')
  return html.replace('<pre>', `<pre data-language="${language}">`)
}

export function renderMarkdown(source: string): string {
  return DOMPurify.sanitize(markdown.render(source).replace(/<li>\[([ xX])\] /g, (_, checked: string) => `<li style="list-style: none"><input type="checkbox" disabled ${checked.toLowerCase() === 'x' ? 'checked' : ''}> `))
}
