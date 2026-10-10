// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Spell } from '../../src/schema/spell.ts'
import {
  castingMechanics,
  damageVariants,
  landsOnCast,
  spellAction,
} from '../../src/combat/casting.ts'
import { isSupportSpell, spellEffectFor } from '../../src/combat/spellEffects.ts'
import { REVIEWED_SPELL_CASTING, reviewedSpellCasting } from '../../src/combat/reviewedSpells.ts'
import { monster } from '../fixtures.ts'
import { TOME_OF_HEROES_REVIEW_RECORDS as REVIEWED_RECORDS } from '../fixtures/tomeOfHeroesReview.ts'

const spells = JSON.parse(
  readFileSync(
    new URL('../../public/compendium/tome-of-heroes-spells.json', import.meta.url),
    'utf8',
  ),
) as Spell[]

/** Read the actual approved source card for a tested profile. */
function card(slug: string): Spell {
  return spells.find((spell) => spell.id === `kobold-press-toh:${slug}`)!
}

/** Build the reviewed effect for an actual target and caster. */
function effects(slug: string) {
  const spell = card(slug)
  return spellEffectFor(spell)!.build({
    spell,
    source: 'caster',
    target: monster({ combatantId: 'target' }),
    save: { ability: 'wis', dc: 17 },
  })
}

