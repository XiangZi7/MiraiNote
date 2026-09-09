import { expect, test, type Page } from '@playwright/test'

const content = '# 路由缓存验收\n\nneedle 开头。\n\n' + '保留阅读位置的正文。\n\n'.repeat(80) + '## 末尾章节\n\nneedle 结尾。'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(content => {
    ;(window as any).initialLaunchFiles = [{
      path: 'C:\\fixtures\\route-cache.md', name: 'route-cache.md', content, modifiedAt: 1000, error: null,
    }]
  }, content)
  await page.goto('/tests/desktop-smoke.html')
  await expect(page.getByRole('heading', { name: '路由缓存验收', exact: true })).toBeVisible()
  await expect(page).toHaveURL(/#\/workspace\/pane\/.+\/tab\/.+/)
})

async function openSecond(page: Page) {
  await page.evaluate(async () => {
    const docsPath = '/src/stores/documents.ts', workspacePath = '/src/stores/workspace.ts'
    const [{ useDocumentsStore }, { useWorkspaceStore }] = await Promise.all([import(docsPath), import(workspacePath)])
    const docs = useDocumentsStore()
    const doc = docs.create()
    docs.update(doc.id, '# 第二份文档\n\n独立的缓存内容。')
    useWorkspaceStore().open(doc.id)
  })
  await expect(page.getByRole('heading', { name: '第二份文档', exact: true })).toBeVisible()
}

test('settings, library routes and tab history retain the same editor, search and undo history', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.getByRole('button', { name: '编辑', exact: true }).click()
  const editor = page.locator('.cm-content')
  await expect(editor).toBeVisible()
  await editor.focus()
  await page.keyboard.press('Control+End')
  await page.keyboard.type(' retained undo')
  await editor.evaluate(el => (window as any).cachedEditor = el)
  await page.keyboard.press('Control+f')
  const search = page.getByRole('textbox', { name: '搜索 Markdown 内容' })
  await search.fill('needle')
  const route = page.url()
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: '深色', exact: true }).click()
  const font = page.getByRole('slider', { name: '编辑器字体大小' })
  await font.focus()
  await font.press('End')
  await page.keyboard.press('Escape')
  await expect(search).toHaveValue('needle')
  await expect(page.locator('.markdown-view')).toHaveCSS('--editor-font-size', '20px')
  expect(await editor.evaluate(el => el === (window as any).cachedEditor)).toBe(true)
  expect(page.url()).toBe(route)
  await page.getByRole('button', { name: '最近打开', exact: true }).click()
  await expect(page).toHaveURL(/#\/library\/recent$/)
  await expect(editor).toHaveCount(0)
  await page.getByRole('button', { name: '返回打开的文档', exact: true }).click()
  await expect(page).toHaveURL(route)
  await expect(search).toHaveValue('needle')
  expect(await editor.evaluate(el => el === (window as any).cachedEditor)).toBe(true)
  await openSecond(page)
  await expect(search).toHaveCount(0)
  await page.goBack()
  await expect(page).toHaveURL(route)
  await expect(search).toHaveValue('needle')
  expect(await editor.evaluate(el => el === (window as any).cachedEditor)).toBe(true)
  await search.press('Escape')
  await page.keyboard.press('Control+z')
  await expect(editor).not.toContainText('retained undo')
  expect(errors).toEqual([])
})

test('preview DOM, search result and reading position survive cached route navigation', async ({ page }) => {
  const preview = page.locator('.markdown-preview')
  await preview.evaluate(el => (window as any).cachedPreview = el)
  await page.keyboard.press('Control+f')
  const search = page.getByRole('textbox', { name: '搜索 Markdown 内容' })
  await search.fill('needle')
  await search.press('Enter')
  await expect(page.getByRole('search').getByRole('status')).toHaveText('2 / 2')
  const top = await preview.evaluate(el => el.scrollTop)
  expect(top).toBeGreaterThan(1000)
  const route = page.url()
  await openSecond(page)
  expect(await page.evaluate(() => CSS.highlights.get('document-find')?.size ?? 0)).toBe(0)
  await page.goBack()
  await expect(page).toHaveURL(route)
  await expect(search).toHaveValue('needle')
  await expect(page.getByRole('search').getByRole('status')).toHaveText('2 / 2')
  expect(await preview.evaluate(el => el === (window as any).cachedPreview)).toBe(true)
  await expect.poll(() => preview.evaluate(el => el.scrollTop)).toBeCloseTo(top, 0)
  expect(await page.evaluate(() => CSS.highlights.get('document-find')?.size)).toBe(2)
})

