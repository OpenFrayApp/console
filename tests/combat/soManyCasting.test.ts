// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Spell } from '../../src/schema/spell.ts'
import { castingMechanics, damageVariants, spellAction } from '../../src/combat/casting.ts'
import { spellEffectFor } from '../../src/combat/spellEffects.ts'
import { REVIEWED_SPELL_CASTING, reviewedSpellCasting } from '../../src/combat/reviewedSpells.ts'
import { SO_MANY_REVIEW_RECORDS } from '../fixtures/soManyReview.ts'
import { REFERENCE_ONLY_SPELLS } from './referenceSpellCoverage.data.ts'
import { monster } from '../fixtures.ts'
import { nextTurn } from '../../src/combat/initiative.ts'
import { emptyEncounter, encounterReducer } from '../../src/state/encounter.ts'

const spells = JSON.parse(
  readFileSync(
    new URL('../../public/compendium/so-many-spells-spells.json', import.meta.url),
    'utf8',
  ),
) as Spell[]

/** Read the actual approved card for a reviewed spell. */
function card(slug: string): Spell {
  return spells.find((spell) => spell.id === `somanyrobots-so-many-spells:${slug}`)!
}

/** Build a reviewed effect on a known target and caster. */
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

describe('So Many Spells reviewed casting', () => {
  it('has source evidence for all 179 approved cards', () => {
    expect(spells).toHaveLength(179)
    expect(Object.keys(SO_MANY_REVIEW_RECORDS)).toHaveLength(179)
    const profiles = spells.map((spell) => reviewedSpellCasting(spell)!)
    expect(profiles.filter((profile) => profile.mechanics)).toHaveLength(71)
    expect(profiles.filter((profile) => !profile.mechanics && profile.effect)).toHaveLength(41)
    expect(profiles.filter((profile) => !profile.mechanics && !profile.effect)).toHaveLength(67)
    expect(
      Object.entries(REVIEWED_SPELL_CASTING)
        .filter(([, profile]) => profile.source === 'somanyrobots-so-many-spells')
        .map(([id]) => id)
        .sort(),
    ).toEqual(Object.keys(SO_MANY_REVIEW_RECORDS).sort())
  })

  it.each(Object.entries(SO_MANY_REVIEW_RECORDS))(
    'pins the reviewed %s card and never rewrites it',
    (id, digest) => {
      const spell = spells.find((s) => s.id === id)!
      expect(createHash('sha256').update(JSON.stringify(spell)).digest('hex')).toBe(digest)
      const original = JSON.stringify(spell)
      expect(reviewedSpellCasting(spell)).toBeDefined()
      spellAction(spell, { saveDc: 17, toHit: 8 })
      damageVariants(spell)
      spellEffectFor(spell)?.build({ spell, source: 'caster' })
      expect(JSON.stringify(spell)).toBe(original)
      expect(spell.mechanics).toBeUndefined()
    },
  )

  it.each([
    ['acid-jet', 'dex', 'half', '12d4', 'acid'],
    ['ambertrap', 'dex', 'negates', undefined, undefined],
    ['banshee-s-wail', 'con', 'half', '10d8', 'necrotic'],
    ['bewitching-phantom', 'wis', 'negates', undefined, undefined],
    ['bone-spines', 'dex', 'half', '5d8', 'piercing'],
    ['conjure-poltergeist', 'dex', 'negates', '2d8', 'bludgeoning'],
    ['coruscating-flash', 'con', 'half', '2d6', 'radiant'],
    ['crown-of-entropy', 'con', 'half', '6d8', 'necrotic'],
    ['crystal-blossom', 'con', 'negates', '4d8', 'cold'],
    ['deadly-light', 'con', 'negates', undefined, undefined],
    ['death-hex', 'cha', 'negates', undefined, undefined],
    ['eclipse', 'dex', 'half', '4d8', 'radiant'],
    ['flashdaggers', 'dex', 'half', '5d4', 'piercing'],
    ['grasping-dead', 'str', 'negates', undefined, undefined],
    ['gravity-slam', 'str', 'half', '6d8', 'bludgeoning'],
    ['infectious-jig', 'wis', 'negates', undefined, undefined],
    ['irresistible-melody', 'wis', 'negates', undefined, undefined],
    ['latching-beetle', 'con', 'negates', '3d4', 'piercing'],
    ['lightning-sprint', 'dex', 'negates', '2d4', 'lightning'],
    ['lion-s-roar', 'wis', 'negates', undefined, undefined],
    ['melt-flesh', 'con', 'negates', undefined, undefined],
    ['meteor-strike', 'dex', 'negates', '4d8', 'fire'],
    ['moonrock', 'dex', 'negates', '2d10', 'bludgeoning'],
    ['moonstrike', 'wis', 'negates', undefined, undefined],
    ['poison-light', 'con', 'negates', undefined, undefined],
    ['poison-nova', 'con', 'negates', undefined, undefined],
    ['putrefy', 'con', 'negates', undefined, undefined],
    ['rattle-bones', 'con', 'negates', '6d8', 'necrotic'],
    ['raven-s-rake', 'dex', 'half', '4d8', 'slashing'],
    ['raven-s-wings', 'str', 'half', '5d8', 'slashing'],
    ['reap-soul', 'cha', 'half', '8d8+50', 'necrotic'],
    ['rending-gears', 'dex', 'half', '5d8', 'bludgeoning'],
    ['sever-soul', 'cha', 'negates', undefined, undefined],
    ['shackle-of-flame', 'dex', 'negates', undefined, undefined],
    ['shaderazor', 'dex', 'half', '3d8', 'necrotic'],
    ['shadow-hunger', 'dex', 'half', '10d8', 'necrotic'],
    ['shard-rain', 'dex', 'half', '9d8', 'piercing'],
    ['shatter-skeleton', 'con', 'half', '12d8', 'necrotic'],
    ['silver-wind', 'dex', 'half', '6d8', 'piercing'],
    ['sirocco', 'str', 'half', '3d6', 'fire'],
    ['sonorous-toll', 'wis', 'negates', undefined, undefined],
    ['spreading-toxin', 'con', 'half', '4d12', 'poison'],
    ['starburst', 'dex', 'negates', '3d6', 'radiant'],
    ['starfire-beam', 'dex', 'half', '6d8', 'radiant'],
    ['steal-shadow', 'cha', 'half', '5d6', 'necrotic'],
    ['storm-of-spirits', 'wis', 'half', '10d8', 'necrotic'],
    ['stormwall', 'dex', 'half', '4d12', 'lightning'],
    ['terrifying-guise', 'wis', 'negates', undefined, undefined],
    ['vampiric-mist', 'con', 'negates', '2d6', 'necrotic'],
    ['voltaic-pulse', 'con', 'half', '3d12', 'lightning'],
    ['wall-of-misery', 'cha', 'negates', '4d8', 'necrotic'],
    ['wave-of-darkness', 'con', 'half', '3d8', 'necrotic'],
    ['wind-of-ruin', 'cha', 'negates', undefined, undefined],
    ['wraithbind', 'cha', 'negates', '8d8', 'necrotic'],
  ])('uses the printed initial save and damage for %s', (slug, ability, onSave, formula, type) => {
    const action = spellAction(card(slug!), { saveDc: 17 })!
    expect(action.save).toEqual({ ability, dc: 17, onSave })
    expect(action.damage).toEqual(formula ? [{ formula, type }] : undefined)
    expect(action.toHit).toBeNull()
  })

  it.each([
    ['auric-lance', 'ranged', [{ formula: '10d8', type: 'piercing' }]],
    [
      'bone-hatchet',
      'melee',
      [
        { formula: '1d4', type: 'slashing' },
        { formula: '1d4', type: 'necrotic' },
      ],
    ],
    [
      'bone-spear',
      'ranged',
      [
        { formula: '2d8', type: 'piercing' },
        { formula: '2d8', type: 'necrotic' },
      ],
    ],
    ['creeping-shadow', 'melee', [{ formula: '2d10', type: 'necrotic' }]],
    ['deathgrip', 'ranged', undefined],
    ['ebon-spear', 'ranged', [{ formula: '7d10', type: 'necrotic' }]],
    ['grave-wallop', 'melee', [{ formula: '1d10', type: 'bludgeoning' }]],
    [
      'molten-shard',
      'ranged',
      [
        { formula: '2d8', type: 'piercing' },
        { formula: '2d8', type: 'fire' },
      ],
    ],
    ['quicksilver-lash', 'melee', [{ formula: '6d8', type: 'slashing' }]],
    ['shadow-dagger', 'ranged', [{ formula: '3d8', type: 'necrotic' }]],
    ['sonic-blast', 'ranged', [{ formula: '1d8', type: 'thunder' }]],
    ['soul-leech', 'ranged', [{ formula: '1d8', type: 'necrotic' }]],
    ['thorn-lance', 'ranged', [{ formula: '6d8', type: 'piercing' }]],
    [
      'venomous-maw',
      'melee',
      [
        { formula: '1d12', type: 'piercing' },
        { formula: '5d12', type: 'poison' },
      ],
    ],
    [
      'devil-s-dagger',
      'ranged',
      [
        { formula: '2d4', type: 'fire' },
        { formula: '1d4', type: 'piercing' },
      ],
    ],
  ] as const)('uses the printed attack kind and immediate damage for %s', (slug, kind, damage) => {
    const action = spellAction(card(slug), { toHit: 8 })!
    expect(action.kind).toBe(kind)
    expect(action.toHit).toBe(8)
    expect(action.damage).toEqual(damage)
    expect(action.save).toBeUndefined()
  })

  it('scales only Bone Hatchet necrotic dice by character level', () => {
    expect(damageVariants(card('bone-hatchet')).map((variant) => variant.damage)).toEqual([
      [
        { formula: '1d4', type: 'slashing' },
        { formula: '1d4', type: 'necrotic' },
      ],
      [
        { formula: '1d4', type: 'slashing' },
        { formula: '2d4', type: 'necrotic' },
      ],
      [
        { formula: '1d4', type: 'slashing' },
        { formula: '3d4', type: 'necrotic' },
      ],
      [
        { formula: '1d4', type: 'slashing' },
        { formula: '4d4', type: 'necrotic' },
      ],
    ])
  })

  it('scales both Bone Spear types every two slots, not every slot', () => {
    expect(damageVariants(card('bone-spear')).map((variant) => variant.key)).toEqual([
      'base',
      'slot-4',
      'slot-6',
      'slot-8',
    ])
    expect(damageVariants(card('bone-spear'))[3].damage).toEqual([
      { formula: '5d8', type: 'piercing' },
      { formula: '5d8', type: 'necrotic' },
    ])
  })

  it('does not add Acid Jet’s later 6d4 to its initial damage', () => {
    expect(castingMechanics(card('acid-jet'))?.damage).toEqual([{ formula: '12d4', type: 'acid' }])
    expect(effects('acid-jet')).toMatchObject([
      { source: 'target', duration: { type: 'untilSourceTurn', when: 'endOfTurn' } },
    ])
  })

  it('keeps Bewitching Phantom charm linked to caster concentration with explicit manual expiry', () => {
    expect(
      effects('bewitching-phantom').every(
        (effect) => effect.source === 'caster' && effect.concentration,
      ),
    ).toBe(true)
    expect(
      effects('bewitching-phantom').every(
        (effect) => effect.durationNote === 'Until start of target’s next turn',
      ),
    ).toBe(true)
  })

  it('does not offer an unprinted Ambertrap escape save', () => {
    expect(effects('ambertrap').some((effect) => effect.name === 'Restrained')).toBe(true)
    expect(effects('ambertrap').some((effect) => effect.duration.type === 'saveEnds')).toBe(false)
  })

  it.each(['magma-spike', 'vile-harpoon'])(
    'keeps %s mixed initial damage together under the printed save',
    (slug) => {
      const action = spellAction(card(slug), { saveDc: 17 })!
      expect(action.save).toEqual({
        ability: 'dex',
        dc: 17,
        onSave: slug === 'magma-spike' ? 'half' : 'negates',
      })
      expect(action.damage).toEqual(
        slug === 'magma-spike'
          ? [
              { formula: '2d6', type: 'fire' },
              { formula: '2d6', type: 'piercing' },
            ]
          : [
              { formula: '4d8', type: 'piercing' },
              { formula: '4d8', type: 'necrotic' },
            ],
      )
    },
  )

  it.each(['meteor-strike', 'moonrock', 'moonstrike'])(
    'separates %s automatic damage from its save-controlled branch',
    (slug) => {
      expect(castingMechanics(card(slug))?.damage?.length ?? 0).toBeLessThan(2)
    },
  )

  it.each([
    'lion-s-roar',
    'melt-flesh',
    'putrefy',
    'shackle-of-flame',
    'sever-soul',
    'wind-of-ruin',
    'poison-light',
    'terrifying-guise',
  ])('does not pre-roll %s later hazards or HP reductions', (slug) => {
    expect(damageVariants(card(slug))).toEqual([])
    expect(castingMechanics(card(slug))?.save).toBeTruthy()
  })

  it('narrows Wisdom of the Forgotten to Intelligence and Wisdom checks and saves', () => {
    expect(
      effects('wisdom-of-the-forgotten')
        .filter((effect) => effect.modifier)
        .map((effect) => effect.modifier),
    ).toMatchObject([
      { mode: 'advantage', applies: 'abilityChecks', abilities: ['int', 'wis'] },
      { mode: 'advantage', applies: 'savingThrows', abilities: ['int', 'wis'] },
    ])
  })

  it('keeps Wind of Ruin physical-check disadvantage distinct from saves and HP loss', () => {
    expect(effects('wind-of-ruin')[0].modifier).toMatchObject({
      mode: 'disadvantage',
      applies: 'abilityChecks',
      abilities: ['str', 'dex', 'con'],
    })
    expect(castingMechanics(card('wind-of-ruin'))?.damage).toBeUndefined()
  })

  it('separates Gravity Slam permanent Prone from target-start Restrained', () => {
    expect(effects('gravity-slam')).toMatchObject([
      { name: 'Prone', source: 'caster', duration: { type: 'manual' } },
      {
        name: 'Restrained',
        source: 'target',
        duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
      },
    ])
  })

  it.each(['shadow-hunger', 'storm-of-spirits'])(
    'expires %s fear/blindness on caster next turn, not target',
    (slug) => {
      expect(effects(slug)[0]).toMatchObject({
        source: 'caster',
        duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
      })
    },
  )

  it('expires Shaderazor blindness at target next turn start', () => {
    expect(effects('shaderazor')[0]).toMatchObject({
      name: 'Blinded',
      source: 'target',
      duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
    })
  })

  it('retains Molten Shard until removed, without an invented 1-minute timer', () => {
    expect(effects('molten-shard').every((effect) => effect.duration.type === 'manual')).toBe(true)
    expect(effects('molten-shard')[0].modifier?.mode).toBe('disadvantage')
    expect(
      effects('molten-shard').every((effect) => effect.durationNote === 'Until shard removed'),
    ).toBe(true)
  })

  it('gives Wall of Misery curse its own duration independent of wall concentration', () => {
    expect(effects('wall-of-misery')[0]).toMatchObject({
      source: 'caster',
      duration: { type: 'rounds', rounds: 10 },
      concentration: false,
    })
    expect(reviewedSpellCasting(card('wall-of-misery'))?.persistsAfterSave).toBe(true)
  })

  it.each([
    'lion-s-roar',
    'putrefy',
    'molten-shard',
    'gravity-slam',
    'irresistible-melody',
    'wind-of-ruin',
  ])('builds a fresh removable bundle for %s', (slug) => {
    const a = effects(slug)
    const b = effects(slug)
    expect(a[0].bundle?.id).toBeTruthy()
    expect(a.every((effect) => effect.bundle?.id === a[0].bundle?.id)).toBe(true)
    expect(a[0].bundle?.id).not.toBe(b[0].bundle?.id)
  })

  it('keeps Sonic Blast and Soul Leech distinct character and two-slot scaling', () => {
    expect(damageVariants(card('sonic-blast')).map((variant) => variant.key)).toEqual([
      'base',
      'character-5',
      'character-11',
      'character-17',
    ])
    expect(damageVariants(card('soul-leech')).map((variant) => variant.key)).toEqual([
      'base',
      'slot-6',
      'slot-8',
    ])
  })

  it('does not create a caster badge for objects or summoned creatures', () => {
    for (const slug of ['alter-metal', 'reanimation-mass', 'summon-spider']) {
      expect(spellEffectFor(card(slug))).toBeNull()
    }
  })

  it('expires Gravity Slam Restrained at target turn start while leaving Prone', () => {
    const board = {
      ...emptyEncounter(),
      combatants: [
        monster({ combatantId: 'caster' }),
        monster({ combatantId: 'target', effects: effects('gravity-slam') }),
      ],
      activeIndex: 0,
      round: 1,
    }
    const advanced = nextTurn(board)
    expect(advanced.combatants[1].effects.map((effect) => effect.name)).toEqual(['Prone'])
  })

  it.each(['sonic-blast', 'poison-light', 'rattle-bones'])(
    'clears %s at target turn end without clearing it at caster end',
    (slug) => {
      const board = {
        ...emptyEncounter(),
        combatants: [
          monster({ combatantId: 'caster' }),
          monster({ combatantId: 'target', effects: effects(slug) }),
        ],
        activeIndex: 0,
        round: 1,
      }
      const atTarget = nextTurn(board)
      expect(atTarget.combatants[1].effects.length).toBeGreaterThan(0)
      expect(nextTurn(atTarget).combatants[1].effects).toEqual([])
    },
  )

  it.each(['bewitching-phantom', 'irresistible-melody', 'wind-of-ruin'])(
    'clears %s when caster concentration ends and preserves unrelated effects',
    (slug) => {
      const unrelated = effects('sonic-blast')
      const board = {
        ...emptyEncounter(),
        combatants: [
          monster({
            combatantId: 'caster',
            concentration: { spell: card(slug).name, saveDc: 17, round: 1 },
          }),
          monster({ combatantId: 'target', effects: [...effects(slug), ...unrelated] }),
        ],
      }
      const ended = encounterReducer(board, { type: 'endConcentration', id: 'caster' })
      expect(ended.combatants[0].concentration).toBeNull()
      expect(ended.combatants[1].effects).toEqual(unrelated)
    },
  )

  it('keeps Wall of Misery curse after wall concentration ends', () => {
    const curse = effects('wall-of-misery')
    const board = {
      ...emptyEncounter(),
      combatants: [
        monster({
          combatantId: 'caster',
          concentration: { spell: card('wall-of-misery').name, saveDc: 17, round: 1 },
        }),
        monster({ combatantId: 'target', effects: curse }),
      ],
    }
    expect(
      encounterReducer(board, { type: 'endConcentration', id: 'caster' }).combatants[1].effects,
    ).toEqual(curse)
  })

  it('keeps Auric Lance incoming advantage until the caster’s next turn starts', () => {
    expect(effects('auric-lance')[0]).toMatchObject({
      source: 'caster',
      modifier: { applies: 'attackRolls', direction: 'incoming', mode: 'advantage' },
      duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
    })
  })

  it('has no remaining pending cards and rejects unreviewed forged identities', () => {
    expect(Object.keys(REFERENCE_ONLY_SPELLS)).toHaveLength(0)
    expect(
      Object.keys(REFERENCE_ONLY_SPELLS).every((id) => id.startsWith('kobold-press-deepm:')),
    ).toBe(true)
    expect(
      Object.keys(REFERENCE_ONLY_SPELLS).some((id) =>
        id.startsWith('somanyrobots-so-many-spells:'),
      ),
    ).toBe(false)
    for (const id of ['kobold-press-deepm:unreviewed-copy']) {
      const spell = { ...card('sonic-blast'), id, source: id.split(':')[0] } as Spell
      const forged = {
        ...spell,
        mechanics: { attackRoll: true, damage: [{ formula: '99d6', type: 'fire' as const }] },
      }
      expect(reviewedSpellCasting(forged)).toBeUndefined()
      expect(spellAction(forged, {})).toBeNull()
      expect(spellEffectFor(forged)).toBeNull()
    }
  })

  it.each([
    'beast-claw',
    'black-bolt',
    'bone-weaving',
    'chaotic-vortex',
    'cursed-coinage',
    'black-moon',
    'bony-maws',
    'ghastly-stampede',
    'gloamblast',
    'lightning-spike',
    'screaming-skull',
    'searing-hammer',
    'thunderous-chords',
    'volcanic-seep',
    'void-rift',
    'wheel-of-bone',
    'wall-of-bones',
    'wall-of-snow',
    'prismatic-shield',
    'summon-spider',
    'summon-fell-machine',
  ])(
    'does not guess attack choice, reduction bypass, random tables, or later triggers for %s',
    (slug) => {
      expect(spellAction(card(slug), {})).toBeNull()
      expect(damageVariants(card(slug))).toEqual([])
    },
  )
})
