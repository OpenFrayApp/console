// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Combatant } from '../../src/schema/combatant.ts'
import { acOf, autoLabel, isAutoLabel, isFoe } from '../../src/combat/combatant.ts'
import { modifierEffect } from '../../src/combat/effects.ts'

const pc = (over: Partial<Extract<Combatant, { isPC: true }>> = {}): Combatant =>
  ({
    isPC: true,
    kind: 'pc',
    combatantId: 'c',
    name: 'Hero',
    ac: 16,
    initiative: 0,
    status: 'active',
    hp: { current: 20, max: 20, temp: 0 },
    concentration: null,
    effects: [],
    ...over,
  }) as Combatant

const monster = (): Combatant =>
  ({
    isPC: false,
    combatantId: 'm',
    creatureId: 'srd:goblin',
    creature: { id: 'srd:goblin' },
    label: 'Goblin',
    initiative: 0,
    status: 'active',
    hp: { current: 7, max: 7, temp: 0 },
    slotsUsed: {},
    spellUsesSpent: {},
    limitedUseState: {},
    legendaryRemaining: 0,
    concentration: null,
    effects: [],
    visibility: { name: 'shown', hp: 'bloodied', conditions: 'shown', ac: 'hidden' },
  }) as unknown as Combatant

describe('isFoe', () => {
  it('treats a creature as a foe unless the GM says otherwise', () => {
    expect(isFoe(monster())).toBe(true)
    expect(isFoe({ ...monster(), side: 'friend' } as Combatant)).toBe(false)
    expect(isFoe({ ...monster(), side: 'foe' } as Combatant)).toBe(true)
  })

  it('treats a plain PC as a friend', () => {
    expect(isFoe(pc())).toBe(false)
  })

  it('honours an explicit side on a quick add', () => {
    expect(isFoe(pc({ kind: 'quick', side: 'foe' }))).toBe(true)
    expect(isFoe(pc({ kind: 'quick', side: 'friend' }))).toBe(false)
  })

  it('defaults a side-less lightweight combatant to friend', () => {
    expect(isFoe(pc({ kind: 'quick' }))).toBe(false)
  })
})

describe('acOf', () => {
  const abilities = { str: 10, dex: 16, con: 14, int: 10, wis: 12, cha: 8 }

  it('reads the typed number on a PC without the derivation', () => {
    expect(acOf(pc())).toBe(16)
    expect(acOf(pc({ abilities, class: 'Monk' }))).toBe(16) // facts present, acAuto off
  })

  it('derives live for a roster PC set to auto, so doffing armor moves it', () => {
    const armored = pc({ abilities, acAuto: true, armor: 'chain-mail', shield: true })
    expect(acOf(armored)).toBe(18)
    expect(acOf({ ...armored, armor: undefined } as Combatant)).toBe(15) // 10 + 3 + 2
    expect(acOf({ ...armored, armor: undefined, shield: false } as Combatant)).toBe(13)
  })

  it('falls back to the typed number when auto has nothing to derive from', () => {
    expect(acOf(pc({ acAuto: true }))).toBe(16)
  })

  it('folds flat ac effects into anyone`s armor class', () => {
    const shieldOfFaith = modifierEffect({
      name: 'Shield of Faith',
      mode: 'flatBonus',
      direction: 'outgoing',
      applies: 'ac',
      value: 2,
    })
    expect(acOf(pc({ effects: [shieldOfFaith] }))).toBe(18)
    expect(
      acOf({
        ...monster(),
        creature: { id: 'x', ac: 15 },
        effects: [shieldOfFaith],
      } as unknown as Combatant),
    ).toBe(17)
  })

  it('lifts an unarmored PC to Mage Armor`s base, and armor turns it off', () => {
    const mageArmor = modifierEffect({
      name: 'Mage Armor',
      mode: 'flatBonus',
      direction: 'outgoing',
      applies: 'ac',
      acBase: 13,
    })
    const wizard = pc({ abilities, acAuto: true, ac: 0, effects: [mageArmor] })
    expect(acOf(wizard)).toBe(16) // 13 + DEX 3 beats 10 + DEX 3
    expect(acOf({ ...wizard, shield: true } as Combatant)).toBe(18)
    expect(acOf({ ...wizard, armor: 'plate' } as Combatant)).toBe(18) // armored: the spell does nothing
  })
})

describe('labels', () => {
  it('numbers copies after the first', () => {
    expect(autoLabel('Ghoul', 0)).toBe('Ghoul')
    expect(autoLabel('Ghoul', 1)).toBe('Ghoul 2')
    expect(autoLabel('Ghoul', 4)).toBe('Ghoul 5')
  })

  it('recognises auto-numbering so a duplicate is not read as a rename', () => {
    expect(isAutoLabel('Ghoul', 'Ghoul')).toBe(true)
    expect(isAutoLabel('Ghoul 2', 'Ghoul')).toBe(true)
    expect(isAutoLabel('Ghoul 12', 'Ghoul')).toBe(true)
  })

  it('treats a GM rename as a rename', () => {
    expect(isAutoLabel('Snik', 'Goblin')).toBe(false)
    expect(isAutoLabel('Ghoul the Second', 'Ghoul')).toBe(false)
    expect(isAutoLabel('Ghoul 2 (boss)', 'Ghoul')).toBe(false)
  })

  it('is not fooled by regex characters in a creature name', () => {
    expect(isAutoLabel('Bo.gle 2', 'Bo.gle')).toBe(true)
    expect(isAutoLabel('BoXgle 2', 'Bo.gle')).toBe(false)
  })
})
