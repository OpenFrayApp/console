// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import {
  averageHp,
  buildAction,
  buildCreature,
  buildHpFormula,
  creatureToDraft,
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

const CTX = {
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 },
  pb: 2,
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
    const c = buildCreature(draft({ name: '  Frost Worm  ', ac: '18', hpDieCount: '16', hpDie: '10', hpMod: '32', size: 'Huge', type: 'monstrosity' }))
    expect(c.name).toBe('Frost Worm')
    expect(c.ac).toBe(18)
    expect(c.maxHp).toBe(120) // 16 × 5.5 + 32
    expect(c.size).toBe('Huge')
    expect(c.type).toBe('monstrosity')
  })

  it('floors max HP at 1 when there are no hit dice', () => {
    expect(buildCreature(draft()).maxHp).toBe(1)
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

  it('keeps only named actions and derives the attack to-hit + damage mod', () => {
    // str 18 (mod +4) at CR 5 (pb +3) → to hit +7; the +4 also rides on damage.
    const named = { ...emptyActionDraft(), name: 'Bite', kind: 'melee' as const, reach: '5', damage: [{ id: 'd', formula: '2d6', type: 'piercing' as const }] }
    const blank = emptyActionDraft() // no name → dropped
    const c = buildCreature(draft({
      cr: '5',
      abilities: { str: '18', dex: '', con: '', int: '', wis: '', cha: '' },
      actions: [named, blank],
    }))
    expect(c.actions).toHaveLength(1)
    expect(c.actions?.[0]).toMatchObject({ name: 'Bite', kind: 'melee', toHit: 7, reach: 5, damage: [{ formula: '2d6+4', type: 'piercing' }] })
  })

  it('adds the ability mod to primary damage only; not rider damage', () => {
    // dex 12 (mod +1) ranged attack with a fire rider.
    const a = buildAction(
      {
        ...emptyActionDraft('ranged'),
        name: 'Scimitar',
        attackAbility: 'dex',
        damage: [
          { id: 'd1', formula: '2d6', type: 'slashing' },
          { id: 'd2', formula: '1d6', type: 'fire' },
        ],
      },
      { abilities: { str: 10, dex: 12, con: 10, int: 10, wis: 10, cha: 10 }, pb: 2 },
    )
    expect(a.damage).toEqual([
      { formula: '2d6+1', type: 'slashing' }, // +1 from DEX
      { formula: '1d6', type: 'fire' }, // rider: no mod
    ])
  })

  it('builds a save action with no to-hit and unmodified damage', () => {
    const save = { ...emptyActionDraft('save'), name: 'Frost Breath', saveAbility: 'con' as const, saveDc: '16', saveOutcome: 'half' as const, damage: [{ id: 'd', formula: '10d6', type: 'cold' as const }] }
    const action = buildAction(save, CTX)
    expect(action.toHit).toBeNull()
    expect(action.save).toEqual({ ability: 'con', dc: 16, onSave: 'half' })
    expect(action.damage).toEqual([{ formula: '10d6', type: 'cold' }]) // no ability mod on saves
  })

  it('maps a dice recharge with a default threshold of 6 when blank', () => {
    const a = buildAction({ ...emptyActionDraft(), name: 'Breath', rechargeKind: 'dice', rechargeValue: '' }, CTX)
    expect(a.recharge).toEqual({ type: 'dice', value: 6 })
    const b = buildAction({ ...emptyActionDraft(), name: 'Breath', rechargeKind: 'dice', rechargeValue: '5' }, CTX)
    expect(b.recharge).toEqual({ type: 'dice', value: 5 })
  })

  it('derives skill bonuses; expertise doubles the proficiency bonus', () => {
    const c = buildCreature(draft({
      cr: '5', // pb +3
      abilities: { str: '', dex: '18', con: '', int: '', wis: '14', cha: '' },
      skills: [
        { id: 's1', skill: 'stealth', expertise: false }, // dex +4 + pb 3 = 7
        { id: 's2', skill: 'perception', expertise: true }, // wis +2 + 2×pb 6 = 8
      ],
    }))
    expect(c.skills).toEqual({ stealth: 7, perception: 8 })
  })

  it('assembles legendary actions with a per-round budget', () => {
    const la = { ...emptyActionDraft(), name: 'Tail Swipe' }
    const c = buildCreature(draft({ legendaryPerRound: '3', legendaryActions: [la] }))
    expect(c.legendaryActions).toMatchObject({ perRound: 3, actions: [{ name: 'Tail Swipe' }] })
  })

  it('builds spellcasting groups, ignores empty ones, and auto-calculates DC + attack', () => {
    const filled = {
      ...emptySpellGroupDraft(),
      usage: 'perDay' as const,
      per: '3',
      spells: [
        { name: 'Fireball', ref: 'srd-5.2:fireball' },
        { name: 'Counterspell', ref: 'srd-5.2:counterspell' },
      ],
    }
    const empty = emptySpellGroupDraft() // no spells → ignored
    const c = buildCreature(draft({
      cr: '9', // pb +4
      abilities: { str: '', dex: '', con: '', int: '18', wis: '', cha: '' }, // int mod +4
      spellAbility: 'int',
      spellGroups: [filled, empty],
    }))
    expect(c.spellcasting?.ability).toBe('int')
    expect(c.spellcasting?.saveDc).toBe(16) // 8 + 4 + 4
    expect(c.spellcasting?.toHit).toBe(8) // 4 + 4
    expect(c.spellcasting?.groups).toHaveLength(1)
    expect(c.spellcasting?.groups[0]).toEqual({
      usage: { type: 'perDay', per: 3 },
      spells: [
        { name: 'Fireball', ref: 'srd-5.2:fireball' },
        { name: 'Counterspell', ref: 'srd-5.2:counterspell' },
      ],
    })
  })

  it('keeps named traits and drops nameless ones', () => {
    const c = buildCreature(draft({ traits: [{ ...emptyTraitDraft(), name: 'Amphibious', text: 'Breathes air and water.' }, emptyTraitDraft()] }))
    expect(c.traits).toHaveLength(1)
    expect(c.traits?.[0]).toEqual({ name: 'Amphibious', text: 'Breathes air and water.' })
  })
})

