import { expect, test, type Page } from '@playwright/test'

const content =
  '# 搜索与阅读\n\nNeedle needle needles\n\n跨**格式**匹配\n\n' +
  '用于验证滚动定位的普通段落。\n\n'.repeat(60) +
  '## 第二章节\n\nneedle\n\n结尾。'

test.beforeEach(async ({ page }) => {
  await page.addInitScript(content => {
    ;(window as any).initialLaunchFiles = [
      {
        path: 'C:\\fixtures\\search.md',
        name: 'search.md',
        content,
        modifiedAt: 1000,
        error: null,
      },
    ]
  }, content)
  await page.goto('/tests/desktop-smoke.html')
  await expect(
    page.getByRole('heading', { name: '搜索与阅读', exact: true })
  ).toBeVisible()
})

const bar = (page: Page) => page.getByRole('search', { name: '文内查找' })
const input = (page: Page) =>
  page.getByRole('textbox', { name: '搜索 Markdown 内容' })
async function workspace(page: Page, operation: string) {
  return page.evaluate(async operation => {
    const path = '/src/stores/workspace.ts'
    const { useWorkspaceStore } = await import(path)
    const store = useWorkspaceStore()
    if (operation === 'close')
      store.close(store.activePane.id, store.activeTab.id)
    if (operation === 'restore') store.restore()
    if (operation === 'persist') store.persist()
    if (operation === 'split')
      store.splitTab(
        store.activePane.id,
        store.activeTab.id,
        store.activePane.id,
        'right',
        true
      )
    return store.activeTab?.position.mode
  }, operation)
}

test('preview search highlights visible text, wraps, respects options and clears without editing', async ({
  page,
}) => {
  const before = await page.locator('.markdown-preview article').innerHTML()
  await expect(page.locator('.cm-editor')).toHaveCount(0)
  await page.keyboard.press('Control+f')
  await expect(input(page)).toBeFocused()
  await input(page).fill('needle')
  await expect(bar(page).getByRole('status')).toHaveText('1 / 4')
  expect(
    await page.evaluate(() => CSS.highlights.get('document-find')?.size)
  ).toBe(4)
  await input(page).press('Shift+Enter')
  await expect(bar(page).getByRole('status')).toHaveText('4 / 4')
  await expect
    .poll(() => page.locator('.markdown-preview').evaluate(el => el.scrollTop))
    .toBeGreaterThan(1000)
  await input(page).press('Enter')
  await expect(bar(page).getByRole('status')).toHaveText('1 / 4')
  await bar(page)
    .getByRole('button', { name: '区分大小写', exact: true })
    .click()
  await expect(bar(page).getByRole('status')).toHaveText('1 / 3')
  await bar(page).getByRole('button', { name: '全词匹配', exact: true }).click()
  await expect(bar(page).getByRole('status')).toHaveText('1 / 2')
  await input(page).fill('跨格式匹配')
  await expect(bar(page).getByRole('status')).toHaveText('1 / 1')
  await input(page).fill('无匹配关键词')
  await expect(bar(page).getByRole('status')).toHaveText('无匹配结果')
  await expect(
    bar(page).getByRole('button', { name: '下一个匹配 (Enter)', exact: true })
  ).toBeDisabled()
  await page.keyboard.press('Control+f')
  await expect(input(page)).toBeFocused()
  await input(page).press('Escape')
  await expect(bar(page)).toHaveCount(0)
  expect(
    await page.evaluate(() => CSS.highlights.get('document-find')?.size)
  ).toBe(0)
  await expect(page.locator('.cm-editor')).toHaveCount(0)
  expect(await page.locator('.markdown-preview article').innerHTML()).toBe(
    before
  )
})

