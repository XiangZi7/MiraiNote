import { useDocumentsStore } from '@/stores/documents'
import { useWorkspaceStore } from '@/stores/workspace'
import { useOverlaysStore } from '@/stores/overlays'
import { useFoldersStore } from '@/stores/folders'
import { shallowRef } from 'vue'
import { createSharedComposable, useFileDialog } from '@vueuse/core'
import { downloadFile, downloadBlob, fileSystemApi } from '@/api/ipc/filesystem'
import {
  SUPPORTED_ACCEPT,
  isSupportedName,
  workspacePath,
} from '@/utils/documents'
import { documentApi } from '@/api/ipc/document'
import type { FileEntry, MenuItem, WorkspaceFolder } from '@/types/workspace'
import type { DocumentRecord } from '@/types/document'
import type { LaunchDocument } from '@/api/ipc/window'

/** 超过这个数量的批量导入会先征求确认，避免草稿存储被一次性占满。 */
const BULK_CONFIRM = 40
/** 少量文档直接铺成标签页，大批量只聚焦第一份。 */
const BULK_TABS = 5

interface ImportItem {
  name: string
  /** 磁盘绝对路径，只有桌面端有；用于去重和“最近打开”。 */
  path?: string
  /** 工作区中展示的层级路径。 */
  display?: string
  load: () => Promise<File>
  entry?: FileEntry
}

interface ImportResult {
  imported: number
  skipped: number
  failed: number
  failures: { name: string; message: string }[]
}

function reason(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  if (
    error &&
    typeof error === 'object' &&
    'message' in error &&
    typeof error.message === 'string'
  )
    return error.message
  return fallback
}

