// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Spell } from '../../src/schema/spell.ts'
import { castingMechanics, damageVariants, spellAction } from '../../src/combat/casting.ts'
import { reviewedSpellCasting } from '../../src/combat/reviewedSpells.ts'
import { spellEffectFor } from '../../src/combat/spellEffects.ts'
import { DEEP_MAGIC_2020_REVIEW_RECORDS } from '../fixtures/deepMagic2020Review.ts'
import { DEEP_MAGIC_2020_VERDICTS } from '../fixtures/deepMagic2020Verdicts.ts'
import { REFERENCE_ONLY_SPELLS } from './referenceSpellCoverage.data.ts'
import { monster } from '../fixtures.ts'

const spells = JSON.parse(
  readFileSync('public/compendium/deep-magic-2020-spells.json', 'utf8'),
) as Spell[]

/** Read an approved Deep Magic card without invented mechanics. */
function card(slug: string): Spell {
  return spells.find((spell) => spell.id === `kobold-press-deepm:${slug}`)!
}

/** Build reviewed effects with separate caster and affected identities. */
function effects(slug: string) {
  const spell = card(slug)
  return (
    spellEffectFor(spell)?.build({
      spell,
      source: 'caster',
      target: monster({ combatantId: 'target' }),
    }) ?? []
  )
}

