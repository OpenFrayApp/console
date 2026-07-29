// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const SCRIPT = resolve(__dirname, '../../scripts/clean-dist.mjs')
let dir: string

afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('clean-dist', () => {
  it('removes a stale dist/ so renamed pages cannot linger', () => {
    dir = mkdtempSync(join(tmpdir(), 'clean-'))
    mkdirSync(join(dir, 'dist/old-page'), { recursive: true })
    writeFileSync(join(dir, 'dist/old-page/index.html'), 'stale')
    execFileSync('node', [SCRIPT], { cwd: dir, stdio: 'pipe' })
    expect(existsSync(join(dir, 'dist'))).toBe(false)
  })

  it('succeeds when dist/ does not exist', () => {
    dir = mkdtempSync(join(tmpdir(), 'clean-'))
    execFileSync('node', [SCRIPT], { cwd: dir, stdio: 'pipe' })
    expect(existsSync(join(dir, 'dist'))).toBe(false)
  })
})
