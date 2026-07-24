// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Spell } from '../../src/schema/spell.ts'
import { LIBRARIES } from '../../src/compendium/libraries.ts'
import { SPELL_EFFECTS, normalize } from '../../src/combat/spellEffects.ts'
import { NOT_MODELLED, SKIP_REASONS } from './spellCoverage.data.ts'

/**
 * The coverage contract: every shipped spell has a verdict. A missing map key is
 * otherwise invisible — nothing fails when a spell has no effect, which is how Fly and
 * Mind Blank shipped with no target chooser. This test makes the gap loud.
 */

const spellsFor = (file: string): Spell[] => {
  const raw: unknown = JSON.parse(readFileSync(`public/compendium/${file}`, 'utf8'))
  return (Array.isArray(raw) ? raw : (raw as { spells: Spell[] }).spells) ?? []
}

const LIBRARY_SPELLS = LIBRARIES.filter((l) => l.spellsFile).map((l) => ({
  id: l.id,
  spells: spellsFor(l.spellsFile!),
}))

const ALL_SPELLS = LIBRARY_SPELLS.flatMap((l) => l.spells)
const ALL_KEYS = new Set(ALL_SPELLS.map((s) => normalize(s.name)))

describe('spell coverage', () => {
  it('ships spells from every library that declares a spell file', () => {
    for (const { id, spells } of LIBRARY_SPELLS) {
      expect(spells.length, `${id} shipped no spells`).toBeGreaterThan(0)
    }
  })

  it('gives every compendium spell a verdict — modelled or explicitly skipped', () => {
    const untriaged = [...ALL_KEYS]
      .filter((key) => !(key in SPELL_EFFECTS) && !(key in NOT_MODELLED))
      .sort()
    expect(
      untriaged,
      `Untriaged spells. Add each to src/combat/spells/* or to tests/combat/spellCoverage.data.ts:\n${untriaged.join('\n')}`,
    ).toEqual([])
  })

  it('never names a spell the compendium does not have', () => {
    // Catches typos and renames — including a curly vs straight apostrophe, which is
    // exactly the class of key that silently never matches.
    const unknownEffects = Object.keys(SPELL_EFFECTS)
      .filter((key) => !ALL_KEYS.has(key))
      .sort()
    const unknownSkips = Object.keys(NOT_MODELLED)
      .filter((key) => !ALL_KEYS.has(key))
      .sort()
    expect(unknownEffects, 'SPELL_EFFECTS keys with no matching spell').toEqual([])
    expect(unknownSkips, 'NOT_MODELLED keys with no matching spell').toEqual([])
  })

  it('never both models and skips the same spell', () => {
    const both = Object.keys(SPELL_EFFECTS)
      .filter((key) => key in NOT_MODELLED)
      .sort()
    expect(both).toEqual([])
  })

  it('uses only known skip reasons', () => {
    for (const [name, reason] of Object.entries(NOT_MODELLED)) {
      expect(SKIP_REASONS, `${name} has an unknown reason`).toContain(reason)
    }
  })

  it('keys every entry in its normalized form', () => {
    for (const key of [...Object.keys(SPELL_EFFECTS), ...Object.keys(NOT_MODELLED)]) {
      expect(normalize(key), `${key} is not normalized`).toBe(key)
    }
  })
})