export const useDocumentActions = createSharedComposable(() => {
  const documents = useDocumentsStore()
  const workspace = useWorkspaceStore()
  const overlays = useOverlaysStore()
  const folders = useFoldersStore()
  const fileInput = shallowRef(document.createElement('input'))
  let picking: 'files' | 'folder' = 'files'
  const fileDialog = useFileDialog({
    input: fileInput,
    accept: SUPPORTED_ACCEPT,
    multiple: true,
    reset: true,
  })
  fileDialog.onChange(files => {
    if (files) void importFiles(Array.from(files), picking === 'folder')
  })

  function create() {
    workspace.open(documents.create().id)
  }
  function bySource(path: string) {
    const target = path.toLowerCase()
    return documents.documents.find(
      doc => doc.sourcePath?.toLowerCase() === target
    )
  }
  function announce(result: ImportResult, total: number) {
    // 单份文档导入成功后直接打开，不再额外提示。
    if (total === 1 && result.imported === 1) return
    const parts: string[] = []
    if (result.imported) parts.push(`已导入 ${result.imported} 份文档`)
    if (result.skipped) parts.push(`${result.skipped} 份已在工作区`)
    if (result.failed) parts.push(`${result.failed} 份读取失败`)
    if (parts.length)
      overlays.toast(parts.join('，'), !result.imported && result.failed > 0)
    if (result.failures.length) {
      overlays.state.prompt = {
        title: '文档导入失败详情',
        label: result.failures
          .map(item => `${item.name}：${item.message}`)
          .join('\n'),
        value: '',
        confirm: '知道了',
        danger: false,
        input: false,
        action: () => {},
      }
    }
  }
  async function runImport(items: ImportItem[], quiet: boolean) {
    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      failed: 0,
      failures: [],
    }
    const tabs = items.length <= BULK_TABS
    let focus: string | undefined
    try {
      for (const [index, item] of items.entries()) {
        overlays.progress(
          items.length > 1
            ? `正在导入 ${index + 1}/${items.length}：${item.name}`
            : `正在导入 ${item.name}…`
        )
        // 重新打开同一文件时聚焦已有草稿，保留未保存的修改。
        const existing = item.path ? bySource(item.path) : undefined
        if (existing) {
          result.skipped++
          focus ??= existing.id
          if (item.entry) folders.remember(item.entry)
          continue
        }
        try {
          const doc = await documentApi.open(await item.load())
          if (item.path) doc.sourcePath = item.path
          if (item.display) doc.path = item.display
          documents.documents.push(doc)
          if (item.entry) folders.remember(item.entry)
          result.imported++
          focus ??= doc.id
          if (tabs) workspace.open(doc.id)
        } catch (error) {
          result.failed++
          result.failures.push({
            name: item.display ?? item.path ?? item.name,
            message: reason(error, '无法读取文件'),
          })
          if (!quiet) overlays.toast(reason(error, '无法读取文件'), true)
        }
      }
    } finally {
      overlays.progress(null)
    }
    if (focus) workspace.open(focus)
    return result
  }
  async function importFiles(files: File[], fromFolder = false) {
    // 浏览器选择文件夹会带回全部文件，这里只挑得出支持的文档。
    const list = fromFolder
      ? files.filter(file => isSupportedName(file.name))
      : files
    if (!list.length) {
      overlays.toast(
        fromFolder
          ? '这个文件夹里没有 Markdown、PDF 或 Word 文档'
          : '没有可导入的文档'
      )
      return
    }
    const items = list.map<ImportItem>(file => {
      // 浏览器选择文件夹时首段就是文件夹名，其余是夹内相对路径。
      const parts = (
        (file as File & { webkitRelativePath?: string }).webkitRelativePath ??
        ''
      ).split('/')
      return {
        name: file.name,
        display:
          parts.length > 1
            ? workspacePath(parts.slice(1).join('/'), parts[0])
            : undefined,
        load: async () => file,
      }
    })
    announce(await runImport(items, list.length > 1), list.length)
  }
  function entryItem(entry: FileEntry, folder?: string): ImportItem {
    return {
      name: entry.name,
      path: entry.path,
      display: workspacePath(entry.relativePath, folder),
      load: () => fileSystemApi.readFile(entry),
      entry,
    }
  }
  async function importEntries(entries: FileEntry[], folder?: string) {
    if (!entries.length) {
      overlays.toast('没有可导入的文档')
      return
    }
    announce(
      await runImport(
        entries.map(entry => entryItem(entry, folder)),
        entries.length > 1
      ),
      entries.length
    )
  }
  async function openFiles() {
    if (!fileSystemApi.isDesktop()) {
      picking = 'files'
      fileDialog.open({ directory: false, accept: SUPPORTED_ACCEPT })
      return
    }
    try {
      const entries = await fileSystemApi.pickDocuments()
      if (entries.length) await importEntries(entries)
    } catch (error) {
      overlays.toast(reason(error, '无法打开系统选择框'), true)
    }
  }
  function showFolder(path: string) {
    workspace.library = `folder:${path}`
    if (!folders.entries[path]) void refreshFolder(path)
  }
  async function refreshFolder(path: string) {
    try {
      return await folders.reveal(path)
    } catch (error) {
      overlays.toast(reason(error, '文件夹已不可用，请重新打开'), true)
    }
  }
  /** 打开文件夹：桌面端记住真实路径并进入文件夹视图，浏览器退回一次性导入。 */
  async function openFolder(importAll = false) {
    if (!fileSystemApi.isDesktop()) {
      picking = 'folder'
      fileDialog.open({ directory: true, accept: '*' })
      return
    }
    try {
      const scan = await fileSystemApi.pickFolder()
      if (!scan) return
      folders.apply(scan)
      if (importAll) {
        await importFolder(scan.path)
        return
      }
      workspace.library = `folder:${scan.path}`
      if (!scan.entries.length)
        overlays.toast(`「${scan.name}」里没有 Markdown、PDF 或 Word 文档`)
    } catch (error) {
      overlays.toast(reason(error, '无法打开文件夹'), true)
    }
  }
  /** 把整个文件夹导入工作区；未指定路径时先让用户选。 */
  async function importFolder(path?: string) {
    if (!path) {
      await openFolder(true)
      return
    }
    const folder = folders.get(path)
    const entries = (await refreshFolder(path))?.entries
    if (!entries) return
    if (!entries.length) {
      overlays.toast('这个文件夹里没有可导入的文档')
      return
    }
    const run = () => importEntries(entries, folder?.name)
    if (entries.length <= BULK_CONFIRM) {
      await run()
      return
    }
    overlays.state.prompt = {
      title: '导入整个文件夹',
      label: `「${folder?.name ?? path}」中有 ${entries.length} 份文档。全部导入会把内容都存进本地工作区草稿，占用较多存储；也可以只浏览文件夹、按需打开。`,
      value: '',
      confirm: '全部导入',
      danger: false,
      input: false,
      action: () => {
        void run()
      },
    }
  }
  /** 从“最近打开”重新载入一个磁盘文件。 */
  async function reopenFile(path: string) {
    const existing = bySource(path)
    if (existing) {
      workspace.open(existing.id)
      return
    }
    try {
      const [entry] = await fileSystemApi.stat([path])
      if (!entry) {
        folders.forget(path)
        overlays.toast(
          '无法打开这个文件，它可能已被移动、删除或改名，已从最近打开移除',
          true
        )
        return
      }
      await importEntries([entry])
    } catch (error) {
      overlays.toast(reason(error, '无法重新打开这个文件'), true)
    }
  }
  async function reveal(path: string) {
    try {
      const { revealItemInDir } = await import('@tauri-apps/plugin-opener')
      await revealItemInDir(path)
    } catch {
      overlays.toast('无法在资源管理器中显示这个位置', true)
    }
  }
  async function importLaunchFiles(files: LaunchDocument[]) {
    const items: ImportItem[] = []
    for (const file of files) {
      if (file.error || file.content === null) {
        overlays.toast(`${file.name}：${file.error ?? '无法读取文件'}`, true)
        continue
      }
      const content = file.content
      items.push({
        name: file.name,
        path: file.path,
        display: file.path.replace(/^\\\\\?\\/, '').replaceAll('\\', '/'),
        load: async () =>
          new File([content], file.name, {
            type: 'text/markdown',
            lastModified: file.modifiedAt,
          }),
        entry: {
          path: file.path,
          name: file.name,
          relativePath: file.name,
          kind: 'markdown',
          size: content.length,
          modifiedAt: file.modifiedAt,
        },
      })
    }
    if (items.length) announce(await runImport(items, false), items.length)
  }
  function save() {
    const doc = workspace.currentDocument
    if (!doc) return
    try {
      documents.save(doc.id)
    } catch {
      overlays.toast('本地存储空间不足，草稿保存失败。请导出文件。', true)
    }
  }
  async function exportDocument() {
    const doc = workspace.currentDocument
    if (!doc) return
    try {
      if (
        doc.assetId &&
        (doc.kind === 'pdf' ||
          (doc.kind === 'word' && doc.content === doc.originalContent))
      ) {
        downloadBlob(doc.name, await documentApi.binary(doc.assetId))
        return
      }
      if (doc.kind === 'pdf') {
        overlays.toast(
          '这是用于界面验收的 PDF 示例。导入的 PDF 可以导出原始文件。'
        )
        return
      }
      downloadFile(
        doc.kind === 'word' ? doc.name.replace(/\.docx?$/i, '.html') : doc.name,
        doc.content,
        doc.kind === 'word'
          ? 'text/html;charset=utf-8'
          : 'text/markdown;charset=utf-8'
      )
      if (doc.kind === 'word') overlays.toast('已导出 HTML 格式的编辑稿')
    } catch (error) {
      overlays.toast(reason(error, '文档导出失败'), true)
    }
  }
  function rename(doc: DocumentRecord) {
    overlays.state.prompt = {
      title: '重命名文档',
      label: '文件名',
      value: doc.name,
      confirm: '重命名',
      danger: false,
      action: value => {
        const name = value.trim()
        if (!name || /[<>:"/\\|?*\x00-\x1f]/.test(name))
          throw new Error('请输入有效的 Windows 文件名')
        const extension = doc.name.match(/\.[^.]+$/)?.[0] ?? '.md'
        const next = name.toLowerCase().endsWith(extension.toLowerCase())
          ? name
          : name + extension
        doc.name = next
        doc.path = doc.path.replace(/[^/]+$/, ' ' + next)
        overlays.toast('已更新工作区中的文档名称')
      },
    }
  }
  function deleteDocument(doc: DocumentRecord) {
    overlays.state.prompt = {
      title: '从工作区移除文档',
      label: `移除「${doc.name}」及其工作区草稿？原始文件不会被删除。`,
      value: '',
      confirm: '移除',
      danger: true,
      action: () => {
        workspace.removeDocument(doc.id)
        documents.remove(doc.id)
        overlays.toast('文档已从工作区移除')
      },
    }
  }
  function documentMenu(doc: DocumentRecord): MenuItem[] {
    return [
      {
        label: '打开',
        icon: 'lucide:file',
        action: () => workspace.open(doc.id),
      },
      {
        label: '在右侧分屏打开',
        icon: 'lucide:columns-2',
        action: () => {
          workspace.open(doc.id)
          if (workspace.activeTab)
            workspace.splitTab(
              workspace.activePane.id,
              workspace.activeTab.id,
              workspace.activePane.id,
              'right',
              true
            )
        },
      },
      {
        label: '重命名',
        icon: 'lucide:pencil',
        divider: true,
        action: () => rename(doc),
      },
      {
        label: '创建副本',
        icon: 'lucide:copy',
        action: () => {
          const copy = documents.duplicate(doc.id)
          if (copy) workspace.open(copy.id)
        },
      },
      {
        label: doc.favorite ? '取消收藏' : '收藏',
        icon: 'lucide:star',
        action: () => {
          doc.favorite = !doc.favorite
        },
      },
      {
        label: '移动到文件夹',
        icon: 'lucide:folder-input',
        action: () => {
          overlays.state.prompt = {
            title: '移动工作区文档',
            label: '工作区文件夹',
            value: '文档 / 设计',
            confirm: '移动',
            danger: false,
            action: value => {
              if (!value.trim()) throw new Error('请输入文件夹名称')
              doc.path = `${value.trim()} / ${doc.name}`
            },
          }
        },
      },
      {
        label: '复制工作区路径',
        icon: 'lucide:link',
        action: async () => {
          await navigator.clipboard.writeText(doc.path)
          overlays.toast('工作区路径已复制')
        },
      },
      ...(doc.sourcePath && fileSystemApi.isDesktop()
        ? [
            {
              label: '在资源管理器中显示',
              icon: 'lucide:folder-search',
              action: () => reveal(doc.sourcePath!),
            },
          ]
        : []),
      {
        label: '文件信息',
        icon: 'lucide:info',
        action: () => {
          workspace.open(doc.id)
          overlays.state.inspector = true
        },
      },
      {
        label: '从工作区移除',
        icon: 'lucide:trash-2',
        danger: true,
        divider: true,
        action: () => deleteDocument(doc),
      },
    ]
  }
  function folderMenu(folder: WorkspaceFolder): MenuItem[] {
    return [
      {
        label: '浏览文件夹',
        icon: 'lucide:folder-open',
        action: () => showFolder(folder.path),
      },
      {
        label: '全部导入到工作区',
        icon: 'lucide:import',
        action: () => importFolder(folder.path),
      },
      {
        label: '重新扫描',
        icon: 'lucide:refresh-cw',
        divider: true,
        action: async () => {
          await refreshFolder(folder.path)
        },
      },
      {
        label: '在资源管理器中显示',
        icon: 'lucide:folder-search',
        action: () => reveal(folder.path),
      },
      {
        label: '复制文件夹路径',
        icon: 'lucide:link',
        action: async () => {
          await navigator.clipboard.writeText(folder.path)
          overlays.toast('文件夹路径已复制')
        },
      },
      {
        label: '从列表移除',
        icon: 'lucide:x',
        danger: true,
        divider: true,
        action: () => {
          folders.remove(folder.path)
          if (workspace.libraryFolder === folder.path) workspace.library = 'all'
          overlays.toast('已从文件夹列表移除，磁盘上的文件不受影响')
        },
      },
    ]
  }
  return {
    fileInput,
    create,
    openFiles,
    openFolder,
    importFolder,
    importFiles,
    importEntries,
    importLaunchFiles,
    showFolder,
    refreshFolder,
    reopenFile,
    reveal,
    save,
    exportDocument,
    rename,
    deleteDocument,
    documentMenu,
    folderMenu,
  }
})
