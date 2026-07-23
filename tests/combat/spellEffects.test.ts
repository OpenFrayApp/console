// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Combatant, MonsterCombatant, PlayerCharacter } from '../../src/schema/combatant.ts'
import type { Spell } from '../../src/schema/spell.ts'
import { spellEffectFor, timedDuration } from '../../src/combat/spellEffects.ts'

const monster = (dex: number): MonsterCombatant =>
  ({
    isPC: false,
    combatantId: 'm1',
    creature: { abilities: { str: 10, dex, con: 10, int: 10, wis: 10, cha: 10 } },
  }) as MonsterCombatant

const pc = (dex?: number): PlayerCharacter =>
  ({
    isPC: true,
    combatantId: 'p1',
    abilities: dex == null ? undefined : { str: 10, dex, con: 10, int: 10, wis: 10, cha: 10 },
  }) as PlayerCharacter

const spell = (name: string, over: Partial<Spell> = {}): Spell => ({
  id: `srd-5.2:${name.toLowerCase()}`,
  source: 'srd-5.2',
  name,
  level: 1,
  school: 'Abjuration',
  castingTime: 'action',
  range: 'touch',
  components: { verbal: true, somatic: true, material: false },
  duration: 'up to 1 minute',
  concentration: true,
  ritual: false,
  text: '',
  ...over,
})

describe('spellEffectFor', () => {
  it('maps Bless to a +1d4 flat bonus from the spell duration', () => {
    const def = spellEffectFor(spell('Bless'))
    expect(def).toBeTruthy()
    expect(def!.targeting).toBe('ally')
    expect(def!.multi).toBe(true)
    const [effect] = def!.build({ source: 'caster', spell: spell('Bless') })
    expect(effect.name).toBe('Bless')
    expect(effect.modifier).toMatchObject({ mode: 'flatBonus', value: '1d4' })
    expect(effect.duration).toEqual({ type: 'rounds', rounds: 10 }) // 1 minute
    expect(effect.source).toBe('caster')
  })

  it('maps Invisibility to the Invisible condition', () => {
    const [effect] = spellEffectFor(spell('Invisibility', { duration: 'up to 1 hour' }))!.build({
      spell: spell('Invisibility', { duration: 'up to 1 hour' }),
    })
    expect(effect.icon).toBe('condition')
    expect(effect.name).toBe('Invisible')
    expect(effect.duration).toEqual({ type: 'manual' }) // hours don't convert to rounds
  })

  it('gives Guidance a consume-on-roll ability-check bonus', () => {
    const [effect] = spellEffectFor(spell('Guidance'))!.build({ spell: spell('Guidance') })
    expect(effect.modifier).toMatchObject({ applies: 'abilityChecks', mode: 'flatBonus' })
    expect(effect.duration).toEqual({ type: 'consumeOnRoll' })
  })

  it('builds a fresh effect (unique id) on each call', () => {
    const s = spell('Bless')
    const a = spellEffectFor(s)!.build({ spell: s })[0]
    const b = spellEffectFor(s)!.build({ spell: s })[0]
    expect(a.id).not.toBe(b.id)
  })

  it('normalizes the name (case + curly apostrophe) and returns null for unmapped spells', () => {
    expect(spellEffectFor(spell('BLESS'))).toBeTruthy()
    expect(spellEffectFor(spell('Fireball'))).toBeNull()
  })

  it('maps Bane to a −1d4 penalty and Faerie Fire to advantage-against', () => {
    const [bane] = spellEffectFor(spell('Bane'))!.build({ spell: spell('Bane') })
    expect(bane.modifier).toMatchObject({ mode: 'flatBonus', value: '-1d4' })

    const ff = spellEffectFor(spell('Faerie Fire'))!
    expect(ff.targeting).toBe('enemy')
    const [effect] = ff.build({ spell: spell('Faerie Fire') })
    expect(effect.modifier).toMatchObject({ mode: 'advantage', direction: 'incoming' })
  })

  it('maps Vicious Mockery to disadvantage on the target’s next attack', () => {
    const vm = spellEffectFor(spell('Vicious Mockery', { level: 0 }))!
    expect(vm.targeting).toBe('enemy')
    const [effect] = vm.build({ source: 'bard', spell: spell('Vicious Mockery', { level: 0 }) })
    expect(effect.modifier).toMatchObject({
      applies: 'attackRolls',
      mode: 'disadvantage',
      direction: 'outgoing',
    })
    expect(effect.duration).toEqual({ type: 'consumeOnRoll' })
    expect(effect.source).toBe('bard')
  })

  it('maps damage-rider spells to reminders', () => {
    for (const name of ['Hex', 'Hunter’s Mark', 'Divine Favor']) {
      const [effect] = spellEffectFor(spell(name))!.build({ spell: spell(name) })
      expect(effect.modifier).toBeNull() // reminder-only
      expect(effect.note).toBeTruthy()
    }
  })

  it('works out Mage Armor’s AC from the target’s Dex, falling back when unknown', () => {
    const mageArmor = spell('Mage Armor', { duration: '8 hours', concentration: false })
    const build = (target?: Combatant) =>
      spellEffectFor(mageArmor)!.build({ spell: mageArmor, target })[0]

    expect(build(monster(16)).note).toBe('AC 16 unarmored')
    expect(build(pc(12)).note).toBe('AC 14 unarmored')
    // Anonymous PCs and quick adds carry no ability scores.
    expect(build(pc()).note).toBe('AC 13 + Dex')
    expect(build().note).toBe('AC 13 + Dex')
  })

  it('offers Fly and Mind Blank as ally reminders', () => {
    const fly = spell('Fly', { level: 3, duration: 'up to 10 minutes' })
    const def = spellEffectFor(fly)!
    expect(def.targeting).toBe('ally')
    expect(def.multi).toBe(true) // a higher slot targets extra creatures
    const [flying] = def.build({ spell: fly })
    expect(flying.name).toBe('Fly')
    expect(flying.duration).toEqual({ type: 'rounds', rounds: 100 })

    const mb = spell('Mind Blank', { level: 8, duration: '24 hours', concentration: false })
    const [blank] = spellEffectFor(mb)!.build({ spell: mb })
    expect(blank.name).toBe('Mind Blank')
    expect(blank.duration).toEqual({ type: 'manual' })
  })

  it('timedDuration converts minutes but falls back to manual for hours', () => {
    expect(timedDuration(spell('x', { duration: 'up to 10 minutes' }))).toEqual({
      type: 'rounds',
      rounds: 100,
    })
    expect(timedDuration(spell('x', { duration: '8 hours' }))).toEqual({ type: 'manual' })
  })
})
