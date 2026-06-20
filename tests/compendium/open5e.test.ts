// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import {
  mapOpen5eCreature,
  mapOpen5eSpell,
  mapSource,
  slugFromKey,
  type Open5eCreature,
  type Open5eSpell,
} from '../../src/compendium/open5e.ts'

// Trimmed from the real Open5e v2 srd-2024 "Acid Arrow" record.
const ACID_ARROW: Open5eSpell = {
  key: 'srd-2024_acid-arrow',
  document: { key: 'srd-2024' },
  name: 'Acid Arrow',
  desc: 'A shimmering green arrow streaks toward a target.',
  higher_level: 'The damage increases by 1d4 for each slot level above 2.',
  level: 2,
  school: { name: 'Evocation' },
  classes: [{ name: 'Wizard' }],
  casting_time: 'action',
  range_text: '90 feet',
  duration: 'instantaneous',
  concentration: false,
  ritual: false,
  verbal: true,
  somatic: true,
  material: true,
  material_specified: 'powdered rhubarb leaf',
}

describe('mapSource', () => {
  it('maps SRD document keys to source + edition', () => {
    expect(mapSource('srd-2024')).toEqual({ source: 'srd-5.2', edition: '5.5' })
    expect(mapSource('srd-2014')).toEqual({ source: 'srd-5.1', edition: '5.0' })
  })

  it('passes through third-party document keys', () => {
    expect(mapSource('tob')).toEqual({ source: 'tob' })
  })
})

describe('slugFromKey', () => {
  it('strips the document prefix', () => {
    expect(slugFromKey('srd-2024_acid-arrow', 'srd-2024')).toBe('acid-arrow')
  })
})

describe('mapOpen5eSpell', () => {
  it('maps an Open5e v2 spell into the schema', () => {
    const spell = mapOpen5eSpell(ACID_ARROW)
    expect(spell.id).toBe('srd-5.2:acid-arrow')
    expect(spell.source).toBe('srd-5.2')
    expect(spell.edition).toBe('5.5')
    expect(spell.name).toBe('Acid Arrow')
    expect(spell.level).toBe(2)
    expect(spell.school).toBe('Evocation')
    expect(spell.range).toBe('90 feet')
    expect(spell.components).toEqual({
      verbal: true,
      somatic: true,
      material: true,
      materials: 'powdered rhubarb leaf',
    })
    expect(spell.classes).toEqual(['Wizard'])
    expect(spell.text).toContain('At Higher Levels:')
  })

  it('omits the higher-level note when absent', () => {
    const spell = mapOpen5eSpell({ ...ACID_ARROW, higher_level: null })
    expect(spell.text).not.toContain('At Higher Levels:')
  })
})

// Trimmed from the real Open5e v2 srd-2024 "Aboleth" record.
const ABOLETH: Open5eCreature = {
  key: 'srd-2024_aboleth',
  document: { key: 'srd-2024' },
  name: 'Aboleth',
  size: { name: 'Large' },
  type: { name: 'Aberration' },
  armor_class: 17,
  hit_points: 150,
  hit_dice: '20d10 + 40',
  challenge_rating: 10,
  ability_scores: {
    strength: 21,
    dexterity: 9,
    constitution: 15,
    intelligence: 18,
    wisdom: 15,
    charisma: 18,
  },
  speed: { walk: 10, unit: 'feet', swim: 40 },
  saving_throws_all: { dexterity: 3, constitution: 6, intelligence: 8, wisdom: 6 },
  passive_perception: 20,
  darkvision_range: 120,
  blindsight_range: null,
  armor_detail: 'natural armor',
  initiative_bonus: 7,
  skill_bonuses: { perception: 10, animal_handling: 4 },
  languages: {
    as_string: 'Deep Speech',
    data: [{ name: 'Deep Speech' }, { name: 'Telepathy 120 ft.' }],
  },
  resistances_and_immunities: {
    damage_resistances: [{ name: 'Acid' }],
    damage_immunities: [],
    damage_vulnerabilities: [],
    condition_immunities: [{ name: 'Charmed' }],
  },
  traits: [{ name: 'Amphibious', desc: 'The aboleth can breathe air and water.' }],
  actions: [
    {
      name: 'Tentacle',
      action_type: 'ACTION',
      desc: 'Melee Attack Roll: +9, reach 15 ft. 12 (2d6 + 5) Bludgeoning damage.',
      attacks: [
        {
          to_hit_mod: 9,
          reach: 15,
          range: null,
          long_range: null,
          damage_die_count: 2,
          damage_die_type: 'D6',
          damage_bonus: 5,
          damage_type: null,
          extra_damage_die_count: null,
          extra_damage_die_type: null,
          extra_damage_bonus: null,
          extra_damage_type: { name: 'Bludgeoning' },
        },
      ],
    },
    {
      name: 'Consume Memories',
      action_type: 'ACTION',
      desc: 'Intelligence Saving Throw: DC 16, one creature within 30 feet. Failure: 10 (3d6) Psychic damage. Success: Half damage.',
      attacks: [],
    },
    {
      name: 'Rend',
      action_type: 'ACTION',
      desc: 'Melee Attack Roll: +11, reach 10 ft. 13 (2d6 + 6) Slashing damage plus 4 (1d8) Acid damage.',
      attacks: [
        {
          to_hit_mod: 11,
          reach: 10,
          range: null,
          long_range: null,
          damage_die_count: 2,
          damage_die_type: 'D6',
          damage_bonus: 6,
          damage_type: { name: 'Slashing' },
          extra_damage_die_count: 1,
          extra_damage_die_type: 'D8',
          extra_damage_bonus: 0,
          extra_damage_type: { name: 'Acid' },
        },
      ],
    },
    { name: 'Nimble Dodge', action_type: 'BONUS_ACTION', desc: 'The aboleth slips aside.', attacks: [] },
    { name: 'Psychic Drain', action_type: 'LEGENDARY_ACTION', desc: 'It drains a mind.', attacks: [] },
  ],
}

