// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import { makeSpellLinker } from '../../src/compendium/spelllinker.ts'

const link = makeSpellLinker([
  { name: 'Counterspell', ref: 'srd-5.2:counterspell' },
  { name: 'Shield', ref: 'srd-5.2:shield' },
  { name: 'Fireball', ref: 'srd-5.2:fireball' },
  { name: 'Ice Storm', ref: 'srd-5.2:ice-storm' },
  { name: 'Lightning Bolt', ref: 'srd-5.2:lightning-bolt' },
  { name: 'Fly', ref: 'srd-5.2:fly' },
])

describe('makeSpellLinker', () => {
  it('links spells chained after a cast verb', () => {
    expect(link('The archmage casts Counterspell or Shield in response.')).toBe(
      'The archmage casts [Counterspell](spell:srd-5.2:counterspell) or [Shield](spell:srd-5.2:shield) in response.',
    )
  })

  it('links a comma/or list and stops at the first non-spell word', () => {
    expect(link('It casts Fireball, Ice Storm, or Lightning Bolt twice in any combination.')).toBe(
      'It casts [Fireball](spell:srd-5.2:fireball), [Ice Storm](spell:srd-5.2:ice-storm), or [Lightning Bolt](spell:srd-5.2:lightning-bolt) twice in any combination.',
    )
  })

  it('leaves spell-named common words outside a cast clause alone', () => {
    expect(link('The dragon can Fly up to half its Fly Speed and raise a Shield.')).toBe(
      'The dragon can Fly up to half its Fly Speed and raise a Shield.',
    )
  })

  it('is idempotent — never rewrites an already-linked name', () => {
    const once = link('It casts Fireball.')
    expect(link(once)).toBe(once)
    expect(once).toBe('It casts [Fireball](spell:srd-5.2:fireball).')
  })

  it('returns non-cast prose untouched', () => {
    expect(link('Melee Attack Roll: +10, reach 5 ft.')).toBe('Melee Attack Roll: +10, reach 5 ft.')
  })

  it('is a no-op with no spells', () => {
    expect(makeSpellLinker([])('It casts Fireball.')).toBe('It casts Fireball.')
  })
})
