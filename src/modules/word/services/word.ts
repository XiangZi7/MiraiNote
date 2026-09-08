import DOMPurify from 'dompurify'
import mammoth from 'mammoth'

export async function importWord(arrayBuffer: ArrayBuffer) {
  const [html, text] = await Promise.all([
    mammoth.convertToHtml({ arrayBuffer }),
    mammoth.extractRawText({ arrayBuffer }),
  ])
  const content = DOMPurify.sanitize(html.value)
  return { content, originalContent: content, text: text.value }
}
