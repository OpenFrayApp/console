// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { AbilityScores } from '../../src/schema/primitives.ts'
import {
  ARMOR,
  ARMOR_NAMES,
  classLabel,
  deriveAc,
  deriveInitiativeMod,
  pcProficiencyBonus,
} from '../../src/schema/pcStats.ts'

/** Scores with the modifiers the assertions lean on: DEX +3, CON +2, WIS +1. */
const scores: AbilityScores = { str: 10, dex: 16, con: 14, int: 10, wis: 12, cha: 8 }

describe('pcProficiencyBonus', () => {
  it('follows the level table: +2 at 1st, one more every four levels', () => {
    expect(pcProficiencyBonus(1)).toBe(2)
    expect(pcProficiencyBonus(4)).toBe(2)
    expect(pcProficiencyBonus(5)).toBe(3)
    expect(pcProficiencyBonus(8)).toBe(3)
    expect(pcProficiencyBonus(9)).toBe(4)
    expect(pcProficiencyBonus(13)).toBe(5)
    expect(pcProficiencyBonus(17)).toBe(6)
    expect(pcProficiencyBonus(20)).toBe(6)
  })

  it('clamps nonsense levels into 1–20', () => {
    expect(pcProficiencyBonus(0)).toBe(2)
    expect(pcProficiencyBonus(99)).toBe(6)
  })
})

describe('deriveAc', () => {
  it('returns null without ability scores — never guesses', () => {
    expect(deriveAc({ armor: 'plate' })).toBeNull()
  })

  it('reads the armor table: light takes all of DEX, medium caps at +2, heavy none', () => {
    expect(deriveAc({ abilities: scores, armor: 'leather' })).toBe(14) // 11 + 3
    expect(deriveAc({ abilities: scores, armor: 'breastplate' })).toBe(16) // 14 + 2 cap
    expect(deriveAc({ abilities: scores, armor: 'plate' })).toBe(18) // flat
  })

  it('adds a shield as +2 on top of anything', () => {
    expect(deriveAc({ abilities: scores, armor: 'chain-mail', shield: true })).toBe(18)
    expect(deriveAc({ abilities: scores, shield: true })).toBe(15) // 10 + 3 + 2
  })

  it('counts a magic armor’s +N only while the armor is worn', () => {
    expect(deriveAc({ abilities: scores, armor: 'plate', armorBonus: 1 })).toBe(19)
    expect(deriveAc({ abilities: scores, armorBonus: 1 })).toBe(13) // unarmored: no +1
  })

  it('counts a magic shield’s +N only with the shield', () => {
    expect(deriveAc({ abilities: scores, shield: true, shieldBonus: 2 })).toBe(17) // 10+3+2+2
    expect(deriveAc({ abilities: scores, shieldBonus: 2 })).toBe(13)
  })

  it('gives an unarmored Barbarian 10 + DEX + CON, keeping the shield', () => {
    expect(deriveAc({ abilities: scores, class: 'Barbarian' })).toBe(15)
    expect(deriveAc({ abilities: scores, class: 'Barbarian', shield: true })).toBe(17)
  })

  it('gives an unarmored, shieldless Monk 10 + DEX + WIS', () => {
    expect(deriveAc({ abilities: scores, class: 'Monk' })).toBe(14)
    // A shielded Monk loses the formula and falls back to plain 10 + DEX + shield.
    expect(deriveAc({ abilities: scores, class: 'Monk', shield: true })).toBe(15)
  })

  it('lets armor win over an unarmored formula — a Barbarian in hide is 12 + capped DEX', () => {
    expect(deriveAc({ abilities: scores, class: 'Barbarian', armor: 'hide' })).toBe(14)
  })

  it('wears Mage Armor as armor: 13 + full DEX, shield on top', () => {
    expect(deriveAc({ abilities: scores, armor: 'mage-armor' })).toBe(16)
    expect(deriveAc({ abilities: scores, armor: 'mage-armor', shield: true })).toBe(18)
  })

  it('covers every armor the table prints', () => {
    for (const name of ARMOR_NAMES) {
      const ac = deriveAc({ abilities: scores, armor: name })
      expect(ac, name).toBeGreaterThanOrEqual(ARMOR[name].base)
    }
  })
})

describe('deriveInitiativeMod', () => {
  it('returns null without ability scores', () => {
    expect(deriveInitiativeMod({ class: 'Fighter', level: 5 })).toBeNull()
  })

  it('is the DEX modifier for everyone without a derivable class piece', () => {
    expect(deriveInitiativeMod({ abilities: scores })).toBe(3)
    expect(deriveInitiativeMod({ abilities: scores, class: 'Fighter', level: 20 })).toBe(3)
  })

  it('adds half the proficiency bonus for a Bard of level 2+ (Jack of All Trades)', () => {
    expect(deriveInitiativeMod({ abilities: scores, class: 'Bard', level: 1 })).toBe(3)
    expect(deriveInitiativeMod({ abilities: scores, class: 'Bard', level: 2 })).toBe(4) // +⌊2/2⌋
    expect(deriveInitiativeMod({ abilities: scores, class: 'Bard', level: 9 })).toBe(5) // +⌊4/2⌋
    expect(deriveInitiativeMod({ abilities: scores, class: 'Bard', level: 17 })).toBe(6) // +⌊6/2⌋
  })

  it('treats a Bard with no level as 1st — no half proficiency yet', () => {
    expect(deriveInitiativeMod({ abilities: scores, class: 'Bard' })).toBe(3)
  })
})

describe('classLabel', () => {
  it('joins class and level, drops what is missing', () => {
    expect(classLabel({ class: 'Wizard', level: 5 })).toBe('Wizard 5')
    expect(classLabel({ class: 'Monk' })).toBe('Monk')
    expect(classLabel({ level: 5 })).toBeNull()
    expect(classLabel({})).toBeNull()
  })
})
