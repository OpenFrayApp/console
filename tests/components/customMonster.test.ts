// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import {
  buildAction,
  buildCreature,
  emptyActionDraft,
  emptyDraft,
  emptySpellGroupDraft,
  emptyTraitDraft,
  parseCr,
  proficiencyBonus,
  type MonsterDraft,
} from '../../src/components/customMonster.ts'

function draft(overrides: Partial<MonsterDraft> = {}): MonsterDraft {
  return { ...emptyDraft(), name: 'Test Beast', ...overrides }
}

describe('buildCreature', () => {
  it('marks user content with a fresh, unique custom: id', () => {
    const a = buildCreature(draft())
    const b = buildCreature(draft())
    expect(a.id.startsWith('custom:')).toBe(true) // the user-content marker
    expect(a.id).not.toBe(b.id) // user content is never matched/deduped
  })

  it('uses the free-text source label, falling back to custom when blank', () => {
    expect(buildCreature(draft({ sourceName: 'Tome of Beasts (home)' })).source).toBe('Tome of Beasts (home)')
    expect(buildCreature(draft({ sourceName: '' })).source).toBe('custom')
    // Either way it stays user content — never assumed CC-BY (no license shown).
    expect(buildCreature(draft({ sourceName: 'Tome of Beasts (home)' })).id.startsWith('custom:')).toBe(true)
  })

  it('includes alignment only when set', () => {
    expect(buildCreature(draft()).alignment).toBeUndefined()
    expect(buildCreature(draft({ alignment: 'chaotic evil' })).alignment).toBe('chaotic evil')
  })

  it('parses core stats and trims the name', () => {
    const c = buildCreature(draft({ name: '  Frost Worm  ', ac: '18', hp: '120', size: 'Huge', type: 'monstrosity' }))
    expect(c.name).toBe('Frost Worm')
    expect(c.ac).toBe(18)
    expect(c.maxHp).toBe(120)
    expect(c.size).toBe('Huge')
    expect(c.type).toBe('monstrosity')
  })

  it('floors max HP at 1 even when blank', () => {
    expect(buildCreature(draft({ hp: '' })).maxHp).toBe(1)
  })

  it('defaults abilities to 10 and derives save bonuses from CR proficiency', () => {
    const c = buildCreature(draft({
      cr: '10', // proficiency bonus +4
      abilities: { str: '20', dex: '', con: '16', int: '', wis: '', cha: '' },
      saves: { str: false, dex: true, con: true, int: false, wis: false, cha: false },
    }))
    expect(c.abilities).toEqual({ str: 20, dex: 10, con: 16, int: 10, wis: 10, cha: 10 })
    // dex: mod 0 + pb 4 = 4; con: mod +3 + pb 4 = 7. Non-proficient saves are absent.
    expect(c.saves).toEqual({ dex: 4, con: 7 })
  })

  it('proficiencyBonus follows the CR table', () => {
    expect(proficiencyBonus(undefined)).toBe(2)
    expect(proficiencyBonus(0)).toBe(2)
    expect(proficiencyBonus(0.5)).toBe(2)
    expect(proficiencyBonus(4)).toBe(2)
    expect(proficiencyBonus(5)).toBe(3)
    expect(proficiencyBonus(12)).toBe(4)
    expect(proficiencyBonus(17)).toBe(6)
    expect(proficiencyBonus(30)).toBe(9)
  })

  it('parses fractional and decimal CRs', () => {
    expect(parseCr('1/2')).toBe(0.5)
    expect(parseCr('0.25')).toBe(0.25)
    expect(parseCr('6')).toBe(6)
    expect(parseCr('')).toBeUndefined()
    expect(buildCreature(draft({ cr: '1/8' })).cr).toBe(0.125)
  })

  it('drops empty optional lists rather than emitting empty arrays', () => {
    const c = buildCreature(draft())
    expect(c.languages).toBeUndefined()
    expect(c.resistances).toBeUndefined()
    expect(c.traits).toBeUndefined()
    expect(c.actions).toBeUndefined()
    expect(c.spellcasting).toBeUndefined()
  })

  it('builds speed from filled fields only, with hover', () => {
    const c = buildCreature(draft({ speed: { walk: '40', fly: '80', swim: '', climb: '', burrow: '', hover: true } }))
    expect(c.speed).toEqual({ walk: 40, fly: 80, hover: true })
  })

  it('keeps only named actions and assembles an attack', () => {
    const named = { ...emptyActionDraft(), name: 'Bite', kind: 'melee' as const, toHit: '7', reach: '5', damage: [{ id: 'd', formula: '2d6+4', type: 'piercing' as const }] }
    const blank = emptyActionDraft() // no name → dropped
    const c = buildCreature(draft({ actions: [named, blank] }))
    expect(c.actions).toHaveLength(1)
    expect(c.actions?.[0]).toMatchObject({ name: 'Bite', kind: 'melee', toHit: 7, reach: 5, damage: [{ formula: '2d6+4', type: 'piercing' }] })
  })

  it('builds a save action with no to-hit', () => {
    const save = { ...emptyActionDraft('save'), name: 'Frost Breath', saveAbility: 'con' as const, saveDc: '16', saveOutcome: 'half' as const, damage: [{ id: 'd', formula: '10d6', type: 'cold' as const }] }
    const action = buildAction(save)
    expect(action.toHit).toBeNull()
    expect(action.save).toEqual({ ability: 'con', dc: 16, onSave: 'half' })
  })

  it('maps a dice recharge with a default threshold of 6 when blank', () => {
    const a = buildAction({ ...emptyActionDraft(), name: 'Breath', rechargeKind: 'dice', rechargeValue: '' })
    expect(a.recharge).toEqual({ type: 'dice', value: 6 })
    const b = buildAction({ ...emptyActionDraft(), name: 'Breath', rechargeKind: 'dice', rechargeValue: '5' })
    expect(b.recharge).toEqual({ type: 'dice', value: 5 })
  })

  it('assembles legendary actions with a per-round budget', () => {
    const la = { ...emptyActionDraft(), name: 'Tail Swipe' }
    const c = buildCreature(draft({ legendaryPerRound: '3', legendaryActions: [la] }))
    expect(c.legendaryActions).toMatchObject({ perRound: 3, actions: [{ name: 'Tail Swipe' }] })
  })

  it('builds spellcasting groups and ignores empty ones', () => {
    const filled = { ...emptySpellGroupDraft(), usage: 'perDay' as const, per: '3', spells: 'Fireball, Counterspell' }
    const empty = emptySpellGroupDraft() // no spells → ignored
    const c = buildCreature(draft({ spellAbility: 'int', spellSaveDc: '17', spellGroups: [filled, empty] }))
    expect(c.spellcasting?.ability).toBe('int')
    expect(c.spellcasting?.saveDc).toBe(17)
    expect(c.spellcasting?.groups).toHaveLength(1)
    expect(c.spellcasting?.groups[0]).toEqual({ usage: { type: 'perDay', per: 3 }, spells: [{ name: 'Fireball' }, { name: 'Counterspell' }] })
  })

  it('keeps named traits and drops nameless ones', () => {
    const c = buildCreature(draft({ traits: [{ ...emptyTraitDraft(), name: 'Amphibious', text: 'Breathes air and water.' }, emptyTraitDraft()] }))
    expect(c.traits).toHaveLength(1)
    expect(c.traits?.[0]).toEqual({ name: 'Amphibious', text: 'Breathes air and water.' })
  })
})
