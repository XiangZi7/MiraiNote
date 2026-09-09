import assert from 'node:assert/strict'
import { test } from 'node:test'
import {
  AGENT_MAX_FILES,
  AGENT_MAX_FILE_BYTES,
  AGENT_MAX_ATTACHMENT_BYTES,
  readAgentAttachment,
} from '../src/modules/ai/services/attachments.ts'

const file = (name, content) => new File([content], name)

test('text attachments keep their content and report UTF-8 byte size', async () => {
  const attachment = await readAgentAttachment(
    file('build.log', '错误\n下一行\t带制表符')
  )
  assert.equal(attachment.name, 'build.log')
  assert.equal(attachment.content, '错误\n下一行\t带制表符')
  assert.equal(
    attachment.size,
    new TextEncoder().encode(attachment.content).length
  )
  assert.equal(typeof attachment.id, 'string')
})

test('binary, empty and oversized files are rejected instead of silently clipped', async () => {
  await assert.rejects(readAgentAttachment(file('empty.txt', '')), /为空/)
  await assert.rejects(
    readAgentAttachment(file('binary.txt', 'a\u0000b')),
    /没有可读文本/
  )
  await assert.rejects(
    readAgentAttachment(file('blank.txt', '   \n  ')),
    /没有可读文本/
  )
  await assert.rejects(
    readAgentAttachment(file('legacy.doc', 'anything')),
    /\.docx/
  )
  await assert.rejects(
    readAgentAttachment(file('huge.txt', 'a'.repeat(AGENT_MAX_FILE_BYTES + 1))),
    /64 KB/
  )
  assert.equal(
    (await readAgentAttachment(file('edge.txt', 'a'.repeat(AGENT_MAX_FILE_BYTES))))
      .size,
    AGENT_MAX_FILE_BYTES
  )
})

test('file names that could escape a directory or break headers are rejected', async () => {
  for (const name of ['../secret.txt', 'C:\\keys.txt', 'bad\nname.txt']) {
    await assert.rejects(readAgentAttachment(file(name, 'text')), /文件名无效/)
  }
})

test('the per-message budget leaves room for four maximum-size files', () => {
  assert.equal(AGENT_MAX_FILES, 4)
  assert.ok(AGENT_MAX_FILE_BYTES * 2 <= AGENT_MAX_ATTACHMENT_BYTES)
  assert.ok(AGENT_MAX_FILE_BYTES * 3 > AGENT_MAX_ATTACHMENT_BYTES)
})