describe('creatureToDraft (edit round-trip)', () => {
  it('round-trips core stats, derived saves/skills, and an attack', () => {
    const original = buildCreature(draft({
      cr: '5', // pb +3
      ac: '15',
      hpDieCount: '8', hpDie: '10', hpMod: '8',
      abilities: { str: '18', dex: '14', con: '16', int: '8', wis: '12', cha: '10' },
      saves: { str: true, dex: false, con: true, int: false, wis: false, cha: false },
      skills: [{ id: 's', skill: 'athletics', expertise: false }],
      actions: [{ ...emptyActionDraft(), name: 'Slam', kind: 'melee', damage: [{ id: 'd', formula: '2d8', type: 'bludgeoning' }] }],
    }))
    // Reverse to a draft, then rebuild — the result should match the original.
    const back = buildCreature(creatureToDraft(original))
    expect(back.ac).toBe(15)
    expect(back.maxHp).toBe(original.maxHp)
    expect(back.hpFormula).toBe('8d10+8')
    expect(back.abilities).toEqual(original.abilities)
    expect(back.saves).toEqual(original.saves) // str/con proficient
    expect(back.skills).toEqual(original.skills)
    expect(back.actions?.[0]).toMatchObject({
      name: 'Slam',
      toHit: original.actions?.[0].toHit, // str +4 + pb +3 = +7
      damage: original.actions?.[0].damage, // 2d8+4 (mod stripped then re-derived)
    })
  })

  it('reverses expertise skills back to expertise', () => {
    const original = buildCreature(draft({
      cr: '5',
      abilities: { str: '', dex: '18', con: '', int: '', wis: '', cha: '' },
      skills: [{ id: 's', skill: 'stealth', expertise: true }],
    }))
    expect(creatureToDraft(original).skills[0]).toMatchObject({ skill: 'stealth', expertise: true })
  })
})

describe('structured HP', () => {
  it('averageHp = count × (die + 1) / 2 + mod, floored; 0 when incomplete', () => {
    expect(averageHp(14, 12, 56)).toBe(147)
    expect(averageHp(8, 10, 0)).toBe(44)
    expect(averageHp(1, 6, -1)).toBe(2) // floor(3.5 − 1)
    expect(averageHp(0, 12, 5)).toBe(0)
    expect(averageHp(5, 0, 5)).toBe(0)
  })

  it('buildHpFormula renders the sign and blanks when incomplete', () => {
    expect(buildHpFormula(14, 12, 56)).toBe('14d12+56')
    expect(buildHpFormula(2, 6, -1)).toBe('2d6-1')
    expect(buildHpFormula(3, 8, 0)).toBe('3d8')
    expect(buildHpFormula(0, 8, 3)).toBe('')
  })

  it('derives maxHp + hpFormula from the hit dice', () => {
    const c = buildCreature(draft({ hpDieCount: '14', hpDie: '12', hpMod: '56' }))
    expect(c.maxHp).toBe(147)
    expect(c.hpFormula).toBe('14d12+56')
  })

  it('omits hpFormula when there are no dice', () => {
    expect(buildCreature(draft()).hpFormula).toBeUndefined()
  })
})
