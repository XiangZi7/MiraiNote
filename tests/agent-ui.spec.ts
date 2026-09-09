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
  // 已保存的密钥不随配置下发，点小眼睛才按需取回。
  await page.getByRole('button', { name: '显示密钥', exact: true }).click()
  await expect(page.getByLabel('API Key', { exact: true })).toHaveValue(
    'synthetic-test-key'
  )
  await page.getByRole('button', { name: '保存并使用', exact: true }).click()
  await expect(
    page.getByText('已保存并使用 测试文档助手', { exact: true })
  ).toBeVisible()
  // 未改动取回的密钥时提交空值，换地址仍会要求重新输入，不会把旧密钥转发给别的服务。
  expect(
    await page.evaluate(
      () =>
        (window as any).agentTest.calls
          .filter((call: any) => call.command === 'agent_save_profile')
          .at(-1).payload.input.config.apiKey
    )
  ).toBe('')
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
  const panel = page.locator('aside[aria-label="AI 助手"]')
  const composer = page.getByRole('textbox', { name: 'AI 请求', exact: true })
  await page.getByRole('button', { name: '总结文档', exact: true }).click()
  await panel.locator('input[type=file]').setInputFiles({
    name: 'notes.log',
    mimeType: 'text/plain',
    buffer: Buffer.from('合成日志内容：第一行\n第二行'),
  })
  await expect(page.getByText('1 个附件', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: '发送消息', exact: true }).click()
  // 每一步都写回界面：先看到工具调用，再看到模型回答。
  await expect(
    page.getByText('提取文档标题 · 2 条', { exact: true })
  ).toBeVisible()
  await expect(
    page.getByText('这是合成测试响应。', { exact: true })
  ).toBeVisible()
  await expect(page.getByText('notes.log', { exact: true })).toBeVisible()
  const started = await page.evaluate(() => {
    const call = (window as any).agentTest.calls.find(
      (item: any) => item.command === 'agent_start'
    )
    return {
      text: call.payload.input.context.document.text.length,
      attachment: call.payload.input.attachments[0],
    }
  })
  expect(started.text).toBeGreaterThan(0)
  expect(started.attachment.name).toBe('notes.log')
  expect(started.attachment.content).toContain('第二行')
  await composer.fill('再补充三点')
  await page.getByRole('button', { name: '发送消息', exact: true }).click()
  await expect(
    page.getByText('这是合成测试响应。', { exact: true })
  ).toHaveCount(2)
  expect(
    await page.evaluate(() =>
      (window as any).agentTest.calls.some(
        (item: any) => item.command === 'agent_send'
      )
    )
  ).toBe(true)
  await page.evaluate(() => {
    ;(window as any).agentTest.slow = true
  })
  await composer.fill('继续解释')
  await page.getByRole('button', { name: '发送消息', exact: true }).click()
  await page.getByRole('button', { name: '停止生成', exact: true }).click()
  await expect(
    page.getByRole('button', { name: '发送消息', exact: true })
  ).toBeVisible()
  await expect(
    page.getByText('这是合成测试响应。', { exact: true })
  ).toHaveCount(2)
  await page.evaluate(() => {
    ;(window as any).agentTest.slow = false
    ;(window as any).agentTest.fail = true
  })
  await page.getByRole('button', { name: '新建对话', exact: true }).click()
  await composer.fill('测试错误')
  await panel.locator('input[type=file]').setInputFiles({
    name: 'retry.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('重试内容'),
  })
  await page.getByRole('button', { name: '发送消息', exact: true }).click()
  await expect(
    page.getByText('模型服务返回 HTTP 401，请检查密钥', { exact: true })
  ).toBeVisible()
  // 请求被拒绝时草稿和附件一起还给用户。
  await expect(composer).toHaveValue('测试错误')
  await expect(page.getByText('retry.txt', { exact: true })).toBeVisible()
  await page.evaluate(() => {
    ;(window as any).agentTest.fail = false
    ;(window as any).agentTest.failStep = true
  })
  await page.getByRole('button', { name: '发送消息', exact: true }).click()
  await expect(
    page.getByText('模型请求失败：合成测试错误', { exact: true })
  ).toBeVisible()
  await expect(page.getByText('任务未完成', { exact: true })).toBeVisible()
  await page.evaluate(() => {
    ;(window as any).agentTest.failStep = false
  })
  await page.screenshot({ path: testInfo.outputPath('agent-conversation.png') })
  // 聊天记录按文档保存，可重命名和删除。
  await page.getByRole('button', { name: '聊天记录', exact: true }).click()
  const history = page.getByRole('dialog', { name: '聊天记录' })
  await expect(history.getByRole('listitem')).toHaveCount(2)
  await history
    .getByRole('button', { name: /^重命名 / })
    .first()
    .click()
  await history.getByLabel('会话名称', { exact: true }).fill('文档排查记录')
  await history.getByRole('button', { name: '保存名称', exact: true }).click()
  await expect(history.getByText('文档排查记录', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('agent-history.png') })
  await history
    .getByRole('button', { name: /^删除 / })
    .first()
    .click()
  await history.getByRole('button', { name: '确认删除', exact: true }).click()
  await expect(history.getByRole('listitem')).toHaveCount(1)
  await history
    .getByRole('button', { name: '关闭聊天记录', exact: true })
    .click()
  await expect(
    page.getByText('围绕文档，继续思考', { exact: true })
  ).toBeVisible()
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
