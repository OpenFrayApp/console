// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { describe, expect, it } from 'vitest'
import type { AbilityScores } from '../../src/schema/primitives.ts'
import type { PcClass } from '../../src/schema/combatant.ts'
import {
  ARMOR,
  ARMOR_NAMES,
  CASTING_ABILITY,
  PC_CLASSES,
  classLabel,
  deriveAc,
  deriveInitiativeMod,
  deriveSaveDc,
  deriveSpellAttack,
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

describe('the spellcasting numbers', () => {
  // The scores above give INT +0, WIS +1, CHA −1, which is what separates the classes
  // below: a Wizard, a Cleric and a Bard of one level read three different abilities.
  it('is proficiency plus the ability the class casts with', () => {
    expect(deriveSpellAttack({ abilities: scores, class: 'Wizard', level: 1 })).toBe(2) // +2 INT +0
    expect(deriveSpellAttack({ abilities: scores, class: 'Cleric', level: 1 })).toBe(3) // +2 WIS +1
    expect(deriveSpellAttack({ abilities: scores, class: 'Bard', level: 1 })).toBe(1) // +2 CHA −1
  })

  it('puts the save DC 8 above the attack bonus', () => {
    for (const cls of ['Wizard', 'Cleric', 'Bard', 'Warlock'] as const) {
      const pc = { abilities: scores, class: cls, level: 7 }
      expect(deriveSaveDc(pc)).toBe((deriveSpellAttack(pc) ?? 0) + 8)
    }
  })

  it('climbs with the proficiency bonus, not with the class', () => {
    const at = (level: number) => deriveSpellAttack({ abilities: scores, class: 'Cleric', level })
    expect(at(4)).toBe(3) // +2
    expect(at(5)).toBe(4) // +3
    expect(at(17)).toBe(7) // +6
  })

  it('reads WIS for the three Wisdom casters and CHA for the four Charisma ones', () => {
    const attack = (cls: PcClass) => deriveSpellAttack({ abilities: scores, class: cls, level: 1 })
    for (const cls of ['Cleric', 'Druid', 'Ranger'] as const) expect(attack(cls), cls).toBe(3)
    for (const cls of ['Bard', 'Paladin', 'Sorcerer', 'Warlock'] as const)
      expect(attack(cls), cls).toBe(1)
    expect(attack('Wizard')).toBe(2)
  })

  it('derives nothing for a class that casts through a subclass the board never sees', () => {
    // A Fighter's Eldritch Knight or a Rogue's Arcane Trickster: one class is stored, no
    // subclass, so the Game Master's typed number stands.
    for (const cls of ['Barbarian', 'Fighter', 'Monk', 'Rogue'] as const) {
      expect(deriveSpellAttack({ abilities: scores, class: cls, level: 10 }), cls).toBeNull()
      expect(deriveSaveDc({ abilities: scores, class: cls, level: 10 }), cls).toBeNull()
    }
  })

  it('derives nothing without every fact it needs — never a number short of proficiency', () => {
    // The anonymous form collects none of these, which is why an anonymous character and
    // a quick add always fall through to the typed field.
    expect(deriveSpellAttack({ class: 'Wizard', level: 5 })).toBeNull() // no abilities
    expect(deriveSpellAttack({ abilities: scores, level: 5 })).toBeNull() // no class
    expect(deriveSpellAttack({ abilities: scores, class: 'Wizard' })).toBeNull() // no level
    expect(deriveSpellAttack({})).toBeNull()
    expect(deriveSaveDc({ abilities: scores, class: 'Wizard' })).toBeNull()
  })

  it('gives every class a verdict, so a new one can’t slip through unnoticed', () => {
    for (const cls of PC_CLASSES) {
      const derived = deriveSpellAttack({ abilities: scores, class: cls, level: 5 })
      const casts = CASTING_ABILITY[cls] !== undefined
      expect(derived === null, cls).toBe(!casts)
    }
  })
})
