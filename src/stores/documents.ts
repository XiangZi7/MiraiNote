import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { exampleDocuments } from '@/data/examples'
import { isObject, loadJson, persistJson } from '@/utils/storage'
import { useOverlaysStore } from './overlays'
import type { DocumentRecord } from '@/types/document'
import type { LibraryFilter } from '@/types/workspace'

function validDocuments(value: unknown): value is DocumentRecord[] {
  return Array.isArray(value) && value.every(item => isObject(item)
    && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.path === 'string'
    && ['markdown', 'pdf', 'word'].includes(String(item.kind)) && ['example', 'local'].includes(String(item.source))
    && typeof item.content === 'string' && typeof item.text === 'string' && typeof item.size === 'number'
    && typeof item.dirty === 'boolean' && typeof item.favorite === 'boolean'
    && ['createdAt', 'modifiedAt', 'openedAt'].every(key => typeof item[key] === 'string' && Number.isFinite(Date.parse(item[key] as string)))
    && Array.isArray(item.tags) && item.tags.every(tag => typeof tag === 'string'))
}

export const useDocumentsStore = defineStore('documents', () => {
  const documents = ref(loadJson('documents', exampleDocuments(), validDocuments))
  const byId = computed(() => new Map(documents.value.map(item => [item.id, item])))
  function get(id: string | undefined): DocumentRecord | undefined { return id ? byId.value.get(id) : undefined }
  function filtered(filter: LibraryFilter) {
    const result = documents.value.filter(item => filter === 'all' || filter === 'recent' || (filter === 'favorites' ? item.favorite : item.kind === filter))
    return [...result].sort((a, b) => filter === 'recent' ? b.openedAt.localeCompare(a.openedAt) : a.name.localeCompare(b.name, 'zh-CN'))
  }
  function update(id: string, content: string, text = content) {
    const doc = get(id)
    if (!doc || content === doc.content) return
    doc.content = content; doc.text = text; doc.dirty = true
    doc.modifiedAt = new Date().toISOString()
    doc.size = new TextEncoder().encode(content).length
  }
  function persist() { persistJson('documents', documents.value) }
  function save(id: string, quiet = false) {
    const doc = get(id)
    if (!doc) return
    // UI 阶段只保存工作区草稿，不宣称已写回源文件。
    const wasDirty = doc.dirty
    doc.dirty = false
    try { persist() } catch (error) { doc.dirty = wasDirty; throw error }
    if (!quiet) useOverlaysStore().toast('已保存到本地工作区草稿')
  }
  function create() {
    const id = crypto.randomUUID()
    const index = documents.value.filter(doc => doc.name.startsWith('未命名')).length + 1
    const name = `未命名${index === 1 ? '' : ` ${index}`}.md`
    const now = new Date().toISOString()
    const doc: DocumentRecord = { id, name, kind: 'markdown', path: `工作区草稿 / ${name}`, content: '# 无标题\n\n', text: '无标题', source: 'local', createdAt: now, modifiedAt: now, openedAt: now, tags: [], favorite: false, dirty: true, size: 12 }
    documents.value.push(doc)
    return doc
  }
  function duplicate(id: string) {
    const original = get(id)
    if (!original) return
    const copy: DocumentRecord = { ...original, id: crypto.randomUUID(), name: original.name.replace(/(\.[^.]+)$/, ' 副本$1'), tags: [...original.tags], favorite: false }
    copy.path = `工作区草稿 / ${copy.name}`
    documents.value.push(copy)
    return copy
  }
  function remove(id: string) { documents.value = documents.value.filter(item => item.id !== id) }
  return { documents, get, filtered, update, persist, save, create, duplicate, remove }
})
