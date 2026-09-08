import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  newAgentProfile,
  editAgentProfile,
  profileInput,
  validateProfile,
} from '../src/modules/ai/settings.ts'

test('profiles have isolated limits and do not expose existing keys to the settings draft', () => {
  const first = newAgentProfile('claude')
  const second = newAgentProfile('local')
  first.limits.maxSteps = 32
  assert.equal(second.limits.maxSteps, 8)
  assert.equal(first.apiFormat, 'anthropic')
  assert.equal(second.baseUrl, 'http://localhost:11434/v1')
  const edited = editAgentProfile({ ...first, id: 'saved', hasApiKey: true })
  assert.equal(edited.apiKey, '')
  assert.equal(edited.hasApiKey, true)
  edited.limits.maxSteps = 64
  assert.equal(first.limits.maxSteps, 32)
})

test('configuration rejects invalid endpoints, missing models, and noninteger limits', () => {
  const draft = newAgentProfile()
  assert.match(validateProfile(draft), /模型名称/)
  draft.model = 'my-model'
  for (const baseUrl of [
    'http://remote.example/v1',
    'https://user:key@example.com',
    'https://example.com?k=secret',
    'https://example.com/#fragment',
  ]) {
    assert.match(validateProfile({ ...draft, baseUrl }), /HTTPS/)
  }
  assert.equal(
    validateProfile({ ...draft, baseUrl: 'http://127.0.0.1:1234/v1' }),
    ''
  )
  assert.match(
    validateProfile({ ...draft, limits: { ...draft.limits, maxSteps: 1.5 } }),
    /容量/
  )
  assert.equal(validateProfile({ ...draft, enabled: false, model: '' }), '')
})

test('IPC save payload snapshots configuration and leaves UI-only metadata out', () => {
  const draft = {
    ...newAgentProfile(),
    id: 'profile',
    model: ' model-id ',
    hasApiKey: true,
    clearKey: true,
  }
  const input = profileInput(draft)
  draft.limits.maxSteps = 99
  assert.equal(input.config.limits.maxSteps, 8)
  assert.equal(input.config.model, 'model-id')
  assert.equal('hasApiKey' in input.config, false)
  assert.equal('clearKey' in input.config, false)
})
