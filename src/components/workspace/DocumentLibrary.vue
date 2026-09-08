<script setup lang="ts">
import { computed, shallowRef } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useDocumentsStore } from '@/stores/documents'
import { useOverlaysStore } from '@/stores/overlays'
import { useDocumentActions } from '@/composables/useDocumentActions'
import { documentTypes, formatSize, formatDate } from '@/utils/documents'
import { AppIcon, AppButton, IconButton } from '@/components/ui'
import type { LibraryFilter } from '@/types/workspace'
const workspace = useWorkspaceStore()
const documents = useDocumentsStore()
const overlays = useOverlaysStore()
const actions = useDocumentActions()
const query = shallowRef('')
const titles: Record<LibraryFilter, string> = { all: '全部文档', recent: '最近打开', favorites: '收藏', markdown: 'Markdown', pdf: 'PDF', word: 'Word' }
const title = computed(() => titles[workspace.library ?? 'all'])
const filtered = computed(() => documents.filtered(workspace.library ?? 'all').filter(doc => `${doc.name} ${doc.tags.join(' ')}`.toLowerCase().includes(query.value.toLowerCase())))
</script>

<template>
  <section class="flex h-full flex-col overflow-hidden bg-surface" :aria-label="title">
    <div class="flex h-9 shrink-0 items-center gap-2 border-b border-line bg-canvas px-4"><IconButton icon="lucide:arrow-left" label="返回打开的文档" @click="workspace.library = null" /><span class="text-xs text-muted">文档工作区</span><AppIcon name="lucide:chevron-right" :size="12" class="text-faint" /><span class="text-xs text-secondary">{{ title }}</span></div>
    <div class="min-h-0 flex-1 overflow-auto px-12 py-10 max-[1050px]:px-7"><div class="mx-auto max-w-[1000px]"><div class="mb-8 flex items-start justify-between gap-4"><div><h1 class="text-[25px] font-semibold tracking-tight">{{ title }}</h1><p class="mt-2 text-xs text-muted">{{ workspace.library === 'favorites' ? '留住值得反复阅读的内容。' : workspace.library === 'recent' ? '接着上一次的思考，继续向前。' : '让文档井然有序，让思考自由发生。' }}</p></div><AppButton @click="actions.create"><AppIcon name="lucide:plus" :size="15" />新建文档</AppButton></div>
    <div class="mb-5 flex items-center justify-between"><span class="text-xs text-muted">{{ filtered.length }} 份文档</span><div class="flex items-center gap-2 text-muted"><AppIcon name="lucide:search" :size="15" /><input v-model="query" aria-label="筛选文档" placeholder="筛选文档…" class="w-[160px] border-0 bg-transparent py-1 text-xs outline-none" /></div></div>
    <div class="grid grid-cols-[minmax(180px,1fr)_110px_150px_38px] gap-3 border-b border-line px-3 pb-3 text-[11px] text-muted max-[900px]:grid-cols-[1fr_70px_32px]"><span>名称</span><span>类型 / 大小</span><span class="max-[900px]:hidden">修改时间</span><span /></div>
    <div v-for="doc in filtered" :key="doc.id" class="group grid grid-cols-[minmax(180px,1fr)_110px_150px_38px] items-center gap-3 border-b border-line/70 px-3 py-4 transition-colors hover:bg-canvas max-[900px]:grid-cols-[1fr_70px_32px]" @contextmenu.prevent.stop="overlays.menu($event, actions.documentMenu(doc))"><button class="flex min-w-0 items-center gap-3.5 text-left" @click="workspace.open(doc.id)"><span class="grid h-11 w-9 shrink-0 place-items-center rounded-md border border-line bg-canvas text-secondary"><AppIcon :name="documentTypes[doc.kind].icon" :size="21" /></span><span class="min-w-0"><span class="block truncate text-[13px] font-medium">{{ doc.name }}</span><span class="mt-1 block truncate text-[11px] text-muted">{{ doc.tags.length ? doc.tags.join(' · ') : '工作区草稿' }}<span v-if="doc.source === 'example'"> · 示例</span></span></span></button><div class="text-xs text-secondary"><span class="block">{{ documentTypes[doc.kind].label }}</span><span class="mt-1 block text-[11px] text-muted">{{ formatSize(doc.size) }}</span></div><span class="text-xs text-muted max-[900px]:hidden">{{ formatDate(doc.modifiedAt) }}</span><IconButton icon="lucide:star" :label="doc.favorite ? '取消收藏' : '收藏文档'" :class="doc.favorite ? '[&_svg]:fill-accent/20 [&_svg]:text-accent' : 'opacity-0 group-hover:opacity-100 focus-visible:opacity-100'" @click="doc.favorite = !doc.favorite" /></div>
    <div v-if="!filtered.length" class="flex flex-col items-center py-24 text-muted"><AppIcon :name="workspace.library === 'favorites' ? 'lucide:star' : 'lucide:files'" :size="30" class="mb-5 text-faint" /><p class="text-sm">{{ query ? '没有找到匹配的文档' : '这里还没有文档' }}</p><p class="mt-2 text-xs">{{ query ? '试试文件名或标签中的其他关键词。' : '打开或收藏一份文档，它就会出现在这里。' }}</p></div>
    <div class="mt-8 flex items-center gap-2 text-[11px] text-muted"><AppIcon name="lucide:folder-open" :size="14" /><span>示例工作区</span><span class="mx-1 text-faint">·</span><button class="hover:text-accent" @click="actions.openFiles">导入本地 Markdown</button></div></div></div>
  </section>
</template>