test('PDF route resumes its loaded document, page, zoom, search and thumbnail state', async ({ page }) => {
  await page.evaluate(async () => {
    const apiPath = '/src/api/ipc/document.ts', docsPath = '/src/stores/documents.ts', workspacePath = '/src/stores/workspace.ts'
    const [{ documentApi }, { useDocumentsStore }, { useWorkspaceStore }] = await Promise.all([import(apiPath), import(docsPath), import(workspacePath)])
    const file = new File([await (await fetch('/tests/fixtures/reader-smoke.pdf')).blob()], 'cached.pdf')
    const doc = await documentApi.open(file)
    useDocumentsStore().documents.push(doc)
    const binary = documentApi.binary
    ;(window as any).binaryReads = 0
    documentApi.binary = (...args: any[]) => { (window as any).binaryReads++; return binary(...args) }
    useWorkspaceStore().open(doc.id)
  })
  const viewport = page.locator('.pdf-viewport')
  await expect(viewport).toBeVisible()
  await viewport.evaluate(el => (window as any).cachedPdfViewport = el)
  await page.getByRole('button', { name: '跳转第 2 页', exact: true }).click()
  await page.getByRole('button', { name: '收起页面缩略图', exact: true }).click()
  await page.getByRole('button', { name: '放大', exact: true }).click()
  await page.keyboard.press('Control+f')
  const search = page.getByRole('textbox', { name: '搜索 PDF 内容' })
  await search.fill('Searchable')
  await expect(page.getByRole('spinbutton', { name: 'PDF 页码' })).toHaveValue('2')
  await page.getByRole('button', { name: '最近打开', exact: true }).click()
  await expect(page).toHaveURL(/#\/library\/recent$/)
  await page.getByRole('button', { name: '返回打开的文档', exact: true }).click()
  await expect(search).toHaveValue('Searchable')
  await expect(page.getByRole('spinbutton', { name: 'PDF 页码' })).toHaveValue('2')
  await expect(page.getByRole('button', { name: '110%', exact: true })).toBeVisible()
  await expect(page.locator('.pdf-navigation-panel')).toHaveCount(0)
  expect(await viewport.evaluate(el => el === (window as any).cachedPdfViewport)).toBe(true)
  expect(await page.evaluate(() => (window as any).binaryReads)).toBe(1)
  await expect(viewport.locator('[data-pdf-page="2"] .textLayer')).toContainText('Searchable second page')
  await page.keyboard.press('Control+w')
  await expect(viewport).toHaveCount(0)
  await page.keyboard.press('Control+Shift+t')
  await expect(viewport).toBeVisible()
  expect(await viewport.evaluate(el => el === (window as any).cachedPdfViewport)).toBe(false)
  expect(await page.evaluate(() => (window as any).binaryReads)).toBe(2)
  await expect(search).toHaveCount(0)
})

test('splitting and collapsing the layout preserves the existing document instance', async ({ page }) => {
  await page.getByRole('button', { name: '编辑', exact: true }).click()
  await page.locator('.cm-content').evaluate(el => (window as any).splitEditor = el)
  const originalPane = await page.locator('.document-pane').getAttribute('data-pane-id')
  await page.evaluate(async () => {
    const path = '/src/stores/workspace.ts'
    const { useWorkspaceStore } = await import(path)
    const store = useWorkspaceStore()
    store.splitTab(store.activePane.id, store.activeTab.id, store.activePane.id, 'right', true)
  })
  await expect(page.locator('.document-pane')).toHaveCount(2)
  const original = page.locator(`[data-pane-id="${originalPane}"] .cm-content`)
  await expect(original).toBeVisible()
  expect(await original.evaluate(el => el === (window as any).splitEditor)).toBe(true)
  await page.keyboard.press('Control+w')
  await expect(page.locator('.document-pane')).toHaveCount(1)
  expect(await original.evaluate(el => el === (window as any).splitEditor)).toBe(true)
})

test('invalid and closed document routes fall back without reopening closed cached views', async ({ page }) => {
  const closedRoute = page.url()
  await openSecond(page)
  const currentRoute = page.url()
  await page.evaluate(async () => {
    const path = '/src/stores/workspace.ts'
    const { useWorkspaceStore } = await import(path)
    const store = useWorkspaceStore()
    // Explicitly choose the route-cache tab using its document record.
    const docsPath = '/src/stores/documents.ts'
    const { useDocumentsStore } = await import(docsPath)
    const tab = store.activePane.tabs.find((item: any) => useDocumentsStore().get(item.documentId)?.name === 'route-cache.md')
    if (tab) store.close(store.activePane.id, tab.id)
  })
  await page.goto(closedRoute)
  await expect(page).toHaveURL(currentRoute)
  await expect(page.getByRole('heading', { name: '第二份文档', exact: true })).toBeVisible()
  await page.evaluate(() => location.hash = '/workspace/pane/missing/tab/missing')
  await expect(page).toHaveURL(currentRoute)
})
