import { expect, test } from '@playwright/test'

const file = {
  path: 'C:\\fixtures\\中文 空格.md',
  name: '中文 空格.md',
  content:
    '# 文档标题\n\n```md\n# 不是目录\n```\n\n' +
    '正文段落。\n\n'.repeat(80) +
    '## 跳转目标\n\n结尾',
  modifiedAt: 1000,
  error: null,
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(file => {
    ;(window as any).initialLaunchFiles = [file]
  }, file)
  await page.goto('/tests/desktop-smoke.html')
  await expect.poll(() => page.evaluate(() => (window as any).desktopTest?.calls.some(
    (call: any) => call.command === 'desktop_set_ready' && call.payload.ready
  ) ?? false)).toBe(true)
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).desktopTest
          .documents()
          .some((doc: any) => doc.sourcePath === 'C:\\fixtures\\中文 空格.md')
      )
    )
    .toBe(true)
})

test('startup and repeat file-open requests focus one draft without overwriting edits', async ({
  page,
}) => {
  await page.evaluate(async file => {
    const state = (window as any).desktopTest
    const doc = state
      .documents()
      .find((doc: any) => doc.sourcePath === file.path)
    doc.content = '# 本地未保存的修改'
    doc.dirty = true
    state.launchFiles.push({ ...file, content: '# 磁盘内容已变化' })
    await state.emit('desktop:files-opened')
  }, file)
  await expect
    .poll(() =>
      page.evaluate(() => (window as any).desktopTest.launchFiles.length)
    )
    .toBe(0)
  const documents = await page.evaluate(
    path =>
      (window as any).desktopTest
        .documents()
        .filter((doc: any) => doc.sourcePath === path),
    file.path
  )
  expect(documents).toHaveLength(1)
  expect(documents[0].content).toBe('# 本地未保存的修改')
  await page.evaluate(async () => {
    const state = (window as any).desktopTest
    state.launchFiles.push({
      path: 'missing.md',
      name: 'missing.md',
      content: null,
      modifiedAt: 0,
      error: '文件不存在或无法访问',
    })
    await state.emit('desktop:files-opened')
  })
  await expect(page.getByText('missing.md：文件不存在或无法访问')).toBeVisible()
})

test('Markdown outline floats over the reader without changing text geometry and jumps to headings', async ({
  page,
}, info) => {
  const article = page.locator('.markdown-preview article').last()
  await expect(article).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  const before = await article.boundingBox()
  const toggle = page
    .getByRole('button', { name: '文档目录', exact: true })
    .last()
  await toggle.click()
  const outline = page.getByRole('navigation', { name: '文档标题目录' })
  await expect(outline.getByRole('button')).toHaveCount(2)
  expect(await article.boundingBox()).toEqual(before)
  await expect(page.locator('.document-outline').last()).toHaveCSS(
    'position',
    'absolute'
  )
  await page.screenshot({
    path: info.outputPath('markdown-floating-outline.png'),
    animations: 'disabled',
  })
  await outline.getByRole('button', { name: '跳转目标' }).click()
  await expect
    .poll(() =>
      page
        .locator('.markdown-preview')
        .last()
        .evaluate(el => el.scrollTop)
    )
    .toBeGreaterThan(100)
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
})

test('PDF outline toggles without resizing the page viewport', async ({
  page,
}) => {
  await page.evaluate(() => (window as any).desktopTest.openExamplePdf())
  const body = page.locator('.pdf-body')
  await expect(body).toBeVisible()
  const viewport = body.locator('.pdf-viewport')
  // Observe the reading surface (excluding the independently controlled thumbnail sidebar).
  const surface = viewport
  await expect(surface).toBeVisible()
  const before = await surface.boundingBox()
  await page.getByRole('button', { name: '文档目录', exact: true }).click()
  expect(await surface.boundingBox()).toEqual(before)
  await expect(
    page.getByRole('navigation', { name: '文档标题目录' })
  ).toBeVisible()
})
