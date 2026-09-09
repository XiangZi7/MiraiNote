import { ref, shallowRef } from 'vue'
import { defineStore } from 'pinia'
import { isObject, loadJson, persistJson } from '@/utils/storage'
import { fileSystemApi } from '@/api/ipc/filesystem'
import type {
  FileEntry,
  FolderScan,
  RecentFile,
  WorkspaceFolder,
} from '@/types/workspace'

const MAX_FOLDERS = 12
const MAX_RECENT = 30

function validEntries(value: unknown, kinds: boolean): boolean {
  return (
    Array.isArray(value) &&
    value.every(
      item =>
        isObject(item) &&
        typeof item.path === 'string' &&
        item.path.length > 0 &&
        typeof item.name === 'string' &&
        typeof item.openedAt === 'string' &&
        Number.isFinite(Date.parse(item.openedAt)) &&
        (!kinds || ['markdown', 'pdf', 'word'].includes(String(item.kind)))
    )
  )
}
const validFolders = (value: unknown): value is WorkspaceFolder[] =>
  validEntries(value, false)
const validRecent = (value: unknown): value is RecentFile[] =>
  validEntries(value, true)

const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

/** 已打开的本地文件夹与最近打开过的本地文件；文件内容按需读取，不进入草稿存储。 */
export const useFoldersStore = defineStore('folders', () => {
  const folders = ref(loadJson<WorkspaceFolder[]>('folders', [], validFolders))
  const recent = ref(loadJson<RecentFile[]>('recent-files', [], validRecent))
  // 扫描结果只保留在内存中，避免把整棵目录写进 localStorage。
  const entries = ref<Record<string, FileEntry[]>>({})
  const notices = ref<
    Record<string, { truncated: boolean; oversized: number }>
  >({})
  const scanning = shallowRef<string | null>(null)

  function get(path: string) {
    return folders.value.find(folder => same(folder.path, path))
  }
  function apply(scan: FolderScan) {
    entries.value[scan.path] = scan.entries
    notices.value[scan.path] = {
      truncated: scan.truncated,
      oversized: scan.oversized,
    }
    const openedAt = new Date().toISOString()
    const next = [
      { path: scan.path, name: scan.name, openedAt },
      ...folders.value.filter(folder => !same(folder.path, scan.path)),
    ]
    // 超出上限的旧文件夹连同它的扫描结果一起丢掉。
    for (const folder of next.slice(MAX_FOLDERS)) {
      delete entries.value[folder.path]
      delete notices.value[folder.path]
    }
    folders.value = next.slice(0, MAX_FOLDERS)
    return scan
  }
  async function reveal(path: string) {
    scanning.value = path
    try {
      return apply(await fileSystemApi.scanFolder(path))
    } finally {
      scanning.value = null
    }
  }
  function remove(path: string) {
    folders.value = folders.value.filter(folder => !same(folder.path, path))
    delete entries.value[path]
    delete notices.value[path]
  }
  function remember(entry: FileEntry) {
    recent.value = [
      {
        path: entry.path,
        name: entry.name,
        kind: entry.kind,
        openedAt: new Date().toISOString(),
      },
      ...recent.value.filter(item => !same(item.path, entry.path)),
    ].slice(0, MAX_RECENT)
  }
  function forget(path: string) {
    recent.value = recent.value.filter(item => !same(item.path, path))
  }
  return {
    folders,
    recent,
    entries,
    notices,
    scanning,
    get,
    apply,
    reveal,
    remove,
    remember,
    forget,
    persist: () => {
      persistJson('folders', folders.value)
      persistJson('recent-files', recent.value)
    },
  }
})
