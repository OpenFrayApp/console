// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Spell } from '../../src/schema/spell.ts'
import type { Encounter } from '../../src/schema/encounter.ts'
import { castingMechanics, damageVariants, spellAction } from '../../src/combat/casting.ts'
import { spellEffectFor } from '../../src/combat/spellEffects.ts'
import { REVIEWED_SPELL_CASTING, reviewedSpellCasting } from '../../src/combat/reviewedSpells.ts'
import { SPELLS_THAT_DONT_SUCK_REVIEW_RECORDS } from '../fixtures/spellsThatDontSuckReview.ts'
import { REFERENCE_ONLY_SPELLS } from './referenceSpellCoverage.data.ts'
import { monster } from '../fixtures.ts'
import { nextTurn } from '../../src/combat/initiative.ts'
import { emptyEncounter, encounterReducer } from '../../src/state/encounter.ts'

const spells = JSON.parse(
  readFileSync(
    new URL('../../public/compendium/spells-that-dont-suck-spells.json', import.meta.url),
    'utf8',
  ),
) as Spell[]

/** Read the approved card without adding test-authored mechanics. */
function card(slug: string): Spell {
  return spells.find((spell) => spell.id === `somanyrobots-spells-that-dont-suck:${slug}`)!
}

/** Build effects for a known caster and affected creature. */
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

