// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

// Guards the print edition's design tokens, per print/TYPOGRAPHY.md: a length (pt or
// mm) may only appear in print/theme.typ. Everywhere else a call site names a role.
// Sizes chosen at call sites are how the first proof reached 47 distinct lengths across
// three files, none of them related to each other — and why closing one gap made the
// next one look wrong.
//
// The second rule: vertical space comes from a block's `above`/`below`, which Typst
// collapses to the larger of two adjacent gaps. A plain `v()` adds instead, so a gap
// built from one is the sum of two decisions and correcting it moves both sides.
//
// Two forms stay legal. `v(weak: true)` collapses like block spacing and vanishes at a
// container edge, which is what optical correction wants. `v(1fr)` is not a gap at all
// — it is a spacer that divides the leftover height of a page, and the cover uses one
// to push its imprint to the foot.
//
//   node scripts/check-print-tokens.mjs
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = 'print'
const TOKENS = 'theme.typ'

// Fractions and percentages are layout, not type: `1fr` and `84%` carry no scale.
const LENGTH = /(?<![\w.])\d+(?:\.\d+)?(pt|mm|cm|in)\b/g
const PLAIN_V = /\bv\(\s*(?!weak:|\d+(?:\.\d+)?fr\b)[^)]*\)/g

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
    for (const m of code.matchAll(PLAIN_V)) {
      problems.push(`${file}:${i + 1}  ${m[0]} — use a block's above/below, or v(weak: true)`)
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
