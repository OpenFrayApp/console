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

const spells = JSON.parse(
  readFileSync(
    new URL('../../public/compendium/tome-of-heroes-spells.json', import.meta.url),
    'utf8',
  ),
) as Spell[]
const REVIEWED_RECORDS: Record<string, string> = {
  'kobold-press-toh:burst-stone':
    '20b94e0fa8f248c8abef76fc4a9d0e2f4043d025d4452600df8d149219da7d4e',
  'kobold-press-toh:furious-wail':
    '94a044ea1359bb27c739178b4a7e8e0bacad5070d893ffe7c9b7d8f932f9e0e2',
  'kobold-press-toh:lance': 'f4d924582fe4b60c6233b90f1813c48d1640807c3f83574fb0c086e14d1f3293',
  'kobold-press-toh:shocking-volley':
    'b745b567ed3a67d60d874f7208c5172acee1c4ddcc24a11d814ff6886868c754',
  'kobold-press-toh:pincer': '65b061969f61d2f5b49d0b2b0bd9795514feceb088288c50755ae01c3f1385f4',
  'kobold-press-toh:babble': '522d8bdc06448d0fdb931677e02e32086f782b2a0977a7414a5ef95dfcecb2fd',
  'kobold-press-toh:blunted-edge':
    '64a96e639acb6100c925a78d427e350b96d9f8ddf355ca4ba4932e054728f22b',
  'kobold-press-toh:bound-haze': '7e0f80ce060995e544647b2a8deaa585f7f64cba5494aa82926d6040c18ad977',
  'kobold-press-toh:toothless-beast':
    '9899007f47f3ffd6da2b31dcbce4d3da894749ce2e858fb502d696b3438f1c32',
  'kobold-press-toh:crown-of-thorns':
    '14c63592016ddccd234a0a2ca248815c0443129273e6e323ec0b734a24282d72',
  'kobold-press-toh:iron-gut': '07a68274cf26fd5e8407a7b1310acf5ea02cb0c1c1d67ecca61abc1315864938',
  'kobold-press-toh:misdirection':
    '42462f706032be5e27c0e3e590f8f06ea6c0e5984571dc4404e1d320d6e920b1',
}

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
    expect(Object.keys(REVIEWED_SPELL_CASTING).sort()).toEqual(Object.keys(REVIEWED_RECORDS).sort())
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

  it.each(['armored-formation', 'smelting-blast', 'sneer', 'gale', 'rebounding-bolt'])(
    'keeps unreviewed %s isolated, even if mechanics are injected',
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
