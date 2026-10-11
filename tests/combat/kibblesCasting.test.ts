// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Spell } from '../../src/schema/spell.ts'
import { castingMechanics, damageVariants, spellAction } from '../../src/combat/casting.ts'
import { spellEffectFor } from '../../src/combat/spellEffects.ts'
import { REVIEWED_SPELL_CASTING, reviewedSpellCasting } from '../../src/combat/reviewedSpells.ts'
import { KIBBLES_CASTING_REVIEW_RECORDS } from '../fixtures/kibblesCastingReview.ts'
import { REFERENCE_ONLY_SPELLS } from './referenceSpellCoverage.data.ts'
import { monster } from '../fixtures.ts'
import { nextTurn } from '../../src/combat/initiative.ts'
import { emptyEncounter, encounterReducer } from '../../src/state/encounter.ts'

const source = 'kibblestasty-casting-compendium-v2.3'
const spells = JSON.parse(
  readFileSync(
    new URL('../../public/compendium/kibbles-casting-v23-spells.json', import.meta.url),
    'utf8',
  ),
) as Spell[]

/** Read one approved Kibbles card without supplying test-authored mechanics. */
function card(slug: string): Spell {
  return spells.find((spell) => spell.id === `${source}:${slug}`)!
}

/** Build reviewed effects with different caster and affected-creature identities. */
function effects(slug: string) {
  const spell = card(slug)
  return spellEffectFor(spell)!.build({
    spell,
    source: 'caster',
    target: monster({ combatantId: 'target' }),
  })
}

