import { expect, test } from '@playwright/test'

test('AI profile settings and document conversation work through the IPC boundary', async ({
  page,
}, testInfo) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('/tests/agent-ui-smoke.html')
  await page.getByRole('button', { name: '设置', exact: true }).click()
  await page.getByRole('button', { name: 'AI Agent', exact: true }).click()
  await page.getByLabel('配置名称', { exact: true }).fill('测试文档助手')
  await page.getByLabel('API Key', { exact: true }).fill('synthetic-test-key')
  await page.getByRole('button', { name: '获取模型', exact: true }).click()
  await expect(
    page.getByText('已获取 2 个模型', { exact: false })
  ).toBeVisible()
  await page.getByLabel('模型名称', { exact: true }).fill('fixture-model')
  await page.locator('summary').click()
  await page.getByRole('button', { name: '增强', exact: true }).click()
  await page.getByRole('button', { name: '测试连接', exact: true }).click()
  await expect(
    page.getByText('测试使用当前填写内容，尚未保存。', { exact: false })
  ).toBeVisible()
  expect(
    await page.evaluate(() => (window as any).agentTest.saved.profiles.length)
  ).toBe(0)
  await page.getByRole('button', { name: '保存并使用', exact: true }).click()
  await expect(
    page.getByText('已保存并使用 测试文档助手', { exact: true })
  ).toBeVisible()
  await expect(page.getByLabel('API Key', { exact: true })).toHaveValue('')
  expect(
    await page.evaluate(
      () => (window as any).agentTest.saved.profiles[0].limits.maxSteps
    )
  ).toBe(32)
  expect(
    await page.evaluate(() =>
      JSON.stringify((window as any).agentTest.saved).includes(
        'synthetic-test-key'
      )
    )
  ).toBe(false)
  await page.screenshot({
    path: testInfo.outputPath('agent-settings-light.png'),
  })
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'dark'
  })
  await expect(page.getByLabel('API Key', { exact: true })).toHaveCSS(
    'background-color',
    'rgb(35, 38, 44)'
  )
  await page.screenshot({
    path: testInfo.outputPath('agent-settings-dark.png'),
  })
  await page.evaluate(() => {
    document.documentElement.dataset.theme = 'light'
  })
  await expect(page.getByLabel('配置名称', { exact: true })).toHaveCSS(
    'background-color',
    'rgb(255, 255, 255)'
  )
  await page
    .locator('section[aria-label="AI Agent 配置"] > div')
    .first()
    .evaluate(el => {
      el.scrollTop = 0
    })
  await page.screenshot({
    path: testInfo.outputPath('agent-settings-overview.png'),
  })
  await page.setViewportSize({ width: 900, height: 600 })
  expect(
    await page
      .getByRole('dialog')
      .evaluate(el => el.scrollWidth <= el.clientWidth)
  ).toBe(true)
  await expect(
    page.getByRole('button', { name: '保存并使用', exact: true })
  ).toBeInViewport()
  await page.screenshot({
    path: testInfo.outputPath('agent-settings-compact.png'),
  })
  await page.setViewportSize({ width: 1440, height: 920 })
  await page.getByRole('button', { name: '关闭对话框', exact: true }).click()
  await page.getByRole('button', { name: '更多操作', exact: true }).click()
  await page.getByText('AI 助手', { exact: true }).click()
  await page.getByRole('button', { name: '总结文档', exact: true }).click()
  await page.getByRole('button', { name: '发送消息', exact: true }).click()
  await expect(
    page.getByText('这是合成测试响应。', { exact: true })
  ).toBeVisible()
  expect(
    await page.evaluate(
      () =>
        (window as any).agentTest.calls.find(
          (c: any) => c.command === 'agent_complete'
        ).payload.input.context.document.text.length
    )
  ).toBeGreaterThan(0)
  await page.evaluate(() => {
    ;(window as any).agentTest.slow = true
  })
  await page
    .getByRole('textbox', { name: 'AI 请求', exact: true })
    .fill('继续解释')
  await page.getByRole('button', { name: '发送消息', exact: true }).click()
  await page.getByRole('button', { name: '停止生成', exact: true }).click()
  await expect(
    page.getByRole('button', { name: '发送消息', exact: true })
  ).toBeVisible()
  await expect(
    page.getByText('这是合成测试响应。', { exact: true })
  ).toHaveCount(1)
  await page.evaluate(() => {
    ;(window as any).agentTest.slow = false
    ;(window as any).agentTest.fail = true
  })
  await page
    .getByRole('textbox', { name: 'AI 请求', exact: true })
    .fill('测试错误')
  await page.getByRole('button', { name: '发送消息', exact: true }).click()
  await expect(
    page.getByText('模型服务返回 HTTP 401，请检查密钥', { exact: true })
  ).toBeVisible()
  await expect(
    page.getByRole('textbox', { name: 'AI 请求', exact: true })
  ).toHaveValue('测试错误')
  await page.screenshot({ path: testInfo.outputPath('agent-conversation.png') })
  await page.getByRole('button', { name: 'AI Agent 配置', exact: true }).click()
  await page.getByLabel('添加服务配置', { exact: true }).selectOption('claude')
  await page.getByRole('button', { name: '添加', exact: true }).click()
  await expect(page.getByLabel('API 格式', { exact: true })).toHaveValue(
    'anthropic'
  )
  await page.getByLabel('模型名称', { exact: true }).fill('claude-fixture')
  await page.getByRole('button', { name: '通用', exact: true }).click()
  await page.getByRole('button', { name: 'AI Agent', exact: true }).click()
  await expect(page.getByLabel('模型名称', { exact: true })).toHaveValue(
    'claude-fixture'
  )
  await page.getByRole('button', { name: '保存并使用', exact: true }).click()
  await expect(
    page.getByText('已保存并使用 Claude', { exact: true })
  ).toBeVisible()
  await page.getByRole('button', { name: '关闭对话框', exact: true }).click()
  await expect(
    page.getByText('这是合成测试响应。', { exact: true })
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'AI Agent 配置', exact: true }).click()
  await page.getByRole('button', { name: '删除配置', exact: true }).click()
  expect(
    await page.evaluate(() => (window as any).agentTest.saved.activeId)
  ).toBe('')
  await page.getByLabel('保存时清除已有密钥', { exact: true }).check()
  await page.getByRole('button', { name: '保存并使用', exact: true }).click()
  await expect(
    page.getByText('已保存并使用 测试文档助手', { exact: true })
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => (window as any).agentTest.saved.profiles[0].hasApiKey
    )
  ).toBe(false)
  expect(errors).toEqual([])
})
