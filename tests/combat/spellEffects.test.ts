// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import type { Spell } from '../../src/schema/spell.ts'
import { spellEffectFor, timedDuration } from '../../src/combat/spellEffects.ts'

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

  it('timedDuration converts minutes but falls back to manual for hours', () => {
    expect(timedDuration(spell('x', { duration: 'up to 10 minutes' }))).toEqual({ type: 'rounds', rounds: 100 })
    expect(timedDuration(spell('x', { duration: '8 hours' }))).toEqual({ type: 'manual' })
  })
})
