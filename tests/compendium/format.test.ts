// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import { crDetail, legendaryPreamble, proficiencyBonus, titleCase } from '../../src/compendium/format.ts'

describe('proficiencyBonus', () => {
  it('follows the CR table', () => {
    expect(proficiencyBonus(0)).toBe(2)
    expect(proficiencyBonus(4)).toBe(2)
    expect(proficiencyBonus(5)).toBe(3)
    expect(proficiencyBonus(16)).toBe(5)
    expect(proficiencyBonus(17)).toBe(6)
    expect(proficiencyBonus(30)).toBe(9)
  })
})

describe('crDetail', () => {
  const dragon = { cr: 16, xp: 15000, xpLair: 18000 }

  it('reference view: XP, the lair alternative, and PB — SRD style', () => {
    expect(crDetail(dragon)).toBe(' (XP 15,000, or 18,000 in lair; PB +5)')
    expect(crDetail({ cr: 1, xp: 200 })).toBe(' (XP 200; PB +2)')
  })

  it('combat view: only the current XP, no PB', () => {
    expect(crDetail(dragon, { combat: true })).toBe(' (XP 15,000)')
    expect(crDetail(dragon, { combat: true, inLair: true })).toBe(' (XP 18,000)')
  })

  it('is empty without CR/XP', () => {
    expect(crDetail({})).toBe('')
  })
})

describe('legendaryPreamble', () => {
  it('is name-free and omits the count (shown in the heading)', () => {
    const p = legendaryPreamble()
    expect(p).toContain('this creature can expend a use')
    expect(p).not.toMatch(/Legendary Action Uses|dragon/i)
  })

  it('2014 wording notes that some cost more than one use', () => {
    expect(legendaryPreamble('5.0')).toContain('cost more than one use')
  })
})

describe('titleCase', () => {
  it('capitalises every word', () => {
    expect(titleCase('lawful evil')).toBe('Lawful Evil')
    expect(titleCase('dragon (chromatic)')).toBe('Dragon (Chromatic)')
  })
})