describe('Deep Magic 2020 completed casting review', () => {
  it('reviews all 503 cards and leaves none pending', () => {
    const reviewed = spells.filter((spell) => reviewedSpellCasting(spell))
    expect(reviewed.map((spell) => spell.id)).toEqual(Object.keys(DEEP_MAGIC_2020_REVIEW_RECORDS))
    expect(reviewed).toHaveLength(503)
    expect(reviewed.filter((spell) => castingMechanics(spell))).toHaveLength(169)
    expect(
      reviewed.filter((spell) => !castingMechanics(spell) && spellEffectFor(spell)),
    ).toHaveLength(137)
    for (const spell of reviewed.filter((spell) => !castingMechanics(spell))) {
      expect(REFERENCE_ONLY_SPELLS[spell.id]).toBeUndefined()
      expect(
        spellAction(
          {
            ...spell,
            mechanics: { attackRoll: true, damage: [{ formula: '99d6', type: 'fire' }] },
          },
          {},
        ),
      ).toBeNull()
    }
    expect(Object.keys(REFERENCE_ONLY_SPELLS)).toEqual([])
  })

  it.each(Object.entries(DEEP_MAGIC_2020_REVIEW_RECORDS))(
    'pins %s without fallback or mutation',
    (id, hash) => {
      const spell = spells.find((entry) => entry.id === id)!
      expect(createHash('sha256').update(JSON.stringify(spell)).digest('hex')).toBe(hash)
      expect(REFERENCE_ONLY_SPELLS[id]).toBeUndefined()
      expect(reviewedSpellCasting(spell)).toBeDefined()
      const original = JSON.stringify(spell)
      spellAction(spell, { saveDc: 17, toHit: 8 })
      spellEffectFor(spell)?.build({ spell, source: 'caster', target: monster() })
      expect(JSON.stringify(spell)).toBe(original)
      for (const altered of [
        { ...spell, source: 'custom' as const },
        { ...spell, edition: '5.5' as const },
        { ...spell, name: 'Changed name' },
        { ...spell, id: 'custom:copy' },
      ])
        expect(reviewedSpellCasting(altered)).toBeUndefined()
    },
  )

  it.each(Object.entries(DEEP_MAGIC_2020_VERDICTS))(
    'preserves %s authored roll boundary',
    (id, verdict) => {
      const spell = spells.find((entry) => entry.id === id)!
      const profile = reviewedSpellCasting(spell)!
      const forged = {
        ...spell,
        mechanics: { attackRoll: true, damage: [{ formula: '99d6', type: 'fire' as const }] },
      }
      expect(castingMechanics(forged)).toEqual(castingMechanics(spell))
      expect(profile.attackKind).toBe(verdict.attackKind)
      if (verdict.mechanics) {
        expect(profile.mechanics).toMatchObject(verdict.mechanics)
        if (!verdict.mechanics.damage) expect(profile.mechanics?.damage).toBeUndefined()
        if (verdict.kind === 'a') expect(profile.mechanics?.save).toBeUndefined()
        else expect(profile.mechanics?.attackRoll).toBeUndefined()
      } else {
        expect(spellAction(forged, {})).toBeNull()
        expect(profile.mechanics).toBeUndefined()
      }
      if (verdict.kind === 'm') expect(profile.effect).toBeUndefined()
      if (verdict.kind === 'r') expect(profile.effect).toBeDefined()
    },
  )

  it('keeps printed exceptional scaling and chosen components manual', () => {
    expect(
      damageVariants(card('flame-wave')).find((variant) => variant.key === 'slot-5')?.damage,
    ).toEqual([{ formula: '8d8', type: 'fire' }])
    expect(damageVariants(card('bloodshot')).at(-1)?.damage).toEqual([
      { formula: '9d10', type: 'fire' },
      { formula: '2d8', type: 'psychic' },
    ])
    expect(damageVariants(card('last-rays-of-the-dying-sun')).at(-1)?.damage).toEqual([
      { formula: '8d6', type: 'fire' },
      { formula: '8d6', type: 'cold' },
    ])
    expect(damageVariants(card('death-gods-touch')).at(-1)?.damage).toEqual([
      { formula: '14d10', type: 'necrotic' },
    ])
    for (const slug of [
      'fusillade-of-ice',
      'clash-of-glaciers',
      'blood-scarab',
      'heartache',
      'screaming-ray',
      'caustic-blood',
    ]) {
      expect(castingMechanics(card(slug))?.scaling).toBeUndefined()
    }
  })

  it('keeps independent turn-boundary conditions off concentration and secondary saves', () => {
    expect(effects('puff-of-smoke')).toMatchObject([
      {
        name: 'Blinded',
        source: 'caster',
        concentration: false,
        duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
      },
    ])
    expect(effects('memento-mori')).toMatchObject([
      {
        name: 'Stunned',
        source: 'target',
        concentration: false,
        duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
      },
    ])
    expect(effects('shadow-hands')).toMatchObject([
      { name: 'Frightened', source: 'target', concentration: false },
    ])
    expect(effects('void-strike')).toMatchObject([
      { name: 'Frightened', source: 'caster', concentration: false },
    ])
    for (const slug of [
      'screaming-ray',
      'blood-to-acid',
      'boiling-blood',
      'mephitic-croak',
      'touch-of-the-unliving',
    ]) {
      expect(spellEffectFor(card(slug))).toBeNull()
    }
  })

  it.each([
    'black-well',
    'freezing-fog',
    'glacial-fog',
    'void-rift',
    'wind-of-the-hereafter',
    'umbral-storm',
    'writhing-arms',
    'maw-of-needles',
    'staff-of-violet-fire',
    'legion',
  ])('does not invent initial rolls for %s', (slug) => {
    expect(spellAction(card(slug), {})).toBeNull()
    expect(effects(slug).every((effect) => effect.modifier === null)).toBe(true)
  })

  it.each([
    'night-terrors',
    'time-slippage',
    'time-loop',
    'exsanguinate',
    'keening-wail',
    'energy-absorption',
    'frenzied-bolt',
    'prismatic-ray',
    'triumph-of-ice',
    'vomit-tentacles',
    'thunderous-charge',
    'heart-seeking-arrow',
  ])('keeps incompatible %s outcomes manual', (slug) => {
    expect(spellAction(card(slug), {})).toBeNull()
    expect(reviewedSpellCasting(card(slug))).toBeDefined()
  })

  it('uses printed initial saves and damage only', () => {
    expect(spellAction(card('abhorrent-apparition'), { saveDc: 17 })).toMatchObject({
      save: { ability: 'wis', dc: 17, onSave: 'half' },
      damage: [{ formula: '6d8', type: 'psychic' }],
    })
    expect(damageVariants(card('abhorrent-apparition')).at(-1)?.damage).toEqual([
      { formula: '11d8', type: 'psychic' },
    ])
    for (const [slug, ability] of [
      ['alone', 'wis'],
      ['alter-arrows-fortune', 'cha'],
      ['amplify-gravity', 'str'],
    ]) {
      expect(spellAction(card(slug!), { saveDc: 17 })).toMatchObject({
        save: { ability, dc: 17, onSave: 'negates' },
      })
      expect(spellAction(card(slug!), {})?.damage).toBeUndefined()
    }
  })

  it('keeps Ale-dritch secondary save and conditional disadvantage manual', () => {
    expect(spellAction(card('ale-dritch-blast'), { toHit: 8 })).toMatchObject({
      kind: 'ranged',
      toHit: 8,
      damage: [{ formula: '1d8', type: 'cold' }],
    })
    expect(castingMechanics(card('ale-dritch-blast'))?.save).toBeUndefined()
    expect(spellEffectFor(card('ale-dritch-blast'))).toBeNull()
    expect(damageVariants(card('ale-dritch-blast')).at(-1)?.damage).toEqual([
      { formula: '4d8', type: 'cold' },
    ])
  })

  it('does not inherit Instantaneous as the fright expiry', () => {
    expect(effects('abhorrent-apparition')).toMatchObject([
      { name: 'Frightened', source: 'caster', duration: { type: 'rounds', rounds: 10 } },
    ])
    expect(effects('abhorrent-apparition')[0]?.durationNote).not.toBe('instantaneous')
    expect(effects('abhorrent-apparition')[0]?.concentration).not.toBe(true)
  })

  it('preserves area concentration and independent Prone', () => {
    expect(reviewedSpellCasting(card('amplify-gravity'))?.persistsAfterSave).toBe(true)
    expect(effects('amplify-gravity')).toMatchObject([
      { name: 'Prone', concentration: false, duration: { type: 'manual' } },
    ])
    expect(effects('alone')).toMatchObject([
      { source: 'caster', concentration: true, modifier: null },
    ])
    expect(effects('ally-aegis')).toMatchObject([
      {
        source: 'caster',
        duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        modifier: null,
      },
    ])
  })

  it.each(['agonizing-mark', 'alchemical-form', 'angelic-guardian'])(
    'tracks %s creature consequences without initial rolls',
    (slug) => {
      expect(spellAction(card(slug), {})).toBeNull()
      expect(effects(slug)[0]?.modifier).toBeNull()
      expect(effects(slug)[0]?.concentration).toBe(card(slug).concentration ? true : undefined)
    },
  )

  it.each(['acid-gate', 'acid-rain', 'anchoring-rope'])(
    'casts %s without a caster badge or initial roll',
    (slug) => {
      expect(spellAction(card(slug), {})).toBeNull()
      expect(spellEffectFor(card(slug))).toBeNull()
    },
  )
})
