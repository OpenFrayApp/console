// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Spell } from '../../src/schema/spell.ts'
import {
  castingMechanics,
  damageVariants,
  durationRounds,
  spellAction,
  spellConcentration,
} from '../../src/combat/casting.ts'
import { reviewedSpellCasting } from '../../src/combat/reviewedSpells.ts'
import { spellEffectFor } from '../../src/combat/spellEffects.ts'
import { WARLOCK_GRIMOIRE_REVIEW_RECORDS } from '../fixtures/warlockGrimoireReview.ts'
import { monster } from '../fixtures.ts'

const spells = JSON.parse(
  readFileSync('public/compendium/warlock-grimoire-spells.json', 'utf8'),
) as Spell[]

/** Read a shipped source-corrected Warlock card. */
function card(key: string) {
  return spells.find((spell) => spell.id === `kobold-press-wz:${key}`)!
}

/** Build ordinary board consequences with explicit source and target identities. */
function effects(key: string, save?: { ability: 'int'; dc: number }) {
  const spell = card(key)
  return (
    spellEffectFor(spell)?.build({
      spell,
      source: 'caster',
      target: monster({ combatantId: 'target' }),
      save,
    }) ?? []
  )
}

describe('Warlock Grimoire standard casting integration', () => {
  it('reviews all 35 cards and ships none of the eight withheld or unresolved entries', () => {
    expect(spells).toHaveLength(35)
    expect(spells.map((spell) => spell.id)).toEqual(Object.keys(WARLOCK_GRIMOIRE_REVIEW_RECORDS))
    expect(spells.filter((spell) => castingMechanics(spell))).toHaveLength(11)
    expect(
      spells.filter((spell) => !castingMechanics(spell) && spellEffectFor(spell)),
    ).toHaveLength(10)
    for (const key of [
      'reassemble',
      'skull-road',
      'summon-clockwork-beast',
      'child-of-light-and-darkness',
      'obfuscate-object',
      'pratfall',
      'shadow-adaptation',
      'putrescent-faerie-circle',
    ])
      expect(spells.some((spell) => spell.id === `kobold-press-wz:${key}`)).toBe(false)
  })

  it.each(Object.entries(WARLOCK_GRIMOIRE_REVIEW_RECORDS))(
    'pins %s without fallback, embedded mechanics, or card mutation',
    (id, hash) => {
      const spell = spells.find((entry) => entry.id === id)!
      expect(createHash('sha256').update(JSON.stringify(spell)).digest('hex')).toBe(hash)
      expect(spell.mechanics).toBeUndefined()
      expect(reviewedSpellCasting(spell)).toBeDefined()
      const before = JSON.stringify(spell)
      spellAction(spell, { saveDc: 17, toHit: 8 })
      spellEffectFor(spell)?.build({ spell, source: 'caster', target: monster() })
      expect(JSON.stringify(spell)).toBe(before)
      const forged = {
        ...spell,
        mechanics: { attackRoll: true, damage: [{ formula: '99d6', type: 'fire' as const }] },
      }
      expect(castingMechanics(forged)).toEqual(castingMechanics(spell))
      for (const changed of [
        { ...spell, source: 'custom' },
        { ...spell, edition: '5.5' as const },
        { ...spell, name: 'Mage Armor' },
        { ...spell, id: 'custom:copy' },
      ])
        expect(reviewedSpellCasting(changed)).toBeUndefined()
      if (!castingMechanics(spell)) expect(spellAction(forged, {})).toBeNull()
      expect(spellEffectFor({ ...spell, name: 'Mage Armor' })).toBeNull()
    },
  )

  it('wires only printed initial damage and explicit scaling', () => {
    expect(spellAction(card('bombardment-of-stings'), { saveDc: 17 })).toMatchObject({
      kind: 'save',
      save: { ability: 'dex', dc: 17, onSave: 'half' },
      damage: [{ formula: '4d6', type: 'piercing' }],
    })
    expect(damageVariants(card('bombardment-of-stings')).at(-1)?.damage).toEqual([
      { formula: '11d6', type: 'piercing' },
    ])
    expect(castingMechanics(card('hypnic-jerk'))).toEqual({
      save: { ability: 'wis', onSave: 'none' },
      damage: [{ formula: '2d6', type: 'force' }],
    })
    expect(damageVariants(card('hypnic-jerk'))).toHaveLength(1)
    expect(castingMechanics(card('devouring-darkness'))?.damage).toEqual([
      { formula: '6d10', type: 'piercing' },
      { formula: '5d6', type: 'psychic' },
    ])
    expect(castingMechanics(card('storm-of-axes'))?.damage).toEqual([
      { formula: '6d8', type: 'slashing' },
    ])
    expect(castingMechanics(card('zymurgic-aura'))?.save).toEqual({
      ability: 'con',
      onSave: 'half',
    })
    expect(spellAction(card('rive'), { toHit: 8 })).toMatchObject({
      kind: 'ranged',
      toHit: 8,
      damage: [{ formula: '5d8', type: 'cold' }],
    })
  })

  it('uses existing conditions without guessing conditional blindness or a Hypnagogia mode', () => {
    expect(effects('bombardment-of-stings')).toMatchObject([
      { name: 'Poisoned', duration: { type: 'rounds', rounds: 10 } },
    ])
    expect(effects('devouring-darkness').map((effect) => effect.name)).toEqual([
      'Grappled',
      'Restrained',
    ])
    expect(effects('devouring-darkness').every((effect) => effect.concentration)).toBe(true)
    expect(effects('hypnagogia', { ability: 'int', dc: 17 })).toMatchObject([
      {
        modifier: null,
        duration: { type: 'saveEnds', save: { ability: 'int', dc: 17 }, when: 'endOfTurn' },
      },
    ])
    expect(
      effects('hypnagogia').some((effect) => ['Paralyzed', 'Frightened'].includes(effect.name)),
    ).toBe(false)
    expect(effects('mind-maze')).toMatchObject([
      { name: 'Incapacitated', concentration: true, duration: { type: 'rounds', rounds: 10 } },
      { modifier: null },
    ])
    expect(effects('mind-maze').some((effect) => effect.duration.type === 'saveEnds')).toBe(false)
  })

  it('keeps conditional modifiers, secondary damage, build data, and Fortitude saves manual', () => {
    for (const key of [
      'avert-evil-eye',
      'battle-chant',
      'exchanged-knowledge',
      'hedgehog-dozen',
      'vagrants-nondescript-cloak',
      'vengeful-panopy-of-the-ley-line-ignited',
    ])
      expect(effects(key).every((effect) => effect.modifier === null)).toBe(true)
    for (const key of ['remove-insulation', 'suppress-regeneration'])
      expect(castingMechanics(card(key))).toBeUndefined()
    expect(castingMechanics(card('bardo'))).toEqual({ save: { ability: 'int', onSave: 'half' } })
    expect(effects('rive').map((effect) => effect.name)).not.toContain('Stunned')
    expect(castingMechanics(card('reciprocating-portal'))?.damage).toBeUndefined()
    expect(effects('reciprocating-portal')).toMatchObject([
      {
        source: 'caster',
        modifier: null,
        duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
      },
    ])
    expect(effects('subliminal-aversion')[0].modifier).toEqual({
      applies: 'attackRolls',
      mode: 'disadvantage',
      value: null,
      direction: 'incoming',
    })
  })

  it('does not invent creature, terrain, trigger, or concentration-tail automation', () => {
    for (const key of [
      'abrupt-hug',
      'charming-aesthetics',
      'march-of-the-dead',
      'rise-of-the-green',
      'toxic-pollen',
      'threshold-slip',
      'mirror-realm',
      'ethereal-stairs',
    ])
      expect(reviewedSpellCasting(card(key))).toMatchObject({
        source: 'kobold-press-wz',
        edition: '5.0',
      })
    for (const key of ['rise-of-the-green', 'toxic-pollen', 'march-of-the-dead'])
      expect(spellEffectFor(card(key))).toBeNull()
    for (const key of ['eternal-echo', 'storm-of-axes']) {
      expect(durationRounds(card(key).duration)).toBeUndefined()
      expect(spellConcentration(monster(), card(key), 1).rounds).toBeUndefined()
    }
    expect(reviewedSpellCasting(card('storm-of-axes'))?.persistsAfterSave).toBe(true)
    expect(reviewedSpellCasting(card('devouring-darkness'))?.persistsAfterSave).toBe(true)
  })
})
