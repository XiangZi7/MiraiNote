import { expect, test } from '@playwright/test'

const root = 'D:\\笔记'
const entry = (relativePath, kind = 'markdown') => ({
  path: `${root}\\${relativePath.replaceAll('/', '\\')}`,
  name: relativePath.split('/').at(-1),
  relativePath,
  kind,
  size: 32,
  modifiedAt: 1000,
})
const folder = {
  path: root,
  name: '笔记',
  entries: [entry('reports/a.md'), entry('reports/b.md'), entry('总览.md')],
  truncated: false,
  oversized: 0,
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(folder => {
    ;(window as any).initialFolder = folder
  }, folder)
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

const sources = (page: import('@playwright/test').Page) =>
  page.evaluate(() =>
    (window as any).desktopTest
      .documents()
      .map((doc: any) => doc.sourcePath)
      .filter(Boolean)
  )

test('打开文件夹后按需载入单份文档，再一次性导入其余文档', async ({ page }) => {
  await page.getByRole('button', { name: '打开文件夹…' }).click()
  await expect(
    page.getByRole('heading', { level: 1, name: '笔记' })
  ).toBeVisible()
  await expect(page.getByText('根目录')).toBeVisible()
  await expect(page.getByText('reports', { exact: true })).toBeVisible()
  // 只列出文档，尚未读取任何内容。
  expect(await sources(page)).toEqual([])

  await page.getByRole('button', { name: /总览\.md/ }).click()
  await expect.poll(() => sources(page)).toEqual([`${root}\\总览.md`])
  // 载入后切换到该文档，工作区路径保留文件夹层级。
  await expect(
    page.locator('.app-header').getByText('总览.md', { exact: true })
  ).toBeVisible()

  await page.getByRole('button', { name: '笔记', exact: true }).click()
  await expect(page.getByText('已在工作区')).toBeVisible()
  await page.getByRole('button', { name: '全部导入' }).click()
  await expect(page.getByText('已导入 2 份文档，1 份已在工作区')).toBeVisible()
  await expect
    .poll(async () => (await sources(page)).sort())
    .toEqual([
      `${root}\\reports\\a.md`,
      `${root}\\reports\\b.md`,
      `${root}\\总览.md`,
    ])
  expect(
    await page.evaluate(
      () =>
        (window as any).desktopTest
          .documents()
          .find((doc: any) => doc.name === 'a.md').path
    )
  ).toBe('笔记 / reports / a.md')
})

test('最近打开列出文件夹，移出工作区的文件仍可重新载入', async ({ page }) => {
  await page.getByRole('button', { name: '打开文件夹…' }).click()
  await page.getByRole('button', { name: /总览\.md/ }).click()
  await expect.poll(() => sources(page)).toEqual([`${root}\\总览.md`])

  await page.getByRole('button', { name: '最近打开' }).click()
  await expect(
    page.getByRole('button', { name: '笔记', exact: true }).last()
  ).toBeVisible()

  // 从工作区移除后，仍留在“最近打开”里，可以重新从磁盘载入。
  await page.evaluate(path => {
    const documents = (window as any).desktopTest.documents()
    documents.splice(
      documents.findIndex((item: any) => item.sourcePath === path),
      1
    )
  }, `${root}\\总览.md`)
  await expect(page.getByText('不在工作区的最近文件')).toBeVisible()
  await page.getByRole('button', { name: /总览\.md/ }).click()
  await expect.poll(() => sources(page)).toEqual([`${root}\\总览.md`])
})
