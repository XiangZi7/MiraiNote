import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { test } from 'node:test'
import {
  nextReleaseTag,
  parseReleaseArgs,
  releaseProject,
} from '../scripts/release.mjs'
import {
  parseReleaseTag,
  syncReleaseVersion,
  versionFiles,
} from '../scripts/release-version.mjs'

const source = fileURLToPath(new URL('../', import.meta.url))
function git(root, ...args) {
  const result = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    windowsHide: true,
  })
  assert.equal(result.status, 0, result.stderr || result.stdout)
  return result.stdout.trim()
}
function fixture(t) {
  const base = mkdtempSync(join(tmpdir(), 'mirainote-release-'))
  t.after(() => rmSync(base, { recursive: true, force: true }))
  const root = join(base, 'work'),
    remote = join(base, 'origin.git')
  mkdirSync(root)
  git(base, 'init', '--bare', remote)
  git(root, 'init', '-b', 'main')
  git(root, 'config', 'user.name', 'Release Test')
  git(root, 'config', 'user.email', 'release@example.invalid')
  git(root, 'config', 'commit.gpgsign', 'false')
  git(root, 'config', 'tag.gpgsign', 'false')
  git(root, 'config', 'core.hooksPath', join(root, '.git/hooks'))
  for (const file of versionFiles) {
    mkdirSync(dirname(join(root, file)), { recursive: true })
    copyFileSync(join(source, file), join(root, file))
  }
  mkdirSync(join(root, '.github/workflows'), { recursive: true })
  copyFileSync(
    join(source, '.github/workflows/release.yml'),
    join(root, '.github/workflows/release.yml')
  )
  syncReleaseVersion(root, 'v1.2.3')
  git(root, 'add', '.')
  git(root, 'commit', '-m', 'fixture')
  git(root, 'remote', 'add', 'origin', remote)
  git(root, 'push', 'origin', 'main')
  return { root, remote }
}
const quiet = { log() {} }

test('release tags reject malformed and overflowing Windows version segments', () => {
  for (const tag of [
    'v1.2.3',
    'v0.0.0-alpha.0',
    'v1.2.3-beta.1',
    'v1.2.3-rc.65535',
  ])
    assert.equal(parseReleaseTag(tag).tag, tag)
  for (const tag of [
    undefined,
    '1.2.3',
    'v01.2.3',
    'v1.2.3\n',
    'v65536.0.0',
    'v1.2.3-rc.65536',
    'v1.2.3+build',
  ])
    assert.throws(() => parseReleaseTag(tag), /标签格式/)
  assert.throws(() => parseReleaseArgs(['--retry']), /标签格式/)
  assert.throws(() => parseReleaseArgs(['major', '--retry', 'v2.0.0']), /不能/)
  assert.equal(
    nextReleaseTag('1.2.3', ['unrelated', 'v1.9.0', 'v1.10.0-beta.1']),
    'v1.10.1'
  )
  assert.equal(nextReleaseTag('1.2.3', [], 'minor'), 'v1.3.0')
})

test('version synchronization changes only the application package in Cargo.lock', t => {
  const { root } = fixture(t)
  const before = readFileSync(join(root, 'src-tauri/Cargo.lock'), 'utf8')
  syncReleaseVersion(root, 'v2.0.0-beta.1')
  assert.equal(
    syncReleaseVersion(root, 'v2.0.0-beta.1', { check: true }).prerelease,
    true
  )
  const after = readFileSync(join(root, 'src-tauri/Cargo.lock'), 'utf8')
  assert.equal(
    after.replace(
      'name = "mirainote"\nversion = "2.0.0-beta.1"',
      'name = "mirainote"\nversion = "1.2.3"'
    ),
    before
  )
  writeFileSync(
    join(root, 'src-tauri/Cargo.toml'),
    '[package]\nname = "wrong"\nversion = "1.0.0"\n'
  )
  const packageBefore = readFileSync(join(root, 'package.json'), 'utf8')
  assert.throws(() => syncReleaseVersion(root, 'v3.0.0'), /唯一/)
  assert.equal(readFileSync(join(root, 'package.json'), 'utf8'), packageBefore)
})

test('dry run leaves commits, tags and working files unchanged', t => {
  const { root, remote } = fixture(t)
  const head = git(root, 'rev-parse', 'HEAD')
  writeFileSync(join(root, 'draft.txt'), 'uncommitted')
  assert.equal(releaseProject(root, { ...quiet, dryRun: true }).tag, 'v1.2.4')
  assert.equal(git(root, 'rev-parse', 'HEAD'), head)
  assert.equal(git(remote, 'rev-parse', 'refs/heads/main'), head)
  assert.equal(git(root, 'tag', '--list'), '')
  assert.equal(
    syncReleaseVersion(root, undefined, { check: true }).version,
    '1.2.3'
  )
  assert.throws(() => releaseProject(root, quiet), /未提交/)
})

test('publishing commits all versions and atomically pushes only the requested tag', t => {
  const { root, remote } = fixture(t)
  git(root, 'tag', '-a', 'unrelated', '-m', 'unrelated')
  git(root, 'config', 'push.followTags', 'true')
  assert.equal(releaseProject(root, quiet).tag, 'v1.2.4')
  assert.equal(git(root, 'status', '--porcelain'), '')
  assert.equal(
    syncReleaseVersion(root, undefined, { check: true }).version,
    '1.2.4'
  )
  assert.equal(git(remote, 'tag', '--list'), 'v1.2.4')
  assert.equal(
    git(remote, 'rev-parse', 'v1.2.4^{commit}'),
    git(root, 'rev-parse', 'HEAD')
  )
  assert.equal(git(remote, 'rev-parse', 'main'), git(root, 'rev-parse', 'HEAD'))
})

test('rejected atomic push preserves prepared version and retry does not bump it again', t => {
  const { root, remote } = fixture(t)
  const original = git(remote, 'rev-parse', 'main')
  git(remote, 'config', 'receive.denyNonFastForwards', 'false')
  const hook = join(remote, 'hooks/pre-receive')
  writeFileSync(hook, '#!/bin/sh\nexit 1\n', { mode: 0o755 })
  assert.throws(() => releaseProject(root, quiet), /--retry v1.2.4/)
  assert.equal(git(remote, 'rev-parse', 'main'), original)
  assert.equal(git(remote, 'tag', '--list'), '')
  assert.equal(
    syncReleaseVersion(root, undefined, { check: true }).version,
    '1.2.4'
  )
  assert.throws(() => releaseProject(root, quiet), /尚未推送/)
  const prepared = git(root, 'rev-parse', 'HEAD')
  rmSync(hook)
  releaseProject(root, { ...quiet, retry: 'v1.2.4' })
  assert.equal(git(remote, 'rev-parse', 'main'), prepared)
  assert.equal(git(remote, 'tag', '--list'), 'v1.2.4')
})

test('release refuses a committed tree that has no workflow', t => {
  const { root } = fixture(t)
  git(root, 'rm', '.github/workflows/release.yml')
  git(root, 'commit', '-m', 'remove workflow')
  assert.throws(() => releaseProject(root, quiet), /先提交发版工作流/)
})
