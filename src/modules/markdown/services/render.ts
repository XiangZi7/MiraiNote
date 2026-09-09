import MarkdownIt from 'markdown-it'
import DOMPurify from 'dompurify'

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: true,
})
const defaultFence = markdown.renderer.rules.fence
markdown.renderer.rules.fence = (tokens, index, options, env, renderer) => {
  const html = defaultFence?.(tokens, index, options, env, renderer) ?? ''
  const language = markdown.utils.escapeHtml(
    tokens[index]?.info.trim().split(/\s+/)[0] ?? ''
  )
  return html.replace('<pre>', `<pre data-language="${language}">`)
}

export function renderMarkdownDocument(source: string) {
  const tokens = markdown.parse(source, {})
  const headings: Array<{ id: string; title: string; level: number }> = []
  tokens.forEach((token, index) => {
    if (token.type !== 'heading_open') return
    const inline = tokens[index + 1]
    const id = String(headings.length)
    const title = inline?.children?.map(child =>
      ['text', 'code_inline', 'image'].includes(child.type) ? child.content : child.type === 'softbreak' ? ' ' : ''
    ).join('') || inline?.content || '未命名标题'
    token.attrSet('data-mirai-heading', id)
    headings.push({ id, title, level: Number(token.tag.slice(1)) })
  })
  const html = DOMPurify.sanitize(
    markdown.renderer
      .render(tokens, markdown.options, {})
      .replace(
        /<li>\[([ xX])\] /g,
        (_, checked: string) =>
          `<li style="list-style: none"><input type="checkbox" disabled ${checked.toLowerCase() === 'x' ? 'checked' : ''}> `
      )
  )
  return { html, headings }
}

export function renderMarkdown(source: string): string {
  return renderMarkdownDocument(source).html
}