describe('Kibbles Casting Compendium v2.3 reviewed casting', () => {
  it('reviews exactly all 295 approved cards', () => {
    expect(spells).toHaveLength(295)
    const profiles = spells.map((spell) => reviewedSpellCasting(spell)!)
    expect(profiles.filter((profile) => profile.mechanics)).toHaveLength(121)
    expect(profiles.filter((profile) => !profile.mechanics && profile.effect)).toHaveLength(106)
    expect(profiles.filter((profile) => !profile.mechanics && !profile.effect)).toHaveLength(68)
    expect(
      Object.entries(REVIEWED_SPELL_CASTING)
        .filter(([, profile]) => profile.source === source)
        .map(([id]) => id)
        .sort(),
    ).toEqual(Object.keys(KIBBLES_CASTING_REVIEW_RECORDS).sort())
  })

  it.each(Object.entries(KIBBLES_CASTING_REVIEW_RECORDS))(
    'pins %s and prevents source/name fallback',
    (id, digest) => {
      const spell = spells.find((entry) => entry.id === id)!
      expect(createHash('sha256').update(JSON.stringify(spell)).digest('hex')).toBe(digest)
      expect(REFERENCE_ONLY_SPELLS[id]).toBeUndefined()
      expect(reviewedSpellCasting(spell)?.manual).toBeTruthy()
      expect(spell.mechanics).toBeUndefined()
      const original = JSON.stringify(spell)
      spellAction(spell, { saveDc: 17, toHit: 8 })
      damageVariants(spell)
      spellEffectFor(spell)?.build({ spell, source: 'caster', target: monster() })
      expect(JSON.stringify(spell)).toBe(original)
      for (const altered of [
        { ...spell, id: 'custom:copy', source: 'custom' as const },
        { ...spell, source: 'somanyrobots-so-many-spells' as const },
        { ...spell, edition: '5.5' as const },
        { ...spell, name: 'Changed name' },
        { ...spell, id: `${source}:unreviewed-copy` },
      ])
        expect(reviewedSpellCasting(altered)).toBeUndefined()
    },
  )

  it.each([
    ['acid-bubble', 'dex', 'half', '3d4', 'acid'],
    ['angelic-slash', 'dex', 'half', '5d8', 'radiant'],
    ['arctic-breath', 'dex', 'half', '2d8', 'cold'],
    ['avalanche', 'dex', 'half', '6d10', 'bludgeoning'],
    ['bad-blood', 'con', 'negates', '1d12', 'poison'],
    ['bile-beam', 'dex', 'half', '12d4', 'acid'],
    ['blood-storm', 'dex', 'half', '3d8', 'slashing'],
    ['bloody-burst', 'con', 'half', '4d6', 'necrotic'],
    ['bramble-binding', 'dex', 'half', '4d4', 'piercing'],
    ['cold-snap', 'con', 'half', '3d8', 'cold'],
    ['crashing-wave', 'str', 'half', '2d6', 'bludgeoning'],
    ['crimson-tide', 'dex', 'half', '6d6', 'necrotic'],
    ['crushing-singularity', 'str', 'half', '6d6', 'bludgeoning'],
    ['deglove-creature', 'con', 'half', '7d10+7', 'necrotic'],
    ['devour-shadow', 'cha', 'half', '6d6', 'necrotic'],
    ['devouring-darkness', 'con', 'half', '6d8', 'necrotic'],
    ['divine-judgment', 'dex', 'half', '2d8', 'radiant'],
    ['echoing-lance', 'con', 'half', '3d8', 'thunder'],
    ['electrocute', 'con', 'half', '4d12', 'lightning'],
    ['erode', 'dex', 'half', '8d4', 'acid'],
    ['eyes-of-immolation', 'dex', 'half', '3d6', 'fire'],
    ['fire-cyclone', 'str', 'half', '3d6', 'fire'],
    ['fissure', 'dex', 'negates', '6d10', 'bludgeoning'],
    ['flamethrower', 'dex', 'half', '4d6', 'fire'],
    ['flash-freeze', 'con', 'half', '4d8', 'cold'],
    ['geyser', 'dex', 'half', '4d6', 'bludgeoning'],
    ['glacial-crash', 'dex', 'half', '6d6', 'cold'],
    ['gravity-surge', 'str', 'half', '2d6', 'bludgeoning'],
    ['hurricane-slash', 'dex', 'half', '3d8', 'slashing'],
    ['illusionary-fireball', 'wis', 'negates', '6d6', 'psychic'],
    ['infernal-shackles', 'str', 'half', '3d6', 'fire'],
    ['iron-garden', 'dex', 'half', '6d8', 'piercing'],
    ['melt', 'con', 'half', '10d10', 'fire'],
    ['meteor-jump', 'str', 'half', '2d10', 'bludgeoning'],
    ['mind-blast', 'int', 'half', '6d8', 'psychic'],
    ['mind-ray', 'wis', 'half', '2d8', 'psychic'],
    ['pillar-of-fire', 'dex', 'half', '10d6', 'fire'],
    ['platinum-lances', 'dex', 'half', '8d8', 'radiant'],
    ['poison-blast', 'con', 'half', '4d12', 'poison'],
    ['pressure-cutter', 'dex', 'half', '10d6', 'slashing'],
    ['psychic-drain', 'cha', 'negates', '3d8', 'psychic'],
    ['seismic-wave', 'str', 'half', '4d10', 'bludgeoning'],
    ['shockwave', 'str', 'half', '8d6', 'bludgeoning'],
    ['sky-burst', 'dex', 'half', '4d12+4', 'lightning'],
    ['sonic-shriek', 'con', 'half', '6d8', 'thunder'],
    ['starfall', 'dex', 'half', '4d8', 'radiant'],
    ['supernova', 'con', 'half', '30d8', 'radiant'],
    ['thunder-note', 'con', 'negates', '1d8', 'thunder'],
    ['thunder-pulse', 'con', 'half', '3d8', 'thunder'],
    ['unholy-wave', 'con', 'half', '4d6', 'necrotic'],
    ['vicious-vapors', 'con', 'half', '1d12', 'poison'],
    ['violent-crush', 'str', 'half', '6d12', 'bludgeoning'],
    ['water-cannon', 'str', 'half', '6d6', 'bludgeoning'],
    ['wither', 'con', 'half', '4d10+4', 'necrotic'],
  ])(
    'resolves only the printed initial save/damage for %s',
    (slug, ability, onSave, formula, type) => {
      const action = spellAction(card(slug!), { saveDc: 17 })!
      expect(action.save).toEqual({ ability, dc: 17, onSave })
      expect(action.damage).toEqual([{ formula, type }])
      expect(action.toHit).toBeNull()
    },
  )

  it.each([
    ['aero-barrage', 'ranged', '2d8', 'slashing'],
    ['burial-barrage', 'ranged', '1d12+1', 'bludgeoning'],
    ['burn', 'melee', '1d12', 'fire'],
    ['carnivorous-garden', 'melee', '2d8', 'piercing'],
    ['crackle', 'ranged', '1d12', 'lightning'],
    ['decaying-touch', 'melee', '1d6', 'necrotic'],
    ['electric-arc', 'ranged', '1d8', 'lightning'],
    ['force-bolt', 'ranged', '2d4', 'force'],
    ['freeze', 'melee', '1d8', 'cold'],
    ['gale-bolt', 'ranged', '2d8', 'bludgeoning'],
    ['illusionary-dart', 'ranged', '1d8', 'psychic'],
    ['impact', 'melee', '1d10', 'bludgeoning'],
    ['melting-glob', 'ranged', '4d4', 'acid'],
    ['poison-dart', 'ranged', '3d12', 'poison'],
    ['pseudopod-slam', 'melee', '8d4', 'acid'],
    ['pyroclastic-lance', 'ranged', '8d6', 'fire'],
    ['rock-slam', 'ranged', '1d10', 'bludgeoning'],
    ['shadow-lash', 'melee', '2d4', 'psychic'],
    ['spider-bite', 'melee', '4d12', 'poison'],
    ['stone-fist', 'melee', '2d10', 'bludgeoning'],
    ['thunder-punch', 'melee', '3d8', 'thunder'],
    ['water-blast', 'ranged', '3d6', 'bludgeoning'],
  ])('resolves %s attacks without later saves or extra attacks', (slug, kind, formula, type) => {
    expect(spellAction(card(slug!), { toHit: 8 })).toMatchObject({
      kind,
      toHit: 8,
      damage: [{ formula, type }],
    })
    expect(castingMechanics(card(slug!))?.save).toBeUndefined()
  })

  it('keeps simultaneous components together and scales only printed components', () => {
    expect(castingMechanics(card('blood-bolt'))?.damage).toEqual([
      { formula: '1d6', type: 'piercing' },
      { formula: '1d6', type: 'necrotic' },
    ])
    expect(damageVariants(card('blood-bolt')).at(-1)?.damage).toEqual([
      { formula: '4d6', type: 'piercing' },
      { formula: '4d6', type: 'necrotic' },
    ])
    expect(damageVariants(card('blood-slash')).at(-1)?.damage).toEqual([
      { formula: '10d6', type: 'slashing' },
      { formula: '2d6', type: 'necrotic' },
    ])
    expect(damageVariants(card('wither')).at(-1)?.damage).toEqual([
      { formula: '10d10+4', type: 'necrotic' },
    ])
    expect(damageVariants(card('acid-bubble')).at(-1)?.damage).toEqual([
      { formula: '19d4', type: 'acid' },
    ])
    expect(damageVariants(card('force-bolt')).at(-1)?.damage).toEqual([
      { formula: '8d4', type: 'force' },
    ])
    expect(castingMechanics(card('volcanic-burst'))?.damage).toEqual([
      { formula: '4d10', type: 'bludgeoning' },
      { formula: '4d6', type: 'fire' },
    ])
    for (const slug of [
      'aero-barrage',
      'burial-barrage',
      'crackle',
      'illusionary-dart',
      'sky-burst',
      'starfall',
      'seismic-wave',
      'psychic-drain',
      'hungry-blood',
    ])
      expect(damageVariants(card(slug))).toHaveLength(1)
  })

  it.each([
    'acid-rain',
    'anvil-drop',
    'beam-of-annihilation',
    'blizzard',
    'divine-descent',
    'dust-cyclone',
    'field-of-stars',
    'final-flame',
    'form-of-fire',
    'heavenly-ray',
    'lightning-tendril',
    'orbital-stones',
    'rain-of-swords',
    'sanguine-spears',
    'seeking-orb',
    'static-field',
    'stinging-swarm',
    'stirge-swarm',
    'thunderburst-mine',
    'time-trap',
    'tornado',
    'vampiric-mosquito',
    'vital-surge',
    'waterspout',
    'summon-archon',
    'summon-dragon',
    'summon-monstrosity',
    'summon-ooze',
    'summon-plant',
    'summon-swarm',
  ])('does not roll %s later attacks, damage or healing at creation', (slug) => {
    expect(spellAction(card(slug), { saveDc: 17, toHit: 8 })).toBeNull()
  })

  it.each([
    'acidic-pit',
    'blackhole',
    'brilliant-blade',
    'explosive-deflection',
    'exsanguinate',
    'ice-spike',
    'jumping-jolt',
    'lightning-shot',
    'storm-shot',
    'suffocate',
    'whirling-conflagration',
    'awaken-rope',
    'gory-doom',
    'sanctified-charge',
  ])('keeps %s incompatible initial branches manual', (slug) => {
    expect(spellAction(card(slug), { saveDc: 17, toHit: 8 })).toBeNull()
    expect(reviewedSpellCasting(card(slug))?.manual).toBeTruthy()
  })

  it('does not invent typed damage, secondary saves, or fixed choice types', () => {
    for (const slug of [
      'earth-ripple',
      'dispel-construct',
      'sanguine-doom',
      'vortex-blast',
      'elemental-exhalation',
      'dragon-surge',
      'elemental-orb',
      'ice-arrow',
      'water-bullet',
      'wasp-barrage',
      'windborne-weapon',
    ])
      expect(castingMechanics(card(slug))?.damage).toBeUndefined()
    for (const slug of ['poison-dart', 'spider-bite', 'water-blast', 'crackle'])
      expect(spellEffectFor(card(slug))).toBeNull()
  })

  it('keeps conditional defenses and later riders as reminders without broad modifiers', () => {
    for (const slug of [
      'alacrity',
      'immutability',
      'blood-frenzy',
      'flicker',
      'nullify-effect',
      'time-slip',
      'mutate',
      'rotting-curse',
      'unlocked-potential',
      'windsense',
      'wither',
    ])
      expect(effects(slug).every((effect) => effect.modifier === null)).toBe(true)
    for (const slug of ['bile-beam', 'erode', 'decaying-touch', 'bad-blood', 'echoing-lance'])
      expect(castingMechanics(card(slug))?.delayed).toBeUndefined()
  })

  it('labels lasting consequences independently of Instantaneous spell headers', () => {
    expect(effects('bile-beam')[0].durationNote).toContain('affected creature’s next turn')
    expect(effects('bramble-binding')[0].durationNote).toBe('Until freed')
    expect(effects('erode')[0].durationNote).toBe('Until acid is cleared')
    expect(effects('sanguine-doom')[0].durationNote).toBe('Until the next attack hits')
    expect(effects('avalanche')[0].durationNote).toBe('Until it stands up')
  })

  it('preserves created areas after successful initial saves', () => {
    for (const slug of [
      'fire-cyclone',
      'flamethrower',
      'illusory-pit',
      'starfall',
      'thunder-pulse',
      'twisting-eruption',
      'vicious-vapors',
    ]) {
      expect(reviewedSpellCasting(card(slug))?.persistsAfterSave).toBe(true)
      expect(spellEffectFor(card(slug))?.targeting).toBe('self')
      expect(effects(slug)[0]).toMatchObject({ source: 'caster', concentration: true })
    }
  })

  it('expires Mind Blast at affected creature turn end, not caster turn end', () => {
    const stun = effects('mind-blast')
    expect(stun[0]).toMatchObject({
      name: 'Stunned',
      source: 'target',
      duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
    })
    const encounter = {
      ...emptyEncounter(),
      combatants: [
        monster({ combatantId: 'caster' }),
        monster({ combatantId: 'target', effects: stun }),
      ],
      activeIndex: 0,
    }
    const duringTargetTurn = nextTurn(encounter)
    expect(duringTargetTurn.combatants[1].effects).toHaveLength(1)
    expect(nextTurn(duringTargetTurn).combatants[1].effects).toEqual([])
    expect(effects('electrocute')[0]).toMatchObject({
      source: 'caster',
      duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
    })
  })

  it('clears concentration conditions while leaving instantaneous prone intact', () => {
    const encounter = {
      ...emptyEncounter(),
      combatants: [
        monster({
          combatantId: 'caster',
          concentration: { spell: 'Shadow Bind', saveDc: 17, round: 1 },
        }),
        monster({
          combatantId: 'target',
          effects: [...effects('shadow-bind'), ...effects('avalanche')],
        }),
      ],
    }
    const after = encounterReducer(encounter, { type: 'endConcentration', id: 'caster' })
    expect(after.combatants[1].effects.map((effect) => effect.name)).toEqual(['Prone'])
  })
})
