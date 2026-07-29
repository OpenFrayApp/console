// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

// Guards the print edition's design tokens, per print/TYPOGRAPHY.md: a length (pt or
// mm) may only appear in print/theme.typ. Everywhere else a call site names a role.
// Sizes chosen at call sites are how the first proof reached 47 distinct lengths across
// three files, none of them related to each other — and why closing one gap made the
// next one look wrong.
//
// The document's second rule — vertical space comes from a block's `above`/`below`
// rather than a plain `v()`, because Typst collapses the former and adds the latter —
// is not enforced here yet. Twenty-three `v()` calls remain; the check lands with the
// change that removes them, so it fails on a regression rather than on a known state.
// It will need an exemption for the cover, where `v(1fr)` is page composition.
//
//   node scripts/check-print-tokens.mjs
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'print'
const TOKENS = 'theme.typ'

// Fractions and percentages are layout, not type: `1fr` and `84%` carry no scale.
const LENGTH = /(?<![\w.])\d+(?:\.\d+)?(pt|mm|cm|in)\b/g

const files = []
const walk = (dir) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (e.isDirectory()) walk(join(dir, e.name))
    else if (e.name.endsWith('.typ') && e.name !== TOKENS) files.push(join(dir, e.name))
  }
}
walk(ROOT)

const problems = []
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n')
  lines.forEach((line, i) => {
    // A comment may quote a value while explaining why it is gone.
    const code = line.replace(/\/\/.*$/, '')
    for (const m of code.matchAll(LENGTH)) {
      problems.push(`${file}:${i + 1}  ${m[0]} — move it to print/${TOKENS} and name the role`)
    }
  })
}

if (problems.length) {
  console.error('Print tokens: the design scale has been bypassed.')
  for (const p of problems) console.error('  ' + p)
  console.error(`\n${problems.length} problem(s). See print/TYPOGRAPHY.md.`)
  process.exit(1)
}
console.log(`Print tokens: ${files.length} files clean.`)
