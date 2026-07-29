// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

// Guards against a silent Astro + Prettier interaction: when Prettier wraps a line so
// an inline element starts it, Astro trims the newline and the space in front of the
// tag disappears, rendering "published at<a …>github.com". Nothing errors — the page
// just reads wrong. Fix by ending the previous line with {' '}.
//
// Run over the assembled dist/ after a build.
import { globSync, readFileSync } from 'node:fs'

const INLINE = 'a|strong|em|code|b|i'
const openJam = new RegExp(`(\\w)<(${INLINE})\\b`, 'g')
const closeJam = new RegExp(`</(${INLINE})>(\\w)`, 'g')

// globSync's exclude sees each candidate path relative to cwd ("dist/console"),
// never a fully joined "…/console/…" — match the directory itself to prune it.
const files = globSync('dist/**/*.html', { exclude: (p) => p === 'dist/console' })
const problems = []

for (const file of files) {
  let html = readFileSync(file, 'utf8')
  const bodyAt = html.indexOf('<body')
  if (bodyAt === -1) continue
  html = html.slice(bodyAt).replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/g, '')

  for (const [re, width] of [
    [openJam, 60],
    [closeJam, 40],
  ]) {
    re.lastIndex = 0
    let m
    while ((m = re.exec(html))) {
      const context = html.slice(Math.max(0, m.index - width), m.index + 40).replace(/\s+/g, ' ')
      problems.push(`${file}\n    …${context}…`)
    }
  }
}

if (problems.length) {
  console.error(`\nMissing space before or after an inline tag (${problems.length}):\n`)
  for (const p of problems) console.error(`  ${p}\n`)
  console.error("Fix: end the preceding line with {' '} so Astro can't trim it.\n")
  process.exit(1)
}

console.log(`Spacing check: ${files.length} pages clean.`)
