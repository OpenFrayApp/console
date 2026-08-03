// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import {
  rosterPcToCombatant,
  syncCombatantFromRoster,
  type RosterPc,
} from '../../src/schema/roster.ts'

const base: RosterPc = {
  id: 'pc-1',
  name: 'Thalia',
  ac: 16,
  maxHp: 38,
  senses: { passivePerception: 14, darkvision: 60 },
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
    expect(c.senses).toEqual({ passivePerception: 14, darkvision: 60 })
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
    expect(
      rosterPcToCombatant({ ...base, abilities: { ...base.abilities!, dex: 20 } }).initiativeMod,
    ).toBe(5)
    expect(
      rosterPcToCombatant({ ...base, abilities: { ...base.abilities!, dex: 7 } }).initiativeMod,
    ).toBe(-2)
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

  it('links the combatant back to its saved roster character', () => {
    expect(rosterPcToCombatant(base).rosterId).toBe('pc-1')
  })

  it('derives AC from class and armor when asked to, and keeps the typed AC otherwise', () => {
    const monk: RosterPc = { ...base, class: 'Monk', acAuto: true }
    expect(rosterPcToCombatant(monk).ac).toBe(12) // 10 + DEX 2 + WIS 0
    // Same facts without the checkbox: the GM's number stands.
    expect(rosterPcToCombatant({ ...monk, acAuto: false }).ac).toBe(16)
    // Asked to derive but with nothing to derive from: fall back to the typed AC.
    expect(rosterPcToCombatant({ ...monk, abilities: undefined }).ac).toBe(16)
  })

  it('derives armored AC with magic enhancements riding their items', () => {
    const fighter: RosterPc = {
      ...base,
      class: 'Fighter',
      acAuto: true,
      armor: 'plate',
      armorBonus: 1,
      shield: true,
      shieldBonus: 1,
    }
    expect(rosterPcToCombatant(fighter).ac).toBe(22) // 18 + 1 + 2 + 1
  })

  it('lets a typed initiative override the derivation — the feat the app cannot know', () => {
    expect(rosterPcToCombatant({ ...base, initiativeMod: 3 }).initiativeMod).toBe(3)
    expect(rosterPcToCombatant({ ...base, initiativeMod: 0 }).initiativeMod).toBe(0)
  })

  it('gives a Bard of level 2+ half proficiency on top of DEX (Jack of All Trades)', () => {
    expect(rosterPcToCombatant({ ...base, class: 'Bard', level: 9 }).initiativeMod).toBe(4) // 2 + ⌊4/2⌋
  })

  it('carries the build facts onto the combatant so don and doff can re-derive', () => {
    const c = rosterPcToCombatant({ ...base, class: 'Monk', level: 5, acAuto: true })
    expect(c.class).toBe('Monk')
    expect(c.level).toBe(5)
    expect(c.acAuto).toBe(true)
  })
})

describe('syncCombatantFromRoster', () => {
  it('updates character fields but preserves combat state', () => {
    const inFight = {
      ...rosterPcToCombatant(base),
      hp: { current: 5, max: 38, temp: 3 },
      initiative: 17,
      status: 'unconscious' as const,
    }
    const edited: RosterPc = {
      ...base,
      name: 'Thalia the Bold',
      ac: 18,
      abilities: { ...base.abilities!, dex: 18 },
      dmNotes: 'Owes the party gold',
    }
    const synced = syncCombatantFromRoster(inFight, edited)

    // Character fields follow the edit…
    expect(synced.name).toBe('Thalia the Bold')
    expect(synced.ac).toBe(18)
    expect(synced.initiativeMod).toBe(4) // derived from DEX 18
    expect(synced.dmNotes).toBe('Owes the party gold')
    // …but combat state stays put (HP edits never reach the saved character).
    expect(synced.hp).toEqual({ current: 5, max: 38, temp: 3 })
    expect(synced.initiative).toBe(17)
    expect(synced.status).toBe('unconscious')
    expect(synced.combatantId).toBe(inFight.combatantId)
    expect(synced.rosterId).toBe('pc-1')
  })

  it('carries an edited max HP to the board, clamping current on a decrease', () => {
    const inFight = { ...rosterPcToCombatant(base), hp: { current: 30, max: 38, temp: 0 } }
    expect(syncCombatantFromRoster(inFight, { ...base, maxHp: 50 }).hp).toEqual({
      current: 30,
      max: 50,
      temp: 0,
    })
    expect(syncCombatantFromRoster(inFight, { ...base, maxHp: 20 }).hp).toEqual({
      current: 20,
      max: 20,
      temp: 0,
    })
  })
})
