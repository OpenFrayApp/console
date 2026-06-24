// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import { crDetail, proficiencyBonus, titleCase } from '../../src/compendium/format.ts'

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

  it('shows XP, the lair alternative, and PB — SRD style', () => {
    expect(crDetail(dragon)).toBe(' (XP 15,000, or 18,000 in lair; PB +5)')
  })

  it('swaps to the lair XP when in the lair', () => {
    expect(crDetail(dragon, true)).toBe(' (XP 18,000, or 15,000 out of lair; PB +5)')
  })

  it('omits the lair clause when there is no lair XP', () => {
    expect(crDetail({ cr: 1, xp: 200 })).toBe(' (XP 200; PB +2)')
  })

  it('is empty without CR/XP', () => {
    expect(crDetail({})).toBe('')
  })
})

describe('titleCase', () => {
  it('capitalises every word', () => {
    expect(titleCase('lawful evil')).toBe('Lawful Evil')
    expect(titleCase('dragon (chromatic)')).toBe('Dragon (Chromatic)')
  })
})
