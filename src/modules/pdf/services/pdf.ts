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
    const page = await pdf.getPage(1)
    const content = await page.getTextContent()
    return { content: '', text: content.items.map(item => 'str' in item ? item.str : '').join(' '), pages: pdf.numPages }
  } finally { await task.destroy() }
}