describe('Spells That Don’t Suck reviewed casting', () => {
  it('reviews exactly all 181 approved cards', () => {
    expect(spells).toHaveLength(181)
    expect(Object.keys(SPELLS_THAT_DONT_SUCK_REVIEW_RECORDS)).toHaveLength(181)
    const profiles = spells.map((spell) => reviewedSpellCasting(spell)!)
    expect(profiles.filter((profile) => profile.mechanics)).toHaveLength(56)
    expect(profiles.filter((profile) => !profile.mechanics && profile.effect)).toHaveLength(45)
    expect(profiles.filter((profile) => !profile.mechanics && !profile.effect)).toHaveLength(80)
    expect(
      Object.entries(REVIEWED_SPELL_CASTING)
        .filter(([, profile]) => profile.source === 'somanyrobots-spells-that-dont-suck')
        .map(([id]) => id)
        .sort(),
    ).toEqual(Object.keys(SPELLS_THAT_DONT_SUCK_REVIEW_RECORDS).sort())
  })

  it.each(Object.entries(SPELLS_THAT_DONT_SUCK_REVIEW_RECORDS))(
    'pins %s without rewriting its card',
    (id, digest) => {
      const spell = spells.find((s) => s.id === id)!
      expect(createHash('sha256').update(JSON.stringify(spell)).digest('hex')).toBe(digest)
      expect(REFERENCE_ONLY_SPELLS[id]).toBeUndefined()
      expect(reviewedSpellCasting(spell)).toBeDefined()
      const original = JSON.stringify(spell)
      spellAction(spell, { saveDc: 17, toHit: 8 })
      damageVariants(spell)
      spellEffectFor(spell)?.build({ spell, source: 'caster', target: monster() })
      expect(JSON.stringify(spell)).toBe(original)
      expect(spell.mechanics).toBeUndefined()
    },
  )

  it.each([
    ['animal-transformation', 'cha', 'negates', undefined, undefined],
    ['arctic-breath', 'dex', 'half', '2d8', 'cold'],
    ['befriend-beast', 'wis', 'negates', undefined, undefined],
    ['bewilder', 'wis', 'negates', undefined, undefined],
    ['black-ice', 'dex', 'negates', '1d6', 'cold'],
    ['blade-burst', 'dex', 'negates', '1d6', 'slashing'],
    ['captivate', 'wis', 'negates', undefined, undefined],
    ['cold-snap', 'con', 'half', '3d8', 'cold'],
    ['command-beast', 'wis', 'negates', undefined, undefined],
    ['cone-of-flame', 'dex', 'half', '3d6', 'fire'],
    ['corrosive-burst', 'dex', 'half', '8d4', 'acid'],
    ['dazzle', 'con', 'negates', undefined, undefined],
    ['drink-life', 'con', 'half', '6d8', 'necrotic'],
    ['earth-leash', 'str', 'negates', undefined, undefined],
    ['earth-rumble', 'dex', 'half', '2d6', 'bludgeoning'],
    ['eldritch-rift', 'str', 'half', '3d4', 'necrotic'],
    ['expose-weakness', 'cha', 'negates', undefined, undefined],
    ['expulsion', 'cha', 'negates', undefined, undefined],
    ['false-foes', 'int', 'negates', undefined, undefined],
    ['fearsome-visage', 'wis', 'negates', undefined, undefined],
    ['fireblast', 'dex', 'half', '7d6', 'fire'],
    ['great-wave', 'str', 'half', '6d10', 'bludgeoning'],
    ['impaling-spires', 'dex', 'half', '5d10', 'piercing'],
    ['injunction', 'wis', 'negates', undefined, undefined],
    ['lashing-vine', 'dex', 'negates', undefined, undefined],
    ['lightning-beam', 'dex', 'half', '4d12', 'lightning'],
    ['mass-freeze', 'con', 'half', '4d8', 'cold'],
    ['muddy-servant', 'str', 'negates', '2d6', 'bludgeoning'],
    ['necromantic-storm', 'con', 'half', '6d8', 'necrotic'],
    ['necrotic-sphere', 'con', 'half', '8d8', 'necrotic'],
    ['phantasm', 'wis', 'negates', undefined, undefined],
    ['phantasmal-nightmares', 'wis', 'negates', undefined, undefined],
    ['poison-fang', 'con', 'negates', '1d12', 'poison'],
    ['psychic-skewer', 'int', 'half', '3d8', 'psychic'],
    ['rain-of-fire', 'dex', 'half', '8d6', 'fire'],
    ['riptide', 'str', 'half', '4d8', 'bludgeoning'],
    ['rot', 'con', 'half', '9d8', 'necrotic'],
    ['seal-away', 'wis', 'negates', undefined, undefined],
    ['sonic-rift', 'con', 'half', '4d8', 'thunder'],
    ['stream-of-flame', 'dex', 'half', '4d8', 'fire'],
    ['synaptic-shockwave', 'int', 'half', '10d8', 'psychic'],
    ['synaptic-spear', 'int', 'half', '6d8', 'psychic'],
    ['thunder-burst', 'con', 'negates', '1d8', 'thunder'],
    ['unbridled-fury', 'wis', 'negates', undefined, undefined],
    ['withering-field', 'con', 'half', '12d8', 'necrotic'],
    ['wound', 'con', 'half', '14d6', 'necrotic'],
  ])('uses the printed initial save for %s', (slug, ability, onSave, formula, type) => {
    const action = spellAction(card(slug!), { saveDc: 17 })!
    expect(action.save).toEqual({ ability, dc: 17, onSave })
    expect(action.damage).toEqual(formula ? [{ formula, type }] : undefined)
    expect(action.toHit).toBeNull()
  })

  it('keeps Stinging Insects components together without a delayed poison roll', () => {
    expect(spellAction(card('stinging-insects'), { saveDc: 17 })).toMatchObject({
      save: { ability: 'con', dc: 17, onSave: 'negates' },
      damage: [
        { formula: '1d4', type: 'piercing' },
        { formula: '1d4', type: 'poison' },
      ],
    })
  })

  it.each([
    ['caustic-quarrel', 'ranged', [{ formula: '6d4', type: 'acid' }]],
    ['draining-bolt', 'ranged', [{ formula: '1d6', type: 'necrotic' }]],
    [
      'frost-shuriken',
      'ranged',
      [
        { formula: '1d4', type: 'piercing' },
        { formula: '2d8', type: 'cold' },
      ],
    ],
    ['ghost-touch', 'ranged', [{ formula: '1d8', type: 'necrotic' }]],
    ['inflict-disease', 'melee', undefined],
    ['life-drain', 'ranged', [{ formula: '3d6', type: 'necrotic' }]],
    ['lightning-leash', 'melee', [{ formula: '1d6', type: 'lightning' }]],
    ['minor-drain', 'ranged', [{ formula: '3d6', type: 'necrotic' }]],
    ['touch-of-filth', 'melee', [{ formula: '1d6', type: 'poison' }]],
  ] as const)('uses the printed initial attack for %s', (slug, kind, damage) => {
    const action = spellAction(card(slug), { toHit: 8 })!
    expect(action.kind).toBe(kind)
    expect(action.toHit).toBe(8)
    expect(action.damage).toEqual(damage)
    expect(action.save).toBeUndefined()
  })

  it.each([
    'incinerate',
    'irradiate',
    'lunar-beam',
    'dust-cyclone',
    'hailstorm',
    'whirlpool',
    'tempest',
    'oakenhide',
    'rejuvenation',
    'wellspring',
  ])('does not resolve %s later damage/healing/HP loss on casting', (slug) => {
    expect(spellAction(card(slug), {})).toBeNull()
    expect(castingMechanics(card(slug))).toBeUndefined()
    if (['incinerate', 'oakenhide', 'rejuvenation'].includes(slug)) {
      expect(spellEffectFor(card(slug))).not.toBeNull()
    } else {
      expect(spellEffectFor(card(slug))).toBeNull()
    }
  })

  it.each([
    'death-ray',
    'prismatic-bolt',
    'scintillant-blast',
    'shatter-mind',
    'siphon-life',
    'spreadshot',
    'morph-earth',
    'burst-of-flame',
    'holy-fire',
    'deflect',
    'flickering-strikes',
  ])('keeps %s mixed branches or untyped HP loss manual', (slug) => {
    expect(spellAction(card(slug), {})).toBeNull()
    expect(spellEffectFor(card(slug))).toBeNull()
    expect(reviewedSpellCasting(card(slug))).toBeDefined()
  })

  it('leaves created traps, objects, and narrative effects off the caster', () => {
    for (const slug of ['magic-net', 'enkindle', 'sky-omen']) {
      expect(spellAction(card(slug), {})).toBeNull()
      expect(spellEffectFor(card(slug))).toBeNull()
    }
    expect(effects('inflict-disease')[0].durationNote).toBe('Until cured; may set for 7 days')
  })

  it('preserves the unusual Life Drain higher-slot threshold', () => {
    expect(
      damageVariants(card('life-drain')).map(({ key, damage }) => [key, damage[0].formula]),
    ).toEqual([
      ['base', '3d6'],
      ['slot-7', '4d6'],
      ['slot-8', '4d6'],
      ['slot-9', '5d6'],
    ])
    expect(damageVariants(card('frost-shuriken'))[1].damage).toEqual([
      { formula: '1d4', type: 'piercing' },
      { formula: '3d8', type: 'cold' },
    ])
    expect(damageVariants(card('stinging-insects')).at(-1)?.damage).toEqual([
      { formula: '4d4', type: 'piercing' },
      { formula: '4d4', type: 'poison' },
    ])
  })

  it('keeps delayed damage and conditional defenses out of automatic modifiers', () => {
    expect(castingMechanics(card('caustic-quarrel'))?.damage).toEqual([
      { formula: '6d4', type: 'acid' },
    ])
    expect(effects('caustic-quarrel')).toMatchObject([
      {
        source: 'target',
        duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
        modifier: null,
      },
    ])
    for (const slug of [
      'expose-weakness',
      'expulsion',
      'false-death',
      'form-of-fire',
      'form-of-stone',
      'oakenhide',
      'warding-sigil',
      'animal-ally',
      'captivate',
    ]) {
      expect(effects(slug).every((effect) => effect.modifier === null)).toBe(true)
    }
  })

  it('expires poison at affected creature start and deafness at its end, not caster turns', () => {
    const poison = effects('poison-fang')
    const deaf = effects('thunder-burst')
    let encounter: Encounter = {
      ...emptyEncounter(),
      combatants: [
        monster({ combatantId: 'caster' }),
        monster({ combatantId: 'target', effects: [...poison, ...deaf] }),
      ],
      activeIndex: 0,
    }
    encounter = nextTurn(encounter)
    expect(encounter.combatants[1].effects.map((effect) => effect.name)).toEqual(['Deafened'])
    encounter = nextTurn(encounter)
    expect(encounter.combatants[1].effects).toEqual([])
  })

  it('clears caster-owned frozen bundles on concentration end without removing instantaneous Prone', () => {
    const frozen = effects('mass-freeze')
    const prone = effects('earth-rumble')
    expect(frozen).toMatchObject([
      { name: 'Restrained', source: 'caster', concentration: true },
      { name: 'Mass Freeze', source: 'caster', concentration: true },
    ])
    expect(frozen[0].bundle).toEqual(frozen[1].bundle)
    expect(prone.every((effect) => effect.concentration === false)).toBe(true)
    const encounter = {
      ...emptyEncounter(),
      combatants: [
        monster({
          combatantId: 'caster',
          concentration: { spell: 'Mass Freeze', saveDc: 17, round: 1 },
        }),
        monster({ combatantId: 'target', effects: [...frozen, ...prone] }),
      ],
    }
    const after = encounterReducer(encounter, { type: 'endConcentration', id: 'caster' })
    expect(after.combatants[1].effects.map((effect) => effect.name)).toEqual(['Prone'])
    expect(effects('synaptic-shockwave')[0].durationNote).toContain('escape save')
  })
})
