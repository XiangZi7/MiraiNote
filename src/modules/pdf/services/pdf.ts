import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
GlobalWorkerOptions.workerSrc = worker

export function loadPdf(data: ArrayBuffer) {
  return getDocument({ data: new Uint8Array(data) })
}

export async function inspectPdf(data: ArrayBuffer) {
  const task = loadPdf(data)
  try {
    const pdf = await task.promise
    const pages: string[] = []
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number)
      const content = await page.getTextContent()
      pages.push(content.items.map(item => 'str' in item ? item.str : '').join(' '))
      page.cleanup()
    }
    return { content: '', text: pages.join('\n\n'), pages: pdf.numPages }
  } finally { await task.destroy() }
}
