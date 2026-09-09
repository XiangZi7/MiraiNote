import type { PDFDocumentProxy } from 'pdfjs-dist'

export interface PdfOutlineEntry {
  id: string
  title: string
  level: number
  page?: number
  disabled: boolean
}

export async function readPdfOutline(
  pdf: PDFDocumentProxy
): Promise<PdfOutlineEntry[]> {
  const entries: PdfOutlineEntry[] = []
  type Nodes = NonNullable<Awaited<ReturnType<PDFDocumentProxy['getOutline']>>>
  async function walk(nodes: Nodes, level: number) {
    for (const node of nodes) {
      let page: number | undefined
      try {
        const destination =
          typeof node.dest === 'string'
            ? await pdf.getDestination(node.dest)
            : node.dest
        if (Array.isArray(destination) && destination.length) {
          const reference = destination[0]
          const index =
            typeof reference === 'number'
              ? reference
              : await pdf.getPageIndex(reference)
          if (Number.isInteger(index) && index >= 0 && index < pdf.numPages)
            page = index + 1
        }
      } catch {
        /* A broken bookmark must not prevent reading the rest of the PDF. */
      }
      entries.push({
        id: String(entries.length),
        title: node.title || '未命名书签',
        level,
        page,
        disabled: !page,
      })
      await walk(node.items, level + 1)
    }
  }
  await walk((await pdf.getOutline()) ?? [], 1)
  return entries
}
