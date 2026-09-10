import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist'
import worker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
GlobalWorkerOptions.workerSrc = worker

export function loadPdf(data: ArrayBuffer) {
  const assets = new URL(
    `${import.meta.env.BASE_URL}pdfjs/`,
    window.location.href
  ).href
  return getDocument({
    data: new Uint8Array(data),
    cMapUrl: `${assets}cmaps/`,
    cMapPacked: true,
    standardFontDataUrl: `${assets}standard_fonts/`,
    wasmUrl: `${assets}wasm/`,
    iccUrl: `${assets}iccs/`,
  })
}

export async function inspectPdf(data: ArrayBuffer) {
  const task = loadPdf(data)
  try {
    const pdf = await task.promise
    const pages: string[] = []
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number).catch(() => undefined)
      try {
        const content = await page?.getTextContent()
        pages.push(
          content?.items
            .map(item =>
              'str' in item ? item.str + (item.hasEOL ? '\n' : '') : ''
            )
            .join('') ?? ''
        )
      } catch {
        // A broken text stream must not make an otherwise readable PDF disappear on import.
        pages.push('')
      } finally {
        page?.cleanup()
      }
    }
    return { content: '', text: pages.join('\n\n'), pages: pdf.numPages }
  } finally {
    await task.destroy()
  }
}
