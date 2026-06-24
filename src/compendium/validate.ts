// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

/**
 * Compendium validation + cross-source diff. Build-time tooling (not shipped to the
 * browser) used to vet a candidate creature dataset before it replaces the live one.
 *
 * Two independent lenses:
 *  - `validateDataset` — self-consistency invariants that must hold for any correct
 *    stat block (save = mod + PB, XP = CR table, HP = dice average, …). These catch
 *    *silently-wrong* values without needing a second source.
 *  - `diffDatasets` — field-level comparison against a reference dataset (e.g. the
 *    current Open5e set) to surface coverage gaps and disagreements for review.
 */

import type { Creature } from '../schema/creature.ts'
import type { Ability } from '../schema/primitives.ts'

const ABILITIES: Ability[] = ['str', 'dex', 'con', 'int', 'wis', 'cha']

export const abilityMod = (score: number): number => Math.floor((score - 10) / 2)

/** Proficiency bonus by challenge rating (2024 table). */
export function proficiencyBonus(cr: number): number {
  if (cr <= 4) return 2
  return 3 + Math.floor((Math.min(cr, 28) - 5) / 4) + (cr >= 29 ? 1 : 0)
}

/** Standard XP award per CR (SRD). CR 0 may be 0 or 10. */
export const XP_BY_CR: Record<string, number> = {
  '0': 0, '0.125': 25, '0.25': 50, '0.5': 100,
  '1': 200, '2': 450, '3': 700, '4': 1100, '5': 1800, '6': 2300, '7': 2900,
  '8': 3900, '9': 5000, '10': 5900, '11': 7200, '12': 8400, '13': 10000,
  '14': 11500, '15': 13000, '16': 15000, '17': 18000, '18': 20000, '19': 22000,
  '20': 25000, '21': 33000, '22': 41000, '23': 50000, '24': 62000, '25': 75000,
  '26': 90000, '27': 105000, '28': 120000, '29': 135000, '30': 155000,
}

export type Severity = 'error' | 'warn'

export interface Issue {
  id: string
  name: string
  field: string
  severity: Severity
  message: string
}

/** Average hit points of an `NdM`/`NdM+K`/`NdM-K` formula, floored as 5e prints it. */
export function hpFromFormula(formula: string): number | null {
  const m = /^(\d+)d(\d+)\s*([+-]\s*\d+)?$/.exec(formula.trim())
  if (!m) return null
  const n = Number(m[1])
  const die = Number(m[2])
  const mod = m[3] ? Number(m[3].replace(/\s/g, '')) : 0
  return Math.floor((n * (die + 1)) / 2) + mod
}

/** Invariant checks for a single creature. Errors = provably wrong; warns = suspect. */
export function validateCreature(c: Creature): Issue[] {
  const issues: Issue[] = []
  const add = (field: string, severity: Severity, message: string) =>
    issues.push({ id: c.id, name: c.name, field, severity, message })

  // Required fields (non-optional in the schema).
  if (!c.id) add('id', 'error', 'missing id')
  if (!c.source) add('source', 'error', 'missing source')
  if (!c.name) add('name', 'error', 'missing name')
  if (!c.size) add('size', 'error', 'missing size')
  if (!c.type) add('type', 'error', 'missing type')
  if (!c.alignment) add('alignment', 'warn', 'missing alignment (SRD lists one for every creature)')

  // Bounds.
  if (!(c.ac > 0 && c.ac < 40)) add('ac', 'error', `implausible AC ${c.ac}`)
  if (!(c.maxHp > 0)) add('maxHp', 'error', `implausible maxHp ${c.maxHp}`)

  // Abilities present and in range.
  if (!c.abilities) {
    add('abilities', 'error', 'missing abilities')
  } else {
    for (const ab of ABILITIES) {
      const s = c.abilities[ab]
      if (typeof s !== 'number') add(`abilities.${ab}`, 'error', 'missing ability score')
      else if (s < 1 || s > 30) add(`abilities.${ab}`, 'error', `out-of-range score ${s}`)
    }
  }

  // HP must equal its dice formula's average.
  if (c.hpFormula) {
    const expected = hpFromFormula(c.hpFormula)
    if (expected == null) add('hpFormula', 'warn', `unparseable formula "${c.hpFormula}"`)
    else if (expected !== c.maxHp)
      add('hpFormula', 'error', `maxHp ${c.maxHp} ≠ average of ${c.hpFormula} (${expected})`)
  }

  // XP must match the CR table.
  if (c.cr != null && c.xp != null) {
    const expected = XP_BY_CR[String(c.cr)]
    if (expected == null) add('cr', 'warn', `unknown CR ${c.cr}`)
    else if (c.xp !== expected && !(c.cr === 0 && c.xp === 10))
      add('xp', 'error', `XP ${c.xp} ≠ CR ${c.cr} table value (${expected})`)
  }

  // Every stored (proficient) save must equal ability mod + proficiency bonus.
  if (c.saves && c.cr != null && c.abilities) {
    const pb = proficiencyBonus(c.cr)
    for (const ab of ABILITIES) {
      const save = c.saves[ab]
      if (save == null) continue
      const expected = abilityMod(c.abilities[ab]) + pb
      if (save !== expected)
        add(`saves.${ab}`, 'error', `save ${save} ≠ mod(${abilityMod(c.abilities[ab])}) + PB(${pb}) = ${expected}`)
    }
  }

  // Passive Perception = 10 + Perception bonus (skill if proficient, else Wis mod).
  if (c.senses && c.abilities) {
    const perc = c.skills?.perception ?? abilityMod(c.abilities.wis)
    const expected = 10 + perc
    if (c.senses.passivePerception !== expected)
      add('senses.passivePerception', 'warn', `PP ${c.senses.passivePerception} ≠ 10 + perception (${expected})`)
  }

  // Action structural sanity.
  for (const a of c.actions ?? []) {
    if (a.kind === 'save' && !a.save) add(`actions.${a.id}`, 'warn', 'save action without a save requirement')
    if ((a.kind === 'melee' || a.kind === 'ranged') && a.toHit == null)
      add(`actions.${a.id}`, 'warn', `${a.kind} action with null toHit`)
    for (const d of a.damage ?? [])
      if (!/^\d+d\d+(\s*[+-]\s*\d+)?$|^\d+$/.test(d.formula.trim()))
        add(`actions.${a.id}.damage`, 'warn', `odd damage formula "${d.formula}"`)
  }

  return issues
}

