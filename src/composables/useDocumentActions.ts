import { useDocumentsStore } from '@/stores/documents'
import { useWorkspaceStore } from '@/stores/workspace'
import { useOverlaysStore } from '@/stores/overlays'
import { useFileDialog } from '@vueuse/core'
import { downloadFile, downloadBlob } from '@/api/ipc/filesystem'
import { documentApi } from '@/api/ipc/document'
import type { MenuItem } from '@/types/workspace'
import type { DocumentRecord } from '@/types/document'

export function useDocumentActions() {
  const documents = useDocumentsStore()
  const workspace = useWorkspaceStore()
  const overlays = useOverlaysStore()
  const fileDialog = useFileDialog({ accept: '.md,.markdown,.pdf,.docx', multiple: true, reset: true })
  fileDialog.onChange(files => { if (files) void importFiles(Array.from(files)) })
  function create() { workspace.open(documents.create().id) }
  async function importFiles(files: File[]) {
    for (const file of files) {
      try { const doc = await documentApi.open(file); documents.documents.push(doc); workspace.open(doc.id) }
      catch (error) { overlays.toast(error instanceof Error ? error.message : '无法读取文件', true) }
    }
  }
  function openFiles() { fileDialog.open() }
  function save() {
    const doc = workspace.currentDocument
    if (!doc) return
    try { documents.save(doc.id) } catch { overlays.toast('本地存储空间不足，草稿保存失败。请导出文件。', true) }
  }
  async function exportDocument() {
    const doc = workspace.currentDocument
    if (!doc) return
    if (doc.assetId && (doc.kind === 'pdf' || (doc.kind === 'word' && doc.content === doc.originalContent))) { downloadBlob(doc.name, await documentApi.binary(doc.assetId)); return }
    if (doc.kind === 'pdf') { overlays.toast('这是用于界面验收的 PDF 示例。导入的 PDF 可以导出原始文件。'); return }
    downloadFile(doc.kind === 'word' ? doc.name.replace(/\.docx?$/i, '.html') : doc.name, doc.content, doc.kind === 'word' ? 'text/html;charset=utf-8' : 'text/markdown;charset=utf-8')
  }
  function rename(doc: DocumentRecord) {
    overlays.state.prompt = { title: '重命名文档', label: '文件名', value: doc.name, confirm: '重命名', danger: false, action: value => {
      const name = value.trim()
      if (!name || /[<>:"/\\|?*\x00-\x1f]/.test(name)) throw new Error('请输入有效的 Windows 文件名')
      const extension = doc.name.match(/\.[^.]+$/)?.[0] ?? '.md'
      const next = name.toLowerCase().endsWith(extension.toLowerCase()) ? name : name + extension
      doc.name = next; doc.path = doc.path.replace(/[^/]+$/, ' ' + next)
      overlays.toast('已更新工作区中的文档名称')
    } }
  }
  function deleteDocument(doc: DocumentRecord) {
    overlays.state.prompt = { title: '从工作区移除文档', label: `移除「${doc.name}」及其工作区草稿？原始文件不会被删除。`, value: '', confirm: '移除', danger: true, action: () => {
      workspace.removeDocument(doc.id); documents.remove(doc.id); overlays.toast('文档已从工作区移除')
    } }
  }
  function documentMenu(doc: DocumentRecord): MenuItem[] {
    return [
      { label: '打开', icon: 'lucide:file', action: () => workspace.open(doc.id) },
      { label: '在右侧分屏打开', icon: 'lucide:columns-2', action: () => { workspace.open(doc.id); if (workspace.activeTab) workspace.splitTab(workspace.activePane.id, workspace.activeTab.id, workspace.activePane.id, 'right', true) } },
      { label: '重命名', icon: 'lucide:pencil', divider: true, action: () => rename(doc) },
      { label: '创建副本', icon: 'lucide:copy', action: () => { const copy = documents.duplicate(doc.id); if (copy) workspace.open(copy.id) } },
      { label: doc.favorite ? '取消收藏' : '收藏', icon: 'lucide:star', action: () => { doc.favorite = !doc.favorite } },
      { label: '移动到文件夹', icon: 'lucide:folder-input', action: () => { overlays.state.prompt = { title: '移动工作区文档', label: '工作区文件夹', value: '文档 / 设计', confirm: '移动', danger: false, action: value => { if (!value.trim()) throw new Error('请输入文件夹名称'); doc.path = `${value.trim()} / ${doc.name}` } } } },
      { label: '复制工作区路径', icon: 'lucide:link', action: async () => { await navigator.clipboard.writeText(doc.path); overlays.toast('工作区路径已复制') } },
      { label: '文件信息', icon: 'lucide:info', action: () => { workspace.open(doc.id); overlays.state.inspector = true } },
      { label: '从工作区移除', icon: 'lucide:trash-2', danger: true, divider: true, action: () => deleteDocument(doc) },
    ]
  }
  return { create, openFiles, importFiles, save, exportDocument, rename, deleteDocument, documentMenu }
}