test('one search UI survives mode switches and editor replacement remains undoable', async ({
  page,
}) => {
  await page
    .getByRole('button', { name: '在文档中查找 (Ctrl+F)', exact: true })
    .click()
  await input(page).fill('needle')
  await page.getByRole('button', { name: '编辑', exact: true }).click()
  await expect(bar(page).getByRole('status')).toHaveText('1 / 4')
  await expect(page.locator('.document-find-active')).toHaveCount(1)
  await page.locator('.cm-content').click()
  await page.keyboard.press('Control+f')
  await expect(input(page)).toBeFocused()
  await expect(page.locator('.cm-search')).toHaveCount(0)
  await bar(page).getByRole('button', { name: '展开替换', exact: true }).click()
  await page
    .getByRole('textbox', { name: '替换为', exact: true })
    .fill('replaced')
  await bar(page).getByRole('button', { name: '全部替换', exact: true }).click()
  await expect(bar(page).getByRole('status')).toHaveText('无匹配结果')
  await expect(page.locator('.cm-content')).toContainText(
    'replaced replaced replaceds'
  )
  await input(page).press('Escape')
  await page.keyboard.press('Control+z')
  await expect(page.locator('.cm-content')).toContainText(
    'Needle needle needles'
  )
  await page.getByRole('button', { name: '分屏', exact: true }).click()
  await page.keyboard.press('Control+f')
  await input(page).fill('needle')
  await expect(bar(page).getByRole('status')).toHaveText('1 / 4')
  await page.locator('.cm-content').focus()
  await page.keyboard.press('Control+End')
  await page.keyboard.type(' typing stays here', { delay: 20 })
  await expect(page.locator('.cm-content')).toContainText('结尾。 typing stays here')
})

test('outline and search stay within their pane and below global dialogs in both themes', async ({
  page,
}, info) => {
  await page.keyboard.press('Control+f')
  await input(page).fill('needle')
  await page.getByRole('button', { name: '文档目录', exact: true }).click()
  const outline = page.locator('.outline-panel')
  const searchBox = await bar(page).boundingBox()
  const outlineBox = await outline.boundingBox()
  expect(outlineBox!.y).toBeGreaterThan(searchBox!.y + searchBox!.height)
  await expect(page.locator('.outline-item[aria-current]')).toHaveText(
    '搜索与阅读'
  )
  await page.screenshot({
    path: info.outputPath('search-outline-light.png'),
    animations: 'disabled',
  })
  await page.evaluate(() => (document.documentElement.dataset.theme = 'dark'))
  await page.screenshot({
    path: info.outputPath('search-outline-dark.png'),
    animations: 'disabled',
  })
  await page.keyboard.press('Control+k')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  expect(
    await dialog.evaluate(el => {
      const box = el.getBoundingClientRect()
      return el.contains(
        document.elementFromPoint(box.x + box.width / 2, box.y + 30)
      )
    })
  ).toBe(true)
  await page.keyboard.press('Escape')
  await workspace(page, 'split')
  await expect(page.locator('.document-pane')).toHaveCount(2)
  await expect(page.locator('.markdown-preview')).toHaveCount(2)
  await page.keyboard.press('Control+f')
  await expect(input(page).last()).toBeFocused()
  await input(page).last().fill('跨格式匹配')
  await expect(bar(page).last().getByRole('status')).toHaveText('1 / 1')
  await page.setViewportSize({ width: 900, height: 720 })
  const pane = page.locator('.document-pane').last()
  expect(
    await pane.evaluate(el => {
      const input = el
        .querySelector('.document-search input')!
        .getBoundingClientRect()
      const pane = el.getBoundingClientRect()
      return input.width > 30 && input.right <= pane.right
    })
  ).toBe(true)
  await page.screenshot({
    path: info.outputPath('search-split-narrow.png'),
    animations: 'disabled',
  })
})

test('new, restored, reopened and persisted tabs always enter preview', async ({
  page,
}) => {
  expect(await workspace(page, 'mode')).toBe('preview')
  await page.getByRole('button', { name: '编辑', exact: true }).click()
  await workspace(page, 'close')
  await workspace(page, 'restore')
  expect(await workspace(page, 'mode')).toBe('preview')
  await page.getByRole('button', { name: '分屏', exact: true }).click()
  await workspace(page, 'persist')
  await page.reload()
  await expect(page.locator('.markdown-preview')).toBeVisible()
  await expect(page.locator('.cm-editor')).toHaveCount(0)
  expect(await workspace(page, 'mode')).toBe('preview')
  await page.keyboard.press('Control+n')
  await expect.poll(() => workspace(page, 'mode')).toBe('preview')
})

