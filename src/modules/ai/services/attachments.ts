import type { AgentDraftAttachment } from '../types'

export const AGENT_MAX_FILES = 4
export const AGENT_MAX_FILE_BYTES = 64_000
export const AGENT_MAX_ATTACHMENT_BYTES = 128_000
// Matches the workspace import limit; PDF/DOCX are reduced to text before sending.
const AGENT_MAX_SOURCE_BYTES = 50 * 1024 * 1024
export const AGENT_FILE_ACCEPT =
  '.txt,.md,.markdown,.log,.json,.csv,.tsv,.yaml,.yml,.xml,.html,.css,.sql,.sh,.ps1,.ini,.toml,.conf,.env,.js,.jsx,.ts,.tsx,.vue,.py,.rs,.go,.java,.c,.h,.cpp,.pdf,.docx,text/*'

const encoder = new TextEncoder()
const TAB = 0x09
const NEWLINE = 0x0a
const RETURN = 0x0d
const SPACE = 0x20
const DELETE = 0x7f

/** Anything besides tab, newline and carriage return would reach the model as binary noise. */
function hasControlCharacters(
  value: string,
  allowLineBreaks: boolean
): boolean {
  for (const character of value) {
    const code = character.codePointAt(0) ?? 0
    if (code >= SPACE && code !== DELETE) continue
    if (
      allowLineBreaks &&
      (code === TAB || code === NEWLINE || code === RETURN)
    )
      continue
    return true
  }
  return false
}

/** Decimal units so displayed sizes line up with the documented 64 KB / 128 KB budgets. */
export function formatAttachmentSize(size: number): string {
  return size < 1000 ? `${size} B` : `${(size / 1000).toFixed(1)} KB`
}

async function extract(file: File): Promise<string> {
  const extension = file.name.split('.').at(-1)?.toLowerCase() ?? ''
  if (extension === 'pdf') {
    const { inspectPdf } = await import('@/modules/pdf/services/pdf')
    return (await inspectPdf(await file.arrayBuffer())).text
  }
  if (extension === 'docx') {
    const { importWord } = await import('@/modules/word/services/word')
    return (await importWord(await file.arrayBuffer())).text
  }
  if (extension === 'doc')
    throw new Error(`${file.name}：旧版 .doc 请先用 Word 转存为 .docx`)
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(
      await file.arrayBuffer()
    )
  } catch {
    throw new Error(`${file.name}：请选择 UTF-8 文本、日志或代码文件`)
  }
}

export async function readAgentAttachment(
  file: File
): Promise<AgentDraftAttachment> {
  if (!file.size) throw new Error(`${file.name}：文件为空`)
  if (file.size > AGENT_MAX_SOURCE_BYTES)
    throw new Error(`${file.name}：文件超过 50 MB`)
  if (
    !file.name.trim() ||
    encoder.encode(file.name).length > 255 ||
    /[/\\]/.test(file.name) ||
    hasControlCharacters(file.name, false)
  )
    throw new Error('附件文件名无效')
  const content = await extract(file)
  if (!content.trim() || hasControlCharacters(content, true))
    throw new Error(`${file.name}：没有可读文本，请选择文本、PDF 或 DOCX 文件`)
  const size = encoder.encode(content).length
  if (size > AGENT_MAX_FILE_BYTES)
    throw new Error(
      `${file.name}：正文 ${(size / 1000).toFixed(0)} KB，超过单个附件 64 KB 上限。可改为导入为文档后再提问。`
    )
  return { id: crypto.randomUUID(), name: file.name, content, size }
}
