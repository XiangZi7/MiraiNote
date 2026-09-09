import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

const { version } = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
)

test.beforeEach(async ({ page }) => {
  await page.goto('/tests/desktop-smoke.html')
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).desktopTest.calls.some(
          (call: any) =>
            call.command === 'desktop_set_ready' && call.payload.ready
        )
      )
    )
    .toBe(true)
})

test('tray quit flushes pending edits before requesting process exit', async ({
  page,
}) => {
  const id = await page.evaluate(async () => {
    const state = (window as any).desktopTest
    state.disableAutoSave()
    const id = state.edit()
    await state.emit('desktop:quit-requested')
    return id
  })
  await expect
    .poll(() =>
      page.evaluate(
        id =>
          (window as any).desktopTest.exitDocuments.find(
            (doc: any) => doc.id === id
          )?.content,
        id
      )
    )
    .toBe('# 退出前最后一段编辑')
})

test('hiding flushes without exiting, failed quit restores the window and permits retry', async ({
  page,
}) => {
  await page.evaluate(async () => {
    const state = (window as any).desktopTest
    state.edit()
    await state.emit('desktop:save-requested')
  })
  expect(
    await page.evaluate(
      () =>
        (window as any).desktopTest.calls.filter(
          (call: any) => call.command === 'desktop_finish_exit'
        ).length
    )
  ).toBe(0)
  await page.evaluate(async () => {
    const state = (window as any).desktopTest
    state.failStorage = true
    await state.emit('desktop:quit-requested')
  })
  await expect(
    page.getByText('工作区保存失败，请导出正在编辑的文档。')
  ).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(() =>
        (window as any).desktopTest.calls.some(
          (call: any) => call.command === 'desktop_show_main'
        )
      )
    )
    .toBe(true)
  expect(
    await page.evaluate(
      () =>
        (window as any).desktopTest.calls.filter(
          (call: any) => call.command === 'desktop_finish_exit'
        ).length
    )
  ).toBe(0)
  await page.evaluate(async () => {
    const state = (window as any).desktopTest
    state.failStorage = false
    await state.emit('desktop:quit-requested')
  })
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as any).desktopTest.calls.filter(
            (call: any) => call.command === 'desktop_finish_exit'
          ).length
      )
    )
    .toBe(1)
})

test('settings show the release version, project links and tray behavior', async ({
  page,
}, testInfo) => {
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await expect(page.getByText(version, { exact: true })).toBeVisible()
  await expect(page.getByText('系统托盘', { exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: '项目主页' })).toHaveAttribute(
    'href',
    'https://github.com/XiangZi7/MiraiNote'
  )
  await page.screenshot({
    path: testInfo.outputPath('settings-and-wordmark.png'),
  })
})