export interface DatasetReport {
  count: number
  issues: Issue[]
  errors: number
  warns: number
  /** Issue counts grouped by field, errors only. */
  errorsByField: Record<string, number>
}

export function validateDataset(creatures: Creature[]): DatasetReport {
  const issues: Issue[] = []

  // Dataset-level: duplicate ids.
  const seen = new Map<string, number>()
  for (const c of creatures) seen.set(c.id, (seen.get(c.id) ?? 0) + 1)
  for (const [id, n] of seen)
    if (n > 1) issues.push({ id, name: id, field: 'id', severity: 'error', message: `duplicate id (${n}×)` })

  for (const c of creatures) issues.push(...validateCreature(c))

  const errorsByField: Record<string, number> = {}
  for (const i of issues)
    if (i.severity === 'error') errorsByField[i.field.split('.')[0]] = (errorsByField[i.field.split('.')[0]] ?? 0) + 1

  return {
    count: creatures.length,
    issues,
    errors: issues.filter((i) => i.severity === 'error').length,
    warns: issues.filter((i) => i.severity === 'warn').length,
    errorsByField,
  }
}

export interface FieldDiff {
  name: string
  field: string
  candidate: unknown
  reference: unknown
}

export interface DiffReport {
  matched: number
  onlyInCandidate: string[]
  onlyInReference: string[]
  diffs: FieldDiff[]
  /** Diff counts grouped by field. */
  diffsByField: Record<string, number>
}

const keyOf = (c: Creature): string => c.name.trim().toLowerCase()

/** Scalar fields compared between datasets; abilities/saves expanded per-ability. */
function comparable(c: Creature): Record<string, unknown> {
  const out: Record<string, unknown> = {
    size: c.size,
    type: c.type,
    alignment: c.alignment ?? null,
    ac: c.ac,
    maxHp: c.maxHp,
    hpFormula: c.hpFormula ?? null,
    initiative: c.initiative ?? null,
    cr: c.cr ?? null,
    xp: c.xp ?? null,
    passivePerception: c.senses?.passivePerception ?? null,
    languages: [...(c.languages ?? [])].sort().join('|') || null,
    actionCount: (c.actions ?? []).length,
    traitCount: (c.traits ?? []).length,
    hasLegendary: !!c.legendaryActions,
    hasSpellcasting: !!c.spellcasting,
  }
  for (const ab of ABILITIES) {
    out[`abilities.${ab}`] = c.abilities?.[ab] ?? null
    out[`saves.${ab}`] = c.saves?.[ab] ?? null
  }
  return out
}

/** Compare a candidate dataset to a reference, matching by name. */
export function diffDatasets(candidate: Creature[], reference: Creature[]): DiffReport {
  const cand = new Map(candidate.map((c) => [keyOf(c), c]))
  const ref = new Map(reference.map((c) => [keyOf(c), c]))

  const onlyInCandidate = [...cand.keys()].filter((k) => !ref.has(k)).map((k) => cand.get(k)!.name).sort()
  const onlyInReference = [...ref.keys()].filter((k) => !cand.has(k)).map((k) => ref.get(k)!.name).sort()

  const diffs: FieldDiff[] = []
  let matched = 0
  for (const [k, c] of cand) {
    const r = ref.get(k)
    if (!r) continue
    matched++
    const cc = comparable(c)
    const rc = comparable(r)
    for (const field of Object.keys(cc))
      if (JSON.stringify(cc[field]) !== JSON.stringify(rc[field]))
        diffs.push({ name: c.name, field, candidate: cc[field], reference: rc[field] })
  }

  const diffsByField: Record<string, number> = {}
  for (const d of diffs) diffsByField[d.field] = (diffsByField[d.field] ?? 0) + 1

  return { matched, onlyInCandidate, onlyInReference, diffs, diffsByField }
}
