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
  return spellEffectFor(spell)!.build({
    spell,
    source: 'caster',
    target: monster({ combatantId: 'target' }),
  })
}

describe('Deep Magic 2020 first reviewed batch', () => {
  it('reviews exactly the first 20 cards and leaves 483 guarded', () => {
    const reviewed = spells.filter((spell) => reviewedSpellCasting(spell))
    expect(reviewed.map((spell) => spell.id)).toEqual(Object.keys(DEEP_MAGIC_2020_REVIEW_RECORDS))
    expect(reviewed).toHaveLength(20)
    expect(reviewed.filter((spell) => castingMechanics(spell))).toHaveLength(5)
    expect(
      reviewed.filter((spell) => !castingMechanics(spell) && spellEffectFor(spell)),
    ).toHaveLength(9)
    for (const spell of spells.slice(20)) {
      expect(REFERENCE_ONLY_SPELLS[spell.id]).toBe('SOURCE_REVIEW')
      expect(
        spellAction(
          {
            ...spell,
            mechanics: { attackRoll: true, damage: [{ formula: '99d6', type: 'fire' }] },
          },
          {},
        ),
      ).toBeNull()
      expect(spellEffectFor(spell)).toBeNull()
    }
  })

  it.each(Object.entries(DEEP_MAGIC_2020_REVIEW_RECORDS))(
    'pins %s without fallback or mutation',
    (id, hash) => {
      const spell = spells.find((entry) => entry.id === id)!
      expect(createHash('sha256').update(JSON.stringify(spell)).digest('hex')).toBe(hash)
      expect(REFERENCE_ONLY_SPELLS[id]).toBeUndefined()
      expect(reviewedSpellCasting(spell)?.manual).toBeTruthy()
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

  it.each([
    'acid-gate',
    'acid-rain',
    'agonizing-mark',
    'alchemical-form',
    'anchoring-rope',
    'angelic-guardian',
  ])('creates %s reminder without initial rolls', (slug) => {
    expect(spellAction(card(slug), {})).toBeNull()
    expect(effects(slug)[0]?.modifier).toBeNull()
    expect(effects(slug)[0]?.concentration).toBe(card(slug).concentration ? true : undefined)
  })
})
