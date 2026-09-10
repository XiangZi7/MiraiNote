import { expect, test, type Page } from '@playwright/test'
import { searchPdfFixture } from './helpers/pdf-fixture'

async function importFixture(page: Page) {
  await page.evaluate(async () => {
    const api = '/src/api/ipc/document.ts'
    const docs = '/src/stores/documents.ts'
    const workspace = '/src/stores/workspace.ts'
    const [{ documentApi }, { useDocumentsStore }, { useWorkspaceStore }] =
      await Promise.all([import(api), import(docs), import(workspace)])
    const file = new File(
      [await (await fetch('/pdf-search-fixture.pdf')).blob()],
      '搜索测试.pdf'
    )
    const doc = await documentApi.open(file)
    useDocumentsStore().documents.push(doc)
    useWorkspaceStore().open(doc.id)
  })
  await expect(page.locator('.pdf-viewport')).toBeVisible()
}

test.beforeEach(async ({ page }) => {
  await page.route('**/pdf-search-fixture.pdf', route =>
    route.fulfill({ body: searchPdfFixture(), contentType: 'application/pdf' })
  )
  await page.goto('/tests/desktop-smoke.html')
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).desktopTest?.calls.some(
            (call: any) =>
              call.command === 'desktop_set_ready' && call.payload.ready
          ) ?? false
      )
    )
    .toBe(true)
})

const input = (page: Page) =>
  page.getByRole('textbox', { name: '搜索 PDF 内容', exact: true })
const status = (page: Page) => page.getByRole('search').getByRole('status')
const active = (page: Page) =>
  page.locator('.pdf-viewport .pdf-search-match-active')

test('PDF search highlights each occurrence, visits the current page first and wraps through virtual pages', async ({
  page,
}, info) => {
  await importFixture(page)
  await page
    .getByRole('button', { name: '收起页面缩略图', exact: true })
    .click()
  await page.keyboard.press('Control+f')
  await input(page).fill('needle')
  await expect(status(page)).toHaveText('1 / 12')
  await expect(active(page)).toHaveCount(1)
  await expect(active(page)).toHaveAttribute('data-match-id', '1:0')
  const first = await active(page).boundingBox()
  expect(first!.width).toBeGreaterThan(30)
  await input(page).press('Enter')
  await expect(status(page)).toHaveText('2 / 12')
  await expect(active(page)).toHaveAttribute('data-match-id', '1:1')
  await expect(active(page)).toBeInViewport()
  await input(page).press('Enter')
  await expect(status(page)).toHaveText('3 / 12')
  await expect(active(page)).toHaveAttribute('data-match-id', '2:0')
  await input(page).press('Shift+Enter')
  await input(page).press('Shift+Enter')
  await input(page).press('Shift+Enter')
  await expect(status(page)).toHaveText('12 / 12')
  await expect(active(page)).toHaveAttribute('data-match-id', '6:1')
  await expect(active(page)).toBeInViewport()
  await page.screenshot({ path: info.outputPath('pdf-search-highlight.png') })
  await input(page).press('Enter')
  await expect(active(page)).toHaveAttribute('data-match-id', '1:0')
  await expect(active(page)).toBeInViewport()
  await input(page).press('Escape')
  await expect(page.locator('.pdf-search-match')).toHaveCount(0)
})

test('Chinese search crosses text spans and stays aligned after zoom and rotation', async ({
  page,
}, info) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  const resources: string[] = []
  page.on('response', response => {
    if (response.url().includes('/pdfjs/cmaps/') && response.ok())
      resources.push(response.url())
  })
  await importFixture(page)
  await page.keyboard.press('Control+f')
  await input(page).fill('完整')
  await expect(status(page)).toHaveText('1 / 6')
  await expect(active(page)).toHaveCount(2)
  const width = (await active(page).first().boundingBox())!.width
  await page.getByRole('button', { name: '放大', exact: true }).click()
  await expect
    .poll(async () => (await active(page).first().boundingBox())?.width ?? 0)
    .toBeGreaterThan(width)
  await page.getByRole('button', { name: '旋转页面', exact: true }).click()
  await expect(active(page)).toHaveCount(2)
  await expect
    .poll(async () => {
      const rect = await active(page).first().boundingBox()
      return rect ? rect.height / rect.width : 0
    })
    .toBeGreaterThan(0.7)
  await page.screenshot({ path: info.outputPath('pdf-chinese-rotated.png') })
  expect(resources.some(url => url.includes('UniGB-UCS2-H'))).toBe(true)
  await input(page).fill('needle')
  await input(page).fill('没有这个内容')
  await expect(status(page)).toHaveText('无匹配结果')
  await expect(page.locator('.pdf-search-match')).toHaveCount(0)
  await expect(
    page.getByRole('button', { name: '下一个匹配 (Enter)' })
  ).toBeDisabled()
  expect(errors).toEqual([])
})

test('a page whose text cannot be extracted does not block importing, rendering or searching other pages', async ({
  page,
}) => {
  await page.evaluate(async () => {
    const path = '/src/modules/pdf/services/pdf.ts'
    const { loadPdf } = await import(path)
    const task = loadPdf(
      await (await fetch('/pdf-search-fixture.pdf')).arrayBuffer()
    )
    const pdf = await task.promise
    const pageProxy = await pdf.getPage(2)
    const prototype = Object.getPrototypeOf(pageProxy)
    const getText = prototype.getTextContent
    prototype.getTextContent = function (...args: unknown[]) {
      return this.pageNumber === 2
        ? Promise.reject(new Error('Fixture text extraction failure'))
        : getText.apply(this, args)
    }
    await task.destroy()
  })
  await importFixture(page)
  await page.keyboard.press('Control+f')
  await input(page).fill('needle')
  await expect(status(page)).toHaveText('1 / 10（1 页无法搜索）')
  await page.getByRole('button', { name: '跳转第 2 页', exact: true }).click()
  await expect(
    page.locator('.pdf-viewport [data-pdf-page="2"] canvas')
  ).toBeInViewport()
  await expect(page.getByText('此页渲染失败', { exact: true })).toHaveCount(0)
})
