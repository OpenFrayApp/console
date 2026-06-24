// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

/**
 * Validate a candidate creature dataset and optionally diff it against a reference.
 *
 *   node scripts/validate-compendium.ts <candidate.json> [reference.json]
 *
 * Invariants (self-consistency) always run; the diff runs when a reference is given.
 * Exits non-zero if any invariant error is found, so it can gate an ingest.
 */

import { readFileSync } from 'node:fs'
import type { Creature } from '../src/schema/creature.ts'
import { diffDatasets, validateDataset, type Issue } from '../src/compendium/validate.ts'

const load = (p: string): Creature[] => JSON.parse(readFileSync(p, 'utf8'))

const [candidatePath, referencePath] = process.argv.slice(2)
if (!candidatePath) {
  console.error('usage: node scripts/validate-compendium.ts <candidate.json> [reference.json]')
  process.exit(2)
}

const candidate = load(candidatePath)
const report = validateDataset(candidate)

console.log(`\n=== invariants: ${candidatePath} (${report.count} creatures) ===`)
console.log(`errors: ${report.errors}   warnings: ${report.warns}`)

if (report.errors) {
  console.log('\nerrors by field:')
  for (const [field, n] of Object.entries(report.errorsByField).sort((a, b) => b[1] - a[1]))
    console.log(`  ${String(n).padStart(4)}  ${field}`)
}

const warnsByField: Record<string, number> = {}
for (const i of report.issues) if (i.severity === 'warn') warnsByField[i.field.split('.')[0]] = (warnsByField[i.field.split('.')[0]] ?? 0) + 1
if (report.warns) {
  console.log('\nwarnings by field:')
  for (const [field, n] of Object.entries(warnsByField).sort((a, b) => b[1] - a[1]))
    console.log(`  ${String(n).padStart(4)}  ${field}`)
}

const sample = (issues: Issue[], sev: 'error' | 'warn', n = 12) =>
  issues.filter((i) => i.severity === sev).slice(0, n)
const printSample = (label: string, list: Issue[]) => {
  if (!list.length) return
  console.log(`\n${label} (first ${list.length}):`)
  for (const i of list) console.log(`  ${i.name} · ${i.field}: ${i.message}`)
}
printSample('sample errors', sample(report.issues, 'error'))
printSample('sample warnings', sample(report.issues, 'warn'))

if (referencePath) {
  const reference = load(referencePath)
  const diff = diffDatasets(candidate, reference)
  console.log(`\n=== diff vs ${referencePath} ===`)
  console.log(`matched: ${diff.matched}   only-in-candidate: ${diff.onlyInCandidate.length}   only-in-reference: ${diff.onlyInReference.length}`)
  if (diff.onlyInCandidate.length) console.log(`  + ${diff.onlyInCandidate.slice(0, 20).join(', ')}${diff.onlyInCandidate.length > 20 ? ' …' : ''}`)
  if (diff.onlyInReference.length) console.log(`  - ${diff.onlyInReference.slice(0, 20).join(', ')}${diff.onlyInReference.length > 20 ? ' …' : ''}`)

  console.log(`\nfield diffs: ${diff.diffs.length}`)
  for (const [field, n] of Object.entries(diff.diffsByField).sort((a, b) => b[1] - a[1]))
    console.log(`  ${String(n).padStart(4)}  ${field}`)
  console.log('\nsample diffs (first 15):')
  for (const d of diff.diffs.slice(0, 15))
    console.log(`  ${d.name} · ${d.field}: candidate=${JSON.stringify(d.candidate)} reference=${JSON.stringify(d.reference)}`)
}

process.exitCode = report.errors ? 1 : 0