describe('mapOpen5eCreature', () => {
  const c = mapOpen5eCreature(ABOLETH)

  it('maps the clean stat-block fields', () => {
    expect(c.id).toBe('srd-5.2:aboleth')
    expect(c.edition).toBe('5.5')
    expect(c.size).toBe('Large')
    expect(c.type).toBe('aberration')
    expect(c.ac).toBe(17)
    expect(c.maxHp).toBe(150)
    expect(c.hpFormula).toBe('20d10+40')
    expect(c.cr).toBe(10)
    expect(c.abilities).toEqual({ str: 21, dex: 9, con: 15, int: 18, wis: 15, cha: 18 })
    expect(c.speed).toEqual({ walk: 10, swim: 40 })
    expect(c.saves).toEqual({ dex: 3, con: 6, int: 8, wis: 6 })
    expect(c.senses).toEqual({ passivePerception: 20, darkvision: 120 })
  })

  it('partitions actions by type', () => {
    expect(c.actions?.map((a) => a.name)).toEqual(['Tentacle', 'Consume Memories', 'Rend'])
    expect(c.bonusActions?.map((a) => a.name)).toEqual(['Nimble Dodge'])
    expect(c.legendaryActions?.actions.map((a) => a.name)).toEqual(['Psychic Drain'])
    expect(c.legendaryActions?.perRound).toBe(3)
    expect(c.reactions).toBeUndefined()
  })

  it('maps traits', () => {
    expect(c.traits).toEqual([
      { name: 'Amphibious', text: 'The aboleth can breathe air and water.' },
    ])
  })

  it('maps defenses, skills, languages, initiative, and armor detail', () => {
    expect(c.armorDetail).toBe('natural armor')
    expect(c.initiative).toBe(7)
    expect(c.skills).toEqual({ perception: 10, animalHandling: 4 })
    expect(c.languages).toEqual(['Deep Speech', 'Telepathy 120 ft.'])
    expect(c.resistances).toEqual(['Acid'])
    expect(c.conditionImmunities).toEqual(['Charmed'])
    expect(c.immunities).toBeUndefined()
    expect(c.vulnerabilities).toBeUndefined()
  })

  it('keeps only proficient saves (bonus differs from the ability modifier)', () => {
    // dex 9 (mod -1) save 3, con 15 (+2) save 6, int 18 (+4) save 8, wis 15 (+2) save 6
    expect(c.saves).toEqual({ dex: 3, con: 6, int: 8, wis: 6 })
  })

  it('maps a structured attack action', () => {
    const tentacle = c.actions?.find((a) => a.name === 'Tentacle')
    expect(tentacle?.kind).toBe('melee')
    expect(tentacle?.toHit).toBe(9)
    expect(tentacle?.reach).toBe(15)
    // single-damage quirk: type resolved from extra_damage_type
    expect(tentacle?.damage).toEqual([{ formula: '2d6+5', type: 'bludgeoning' }])
  })

  it('maps a two-damage attack', () => {
    const rend = c.actions?.find((a) => a.name === 'Rend')
    expect(rend?.damage).toEqual([
      { formula: '2d6+6', type: 'slashing' },
      { formula: '1d8', type: 'acid' },
    ])
  })

  it('parses a save action from prose', () => {
    const save = c.actions?.find((a) => a.name === 'Consume Memories')
    expect(save?.kind).toBe('save')
    expect(save?.toHit).toBeNull()
    expect(save?.save).toEqual({ ability: 'int', dc: 16, onSave: 'half' })
    expect(save?.damage).toEqual([{ formula: '3d6', type: 'psychic' }])
  })
})
