// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const SCRIPT = resolve(__dirname, '../../scripts/assemble-site.mjs')
let dir: string

/** Drop a file into the fixture, creating parent folders. */
function file(rel: string, content = '<html></html>'): void {
  const p = join(dir, rel)
  mkdirSync(join(p, '..'), { recursive: true })
  writeFileSync(p, content)
}

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'assemble-'))
  // The three build outputs assemble-site.mjs merges, in miniature.
  file('site/dist/index.html', '<html>home</html>')
  file('site/dist/404.html', '<html>site not found</html>')
  file('site/dist/privacy/index.html')
  file('site/dist/the-waking-garden/index.html')
  file('site/dist/the-waking-garden/print/index.html', '<html>print</html>')
  file('site/dist/sitemap-index.xml', '<sitemapindex>site-only</sitemapindex>')
  file('docs/dist/index.html', '<html>docs</html>')
  file('dist/console/index.html', '<html>app</html>')
  execFileSync('node', [SCRIPT], { cwd: dir, stdio: 'pipe' })
})

afterEach(() => rmSync(dir, { recursive: true, force: true }))

describe('assemble-site', () => {
  it('copies the site to the dist root and the handbook under /docs', () => {
    expect(readFileSync(join(dir, 'dist/index.html'), 'utf8')).toContain('home')
    expect(readFileSync(join(dir, 'dist/docs/index.html'), 'utf8')).toContain('docs')
    expect(existsSync(join(dir, 'dist/privacy/index.html'))).toBe(true)
  })

  it('leaves the Vite-built console where it is', () => {
    expect(readFileSync(join(dir, 'dist/console/index.html'), 'utf8')).toContain('app')
  })

  it('removes the print edition — a local tool, never shipped', () => {
    expect(existsSync(join(dir, 'dist/the-waking-garden/print'))).toBe(false)
    expect(existsSync(join(dir, 'dist/the-waking-garden/index.html'))).toBe(true)
  })

  it('writes the Pages redirects: slash normalisation, SPA fallback, moved docs URLs', () => {
    const redirects = readFileSync(join(dir, 'dist/_redirects'), 'utf8')
    expect(redirects).toContain('/console            /console/             301')
    expect(redirects).toContain('/console/*          /console/index.html   200')
    expect(redirects).toContain('/docs               /docs/                301')
    expect(redirects).toMatch(/\/docs\/concepts\/effects\/\s+\/docs\/fight\/effects\/\s+301/)
    expect(redirects.endsWith('\n')).toBe(true)
  })

  // Deep links into the app — /console/play/<code> — are answered by the closest
  // 404.html rather than by the _redirects proxy, which has never fired on Pages.
  it('leaves the app shell as the console`s own 404 page', () => {
    expect(readFileSync(join(dir, 'dist/console/404.html'), 'utf8')).toContain('app')
    // Not at the root: the marketing site keeps its own, or every unknown URL there
    // would answer with the console.
    expect(readFileSync(join(dir, 'dist/404.html'), 'utf8')).not.toContain('app')
  })

  it('overwrites the sitemap index to cover both the site and the handbook', () => {
    const sitemap = readFileSync(join(dir, 'dist/sitemap-index.xml'), 'utf8')
    expect(sitemap).toContain('https://openfray.app/sitemap-0.xml')
    expect(sitemap).toContain('https://openfray.app/docs/sitemap-0.xml')
    expect(sitemap).not.toContain('site-only')
  })
})
