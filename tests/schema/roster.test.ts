// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import { rosterPcToCombatant, type RosterPc } from '../../src/schema/roster.ts'

const base: RosterPc = {
  id: 'pc-1',
  name: 'Thalia',
  ac: 16,
  maxHp: 38,
  passivePerception: 14,
  languages: ['Common', 'Elvish'],
  speed: { walk: 30 },
  resistances: ['fire'],
  abilities: { str: 10, dex: 14, con: 12, int: 13, wis: 11, cha: 16 },
  campaignId: 'camp-1',
}

describe('rosterPcToCombatant', () => {
  it('instantiates a fresh PC combatant at full HP with a new id', () => {
    const c = rosterPcToCombatant(base)
    expect(c.isPC).toBe(true)
    expect(c.kind).toBe('pc')
    expect(c.name).toBe('Thalia')
    expect(c.ac).toBe(16)
    expect(c.hp).toEqual({ current: 38, max: 38, temp: 0 })
    expect(c.initiative).toBe(0)
    expect(c.initiativeMod).toBe(2) // derived from DEX 14
    expect(c.status).toBe('active')
    expect(c.concentration).toBeNull()
    expect(c.effects).toEqual([])
    expect(typeof c.combatantId).toBe('string')
    expect(c.combatantId).not.toBe(base.id)
  })

  it('carries the durable board facts and ability scores onto the combatant', () => {
    const c = rosterPcToCombatant(base)
    expect(c.passivePerception).toBe(14)
    expect(c.languages).toEqual(['Common', 'Elvish'])
    expect(c.speed).toEqual({ walk: 30 })
    expect(c.resistances).toEqual(['fire'])
    expect(c.abilities).toEqual({ str: 10, dex: 14, con: 12, int: 13, wis: 11, cha: 16 })
  })

  it('does not carry the campaign tag onto the combatant (roster metadata only)', () => {
    const c = rosterPcToCombatant(base)
    expect('campaignId' in c).toBe(false)
  })

  it('derives the initiative modifier from Dexterity', () => {
    expect(rosterPcToCombatant({ ...base, abilities: { ...base.abilities!, dex: 20 } }).initiativeMod).toBe(5)
    expect(rosterPcToCombatant({ ...base, abilities: { ...base.abilities!, dex: 7 } }).initiativeMod).toBe(-2)
  })

  it('clamps HP and AC, and defaults initiative to 0 without abilities', () => {
    const c = rosterPcToCombatant({ id: 'p', name: 'Weak', ac: 0, maxHp: 0 })
    expect(c.hp).toEqual({ current: 1, max: 1, temp: 0 })
    expect(c.ac).toBe(0)
    expect(c.initiativeMod).toBe(0)
  })

  it('gives each instantiation a distinct combatant id', () => {
    expect(rosterPcToCombatant(base).combatantId).not.toBe(rosterPcToCombatant(base).combatantId)
  })
})
