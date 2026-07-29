// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const SCRIPT = resolve(__dirname, '../../scripts/check-spacing.mjs')
let dir: string

/** Run the spacing check in a fixture directory, returning { status, output }. */
function run(cwd: string): { status: number; output: string } {
  try {
    const out = execFileSync('node', [SCRIPT], { cwd, encoding: 'utf8', stdio: 'pipe' })
    return { status: 0, output: out }
  } catch (e) {
    const err = e as { status: number; stdout: string; stderr: string }
    return { status: err.status, output: `${err.stdout}${err.stderr}` }
  }
}

/** Write an HTML page into the fixture's dist/ at the given relative path. */
function page(rel: string, body: string): void {
  const file = join(dir, 'dist', rel)
  mkdirSync(join(file, '..'), { recursive: true })
  writeFileSync(
    file,
    `<html><head><style>a<code>ignored</code></style></head><body>${body}</body></html>`,
  )
}

afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('check-spacing', () => {
  it('passes a page whose inline tags keep their spaces', () => {
    dir = mkdtempSync(join(tmpdir(), 'spacing-'))
    page('index.html', '<p>published at <a href="x">github.com</a> today</p>')
    const { status, output } = run(dir)
    expect(status).toBe(0)
    expect(output).toContain('1 pages clean')
  })

  it('fails when a word jams against an opening inline tag', () => {
    dir = mkdtempSync(join(tmpdir(), 'spacing-'))
    page('index.html', '<p>published at<a href="x">github.com</a></p>')
    const { status, output } = run(dir)
    expect(status).toBe(1)
    expect(output).toContain('Missing space')
    expect(output).toContain('index.html')
  })

  it('fails when a word jams against a closing inline tag', () => {
    dir = mkdtempSync(join(tmpdir(), 'spacing-'))
    page('index.html', '<p><strong>bold</strong>text runs on</p>')
    const { status } = run(dir)
    expect(status).toBe(1)
  })

  it('ignores script and style contents and everything before <body>', () => {
    dir = mkdtempSync(join(tmpdir(), 'spacing-'))
    page('index.html', '<script>const x = `a<b>c`</script><p>fine <em>text</em> here</p>')
    const { status } = run(dir)
    expect(status).toBe(0)
  })

  it('skips the console bundle — Vite markup is not hand-authored', () => {
    dir = mkdtempSync(join(tmpdir(), 'spacing-'))
    page('console/index.html', '<p>jammed<a href="x">app</a></p>')
    const { status, output } = run(dir)
    expect(status).toBe(0)
    expect(output).toContain('0 pages clean')
  })
})