test('PDF thumbnails float, resize and navigate without changing page geometry', async ({
  page,
}, info) => {
  await page.evaluate(() => (window as any).desktopTest.openExamplePdf())
  const viewport = page.locator('.pdf-viewport')
  await expect(viewport).toBeVisible()
  const before = await viewport.boundingBox()
  const pageBefore = await viewport.locator('[data-pdf-page="1"]').boundingBox()
  await expect(page.locator('.pdf-navigation-panel')).toHaveCSS(
    'position',
    'absolute'
  )
  await page
    .getByRole('button', { name: '收起页面缩略图', exact: true })
    .click()
  expect(await viewport.boundingBox()).toEqual(before)
  expect(await viewport.locator('[data-pdf-page="1"]').boundingBox()).toEqual(
    pageBefore
  )
  await page.getByRole('button', { name: '切换页面导航', exact: true }).click()
  const resize = page.getByRole('separator', {
    name: '调整 PDF 缩略图栏宽度',
    exact: true,
  })
  await resize.focus()
  await resize.press('End')
  expect(await viewport.boundingBox()).toEqual(before)
  await page.getByRole('button', { name: '第 2 页', exact: true }).click()
  await expect(page.getByRole('spinbutton', { name: 'PDF 页码' })).toHaveValue(
    '2'
  )
  await page.screenshot({
    path: info.outputPath('pdf-floating-thumbnails.png'),
    animations: 'disabled',
  })
})

test('real PDF thumbnails and Word preview use their rendered documents', async ({
  page,
}) => {
  async function openFixture(name: string) {
    await page.evaluate(async name => {
      const apiPath = '/src/api/ipc/document.ts'
      const docsPath = '/src/stores/documents.ts'
      const workspacePath = '/src/stores/workspace.ts'
      const [{ documentApi }, { useDocumentsStore }, { useWorkspaceStore }] =
        await Promise.all([
          import(apiPath),
          import(docsPath),
          import(workspacePath),
        ])
      const file = new File(
        [await (await fetch('/tests/fixtures/' + name)).blob()],
        name
      )
      const doc = await documentApi.open(file)
      useDocumentsStore().documents.push(doc)
      useWorkspaceStore().open(doc.id)
    }, name)
  }
  await openFixture('reader-smoke.pdf')
  const viewport = page.locator('.pdf-viewport')
  await expect(viewport).toBeVisible()
  const before = await viewport.boundingBox()
  await page
    .getByRole('button', { name: '收起页面缩略图', exact: true })
    .click()
  expect(await viewport.boundingBox()).toEqual(before)
  await page
    .getByRole('button', { name: '切换 PDF 缩略图', exact: true })
    .click()
  await page.getByRole('button', { name: '跳转第 2 页', exact: true }).click()
  await expect(page.getByRole('spinbutton', { name: 'PDF 页码' })).toHaveValue(
    '2'
  )
  await openFixture('word-smoke.docx')
  await expect(page.getByLabel('Word 原始排版预览')).toContainText(
    'Word import verification'
  )
  await page.keyboard.press('Control+f')
  await page.getByRole('textbox', { name: '搜索 Word 内容' }).fill('Word')
  await expect(bar(page).getByRole('status')).toHaveText('1 / 1')
  expect(
    await page.evaluate(() => CSS.highlights.get('document-find')?.size)
  ).toBe(1)
  await page.getByRole('button', { name: '编辑', exact: true }).click()
  await expect(page.locator('.tiptap')).toHaveAttribute(
    'contenteditable',
    'true'
  )
  await expect(bar(page).getByRole('status')).toHaveText('1 / 1')
  await page.getByRole('button', { name: '预览', exact: true }).click()
  await expect(bar(page).getByRole('status')).toHaveText('1 / 1')
})