describe('reviewed source casting', () => {
  it('has reviewed source evidence for every registered profile', () => {
    expect(
      Object.entries(REVIEWED_SPELL_CASTING)
        .filter(([, profile]) => profile.source === 'kobold-press-toh')
        .map(([id]) => id)
        .sort(),
    ).toEqual(Object.keys(REVIEWED_RECORDS).sort())
  })

  it.each(Object.entries(REVIEWED_RECORDS))(
    'pins the reviewed source and leaves %s unchanged',
    (id, digest) => {
      const spell = spells.find((s) => s.id === id)!
      expect(createHash('sha256').update(JSON.stringify(spell)).digest('hex')).toBe(digest)
      const before = JSON.stringify(spell)
      expect(reviewedSpellCasting(spell)?.manual).toBeTruthy()
      castingMechanics(spell)
      damageVariants(spell)
      spellAction(spell, { saveDc: 17, toHit: 8 })
      spellEffectFor(spell)?.build({ spell, source: 'caster' })
      expect(JSON.stringify(spell)).toBe(before)
      expect(spell.mechanics).toBeUndefined()
    },
  )

  it.each([
    ['butterfly-effect', 'cha', 'negates', undefined, undefined],
    ['calm-beasts', 'cha', 'negates', undefined, undefined],
    ['conjure-spectral-allies', 'wis', 'half', '6d10', 'necrotic'],
    ['divine-retribution', 'con', 'negates', undefined, undefined],
    ['emerald-eyes', 'wis', 'negates', undefined, undefined],
    ['eruption', 'str', 'half', '8d6', 'bludgeoning'],
    ['glare', 'wis', 'negates', undefined, undefined],
    ['immolating-gibbet', 'dex', 'negates', undefined, undefined],
    ['inexorable-summons', 'wis', 'negates', undefined, undefined],
    ['jarring-growl', 'wis', 'negates', undefined, undefined],
    ['lightless-torch', 'dex', 'negates', undefined, undefined],
    ['long-game', 'cha', 'negates', undefined, undefined],
    ['magma-spray', 'dex', 'half', '3d8', 'fire'],
    ['mass-faerie-fire', 'dex', 'negates', undefined, undefined],
    ['oathbound-implement', 'wis', 'negates', undefined, undefined],
    ['outmaneuver', 'wis', 'negates', undefined, undefined],
    ['power-word-fling', 'str', 'negates', undefined, undefined],
    ['reapers-knell', 'wis', 'negates', undefined, undefined],
    ['shared-frenzy', 'cha', 'negates', undefined, undefined],
    ['silvershout', 'con', 'negates', undefined, undefined],
    ['sneer', 'cha', 'negates', undefined, undefined],
    ['steam-gout', 'dex', 'half', '2d8', 'fire'],
    ['sudden-stampede', 'dex', 'half', '6d10', 'bludgeoning'],
    ['war-horn', 'wis', 'negates', undefined, undefined],
    ['clear-the-board', 'wis', 'negates', undefined, undefined],
    ['forced-reposition', 'con', 'negates', undefined, undefined],
    ['power-word-rend', 'con', 'half', '4d6+20', 'force'],
    ['sudden-slue', 'dex', 'half', '6d6', 'bludgeoning'],
    ['damaging-intel', 'cha', 'negates', undefined, undefined],
    ['burst-stone', 'dex', 'half', '4d8', 'bludgeoning'],
    ['furious-wail', 'cha', 'half', '10d10+30', 'psychic'],
    ['shocking-volley', 'dex', 'half', '2d8', 'lightning'],
    ['pincer', 'con', 'half', '5d10', 'thunder'],
    ['babble', 'int', 'negates', undefined, undefined],
    ['blunted-edge', 'wis', 'negates', undefined, undefined],
    ['bound-haze', 'dex', 'negates', undefined, undefined],
    ['toothless-beast', 'wis', 'negates', undefined, undefined],
  ])(
    'resolves %s with the printed initial save and damage',
    (slug, ability, onSave, formula, type) => {
      const action = spellAction(card(slug!), { saveDc: 17, toHit: 8 })!
      expect(action.save).toEqual({ ability, dc: 17, onSave })
      expect(action.damage).toEqual(formula ? [{ formula, type }] : undefined)
      expect(action.toHit).toBeNull()
      expect(isSupportSpell(card(slug!))).toBe(false)
    },
  )

  it('keeps Damaging Intel advantage scoped to a qualifying ally attack, not all attackers', () => {
    expect(effects('damaging-intel')).toMatchObject([
      {
        modifier: null,
        source: 'caster',
        duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
      },
    ])
  })

  it('applies Stone Aegis AC without turning temporary hit points into healing', () => {
    const built = effects('stone-aegis')
    expect(built).toMatchObject([
      {
        modifier: { mode: 'flatBonus', value: 2, applies: 'ac' },
        source: 'caster',
        duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
      },
      {
        modifier: null,
        source: 'caster',
        duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
      },
    ])
    expect(built[0].bundle?.id).toBe(built[1].bundle?.id)
    expect(landsOnCast(card('stone-aegis'))).toBe(false)
    expect(isSupportSpell(card('stone-aegis'))).toBe(true)
    expect(spellAction(card('stone-aegis'), {})).toBeNull()
  })

  it('triages all 90 source spells without classifying manual rules as initial saves', () => {
    const profiles = spells.map((spell) => reviewedSpellCasting(spell)!)
    expect(profiles).toHaveLength(90)
    expect(profiles.filter((profile) => profile.mechanics)).toHaveLength(39)
    expect(profiles.filter((profile) => !profile.mechanics && profile.effect)).toHaveLength(23)
    expect(profiles.filter((profile) => !profile.mechanics && !profile.effect)).toHaveLength(28)
  })

  it.each([
    'immolating-gibbet',
    'power-word-fling',
    'long-game',
    'reapers-knell',
    'sneer',
    'divine-retribution',
  ])('never folds conditional/later damage into the initial save for %s', (slug) => {
    expect(castingMechanics(card(slug))?.damage).toBeUndefined()
    expect(damageVariants(card(slug))).toEqual([])
  })

  it('keeps Smelting Blast’s coating save and ongoing damage separate from the attack', () => {
    expect(spellAction(card('smelting-blast'), { toHit: 8 })).toMatchObject({
      toHit: 8,
      damage: [{ formula: '2d8', type: 'fire' }],
    })
    expect(castingMechanics(card('smelting-blast'))?.save).toBeUndefined()
    expect(spellEffectFor(card('smelting-blast'))).toBeNull()
  })

  it.each([
    'gale',
    'mud',
    'spiked-barricade',
    'jagged-forcelance',
    'portal-trap',
    'stone-fetch',
    'pipers-lure',
  ])('does not resolve later-triggered %s hazards at initial casting', (slug) => {
    expect(spellAction(card(slug), {})).toBeNull()
    expect(damageVariants(card(slug))).toEqual([])
  })

  it.each(['eruption', 'steam-gout'])(
    'keeps %s’s initial Prone after concentration ends',
    (slug) => {
      expect(effects(slug)[0].concentration).toBe(false)
      expect(effects(slug)[0].duration.type).toBe('manual')
      expect(reviewedSpellCasting(card(slug))?.sustainedArea).toBe(true)
    },
  )

  it('keeps Outmaneuver Speed 0 distinct from Restrained', () => {
    expect(effects('outmaneuver')).toMatchObject([
      {
        modifier: { applies: 'speed', value: 'zero' },
        source: 'target',
        duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
      },
    ])
    expect(effects('outmaneuver').some((effect) => effect.name === 'Restrained')).toBe(false)
  })

  it('does not substitute Incapacitated for Glare’s no-actions rule', () => {
    expect(effects('glare')).toMatchObject([{ modifier: null, duration: { type: 'manual' } }])
    expect(effects('glare').some((effect) => effect.name === 'Incapacitated')).toBe(false)
  })

  it('narrows Bloodlust to Strength checks, never all rolls or saves', () => {
    expect(effects('bloodlust')[0].modifier).toMatchObject({
      mode: 'advantage',
      applies: 'abilityChecks',
      abilities: ['str'],
    })
  })

  it('narrows Dreamwine to Charisma checks and saves', () => {
    expect(
      effects('dreamwine')
        .filter((effect) => effect.modifier)
        .map((effect) => effect.modifier),
    ).toMatchObject([
      { mode: 'advantage', applies: 'abilityChecks', abilities: ['cha'] },
      { mode: 'advantage', applies: 'savingThrows', abilities: ['cha'] },
    ])
  })

  it.each([
    'bloodlust',
    'dreamwine',
    'wild-hunt',
    'butterfly-effect',
    'conjure-spectral-allies',
    'war-horn',
  ])('builds fresh bundled effects per target for %s', (slug) => {
    const a = effects(slug)
    const b = effects(slug)
    expect(a[0].bundle?.id).toBeTruthy()
    expect(a[0].bundle?.id).not.toBe(b[0].bundle?.id)
    expect(a.every((effect) => effect.bundle?.id === a[0].bundle?.id)).toBe(true)
    expect(a.every((effect) => !b.some((other) => other.id === effect.id))).toBe(true)
  })

  it('resolves Lance as an attack, not an invented saving throw', () => {
    expect(spellAction(card('lance'), { saveDc: 17, toHit: 8 })).toMatchObject({
      kind: 'ranged',
      toHit: 8,
      damage: [{ formula: '5d6', type: 'force' }],
    })
    expect(spellAction(card('lance'), {})?.save).toBeUndefined()
  })

  it.each([
    ['furious-wail', 'Stunned'],
    ['lance', 'Restrained'],
    ['shocking-volley', 'Incapacitated'],
  ])('anchors %s to the affected creature’s turn', (slug, name) => {
    expect(effects(slug)).toMatchObject([
      { name, source: 'target', duration: { type: 'untilSourceTurn', when: 'endOfTurn' } },
    ])
  })

  it('keeps Prone until the creature gets up, not until a source-turn timer', () => {
    expect(effects('burst-stone')).toMatchObject([
      { name: 'Prone', source: 'caster', duration: { type: 'manual' } },
    ])
  })

  it.each(['crown-of-thorns', 'iron-gut', 'misdirection'])(
    'does not invent an initial save, attack, or damage roll for %s',
    (slug) => {
      expect(spellAction(card(slug), {})).toBeNull()
      expect(damageVariants(card(slug))).toEqual([])
      expect(effects(slug).every((effect) => effect.modifier === null)).toBe(true)
      expect(landsOnCast(card(slug))).toBe(false)
    },
  )

  it.each(['babble', 'blunted-edge', 'bound-haze', 'toothless-beast', 'iron-gut'])(
    'keeps unsupported conditional rules and escape saves manual for %s',
    (slug) => {
      expect(
        effects(slug).every(
          (effect) => effect.modifier === null && effect.duration.type !== 'saveEnds',
        ),
      ).toBe(true)
      expect(effects(slug).every((effect) => effect.concentration)).toBe(true)
    },
  )

  it.each(['conjure-construct', 'high-ground', 'spiked-barricade', 'gale', 'rebounding-bolt'])(
    'keeps manual-only %s non-rollable, even if mechanics are injected',
    (slug) => {
      const spell = {
        ...card(slug),
        mechanics: {
          save: { ability: 'dex' as const },
          damage: [{ formula: '99d6', type: 'fire' as const }],
        },
      }
      expect(castingMechanics(spell)).toBeUndefined()
      expect(spellAction(spell, {})).toBeNull()
      expect(spellEffectFor(spell)).toBeNull()
    },
  )

  it('never enables a renamed card, another edition/source, or a custom copy by profile id', () => {
    const spell = card('burst-stone')
    for (const changed of [
      { ...spell, name: 'Bless' },
      { ...spell, edition: '5.5' as const },
      { ...spell, source: 'kobold-press-deepm' },
      { ...spell, id: 'custom:burst-stone' },
    ]) {
      expect(reviewedSpellCasting(changed)).toBeUndefined()
      expect(spellAction(changed, {})).toBeNull()
      expect(spellEffectFor(changed)).toBeNull()
    }
  })
})
