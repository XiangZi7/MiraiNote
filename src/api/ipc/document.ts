import { get, set } from 'idb-keyval'
import type { DocumentRecord } from '@/types/document'
import { fileSizeError } from '@/utils/file-limits'

type ParsedDocument = Pick<DocumentRecord, 'content' | 'text'> &
  Partial<Pick<DocumentRecord, 'pages' | 'originalContent'>>
interface ImportProvider {
  kind: DocumentRecord['kind']
  read: (file: File) => Promise<ParsedDocument>
  binary: boolean
}

const markdown: ImportProvider = {
  kind: 'markdown',
  binary: false,
  read: async file => {
    const content = await file.text()
    return { content, text: content }
  },
}
const pdf: ImportProvider = {
  kind: 'pdf',
  binary: true,
  read: async file =>
    (await import('@/modules/pdf/services/pdf')).inspectPdf(
      await file.arrayBuffer()
    ),
}
const word: ImportProvider = {
  kind: 'word',
  binary: true,
  read: async file =>
    (await import('@/modules/word/services/word')).importWord(
      await file.arrayBuffer()
    ),
}
const providers: Record<string, ImportProvider> = {
  md: markdown,
  markdown,
  pdf,
  docx: word,
}

export const documentApi = {
  async open(file: File): Promise<DocumentRecord> {
    const extension = file.name.split('.').at(-1)?.toLowerCase() ?? ''
    const provider = providers[extension]
    if (!provider)
      throw new Error(
        extension === 'doc'
          ? '旧版 .doc 需要先通过 Word 转存为 .docx，当前文档引擎支持 .docx。'
          : '支持 Markdown、PDF 和 DOCX 文档。'
      )
    const sizeError = fileSizeError(file.name, file.size)
    if (sizeError) throw new Error(sizeError)
    const parsed = await provider.read(file)
    const id = crypto.randomUUID()
    if (provider.binary) await set(`miraihub:asset:${id}`, file)
    const now = new Date().toISOString()
    return {
      ...parsed,
      id,
      name: file.name,
      kind: provider.kind,
      path: `导入文件 / ${file.name}`,
      source: 'local',
      createdAt: now,
      modifiedAt: new Date(file.lastModified).toISOString(),
      openedAt: now,
      tags: [],
      favorite: false,
      dirty: false,
      size: file.size,
      ...(provider.binary ? { assetId: id } : {}),
    }
  },
  async binary(assetId: string): Promise<Blob> {
    const file = await get<Blob>(`miraihub:asset:${assetId}`)
    if (!file) throw new Error('找不到本地文档副本，请重新导入文件。')
    return file
  },
}
