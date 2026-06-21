// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import {
  makeSpellLinker,
  mapOpen5eAction,
  mapOpen5eCreature,
  mapOpen5eSpell,
  mapSource,
  parseSpellcasting,
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

  it('leaves mechanics undefined for a spell with no damage/save/attack', () => {
    expect(mapOpen5eSpell(ACID_ARROW).mechanics).toBeUndefined()
  })
})

// Trimmed from the real Open5e v2 srd-2024 records, with the structured fields.
const FIREBALL: Open5eSpell = {
  key: 'srd-2024_fireball',
  document: { key: 'srd-2024' },
  name: 'Fireball',
  desc: 'Each creature in a 20-foot-radius Sphere makes a Dexterity saving throw, taking 8d6 Fire damage on a failed save or half as much damage on a successful one.',
  higher_level: 'The damage increases by 1d6 for each spell slot level above 3.',
  level: 3,
  school: { name: 'Evocation' },
  classes: [{ name: 'Wizard' }],
  casting_time: 'action',
  range_text: '150 feet',
  duration: 'instantaneous',
  concentration: false,
  ritual: false,
  verbal: true,
  somatic: true,
  material: true,
  material_specified: 'a ball of bat guano and sulfur',
  damage_roll: '8d6',
  damage_types: ['fire'],
  saving_throw_ability: 'dexterity',
  attack_roll: false,
  casting_options: [
    { type: 'slot_level_4', damage_roll: '9d6' },
    { type: 'slot_level_5', damage_roll: '10d6' },
  ],
}

const FIRE_BOLT: Open5eSpell = {
  key: 'srd-2024_fire-bolt',
  document: { key: 'srd-2024' },
  name: 'Fire Bolt',
  desc: 'You hurl a mote of fire. Make a ranged spell attack.',
  higher_level: null,
  level: 0,
  school: { name: 'Evocation' },
  classes: [{ name: 'Wizard' }],
  casting_time: 'action',
  range_text: '120 feet',
  duration: 'instantaneous',
  concentration: false,
  ritual: false,
  verbal: true,
  somatic: true,
  material: false,
  material_specified: null,
  damage_roll: '1d10',
  damage_types: ['fire'],
  saving_throw_ability: '',
  attack_roll: true,
  casting_options: [{ type: 'player_level_5', damage_roll: '2d10' }],
}

describe('mapOpen5eSpell — mechanics', () => {
  it('captures save, typed damage, and slot-level scaling for a save spell', () => {
    const { mechanics } = mapOpen5eSpell(FIREBALL)
    expect(mechanics).toBeDefined()
    expect(mechanics?.damage).toEqual([{ formula: '8d6', type: 'fire' }])
    expect(mechanics?.save).toEqual({ ability: 'dex', onSave: 'half' })
    expect(mechanics?.attackRoll).toBeUndefined()
    expect(mechanics?.scaling).toEqual([
      { level: 4, by: 'slot', damage: [{ formula: '9d6', type: 'fire' }] },
      { level: 5, by: 'slot', damage: [{ formula: '10d6', type: 'fire' }] },
    ])
  })

  it('does not put the save DC on the spell (the caster owns it)', () => {
    const save = mapOpen5eSpell(FIREBALL).mechanics?.save
    expect(save && 'dc' in save).toBe(false)
  })

  it('leaves onSave undefined when the damage spell text is not readable', () => {
    const save = mapOpen5eSpell({
      ...FIREBALL,
      desc: 'A burst of raw energy erupts. Each creature makes a Dexterity saving throw.',
    }).mechanics?.save
    expect(save).toEqual({ ability: 'dex' })
  })

  it('marks a save-with-no-damage spell as negates', () => {
    const save = mapOpen5eSpell({
      ...FIREBALL,
      desc: 'The target makes a Wisdom saving throw or is paralyzed.',
      damage_roll: null,
      damage_types: null,
      saving_throw_ability: 'wisdom',
      casting_options: null,
    }).mechanics?.save
    expect(save).toEqual({ ability: 'wis', onSave: 'negates' })
  })

  it('captures an attack roll and character-level scaling for a cantrip', () => {
    const { mechanics } = mapOpen5eSpell(FIRE_BOLT)
    expect(mechanics?.attackRoll).toBe(true)
    expect(mechanics?.save).toBeUndefined()
    expect(mechanics?.damage).toEqual([{ formula: '1d10', type: 'fire' }])
    expect(mechanics?.scaling).toEqual([
      { level: 5, by: 'character', damage: [{ formula: '2d10', type: 'fire' }] },
    ])
  })

  it('ignores a spurious attack_roll on a no-damage spell (Invisibility et al.)', () => {
    // Open5e flags many non-attack spells (Invisibility, Bless, Faerie Fire) with
    // attack_roll=true by keyword-matching "attack" in the prose. With no damage,
    // there's nothing to resolve, so the spell has no mechanics at all.
    const spell = mapOpen5eSpell({
      ...FIRE_BOLT,
      name: 'Invisibility',
      desc: 'A creature you touch has the Invisible condition. It ends if the target makes an attack roll.',
      damage_roll: null,
      damage_types: [],
      saving_throw_ability: '',
      attack_roll: true,
      casting_options: null,
    })
    expect(spell.mechanics).toBeUndefined()
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
  experience_points: 5900,
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
      order_in_statblock: 1,
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
      order_in_statblock: 0,
      usage_limits: { type: 'RECHARGE_ON_ROLL', param: 5 },
      desc: 'Intelligence Saving Throw: DC 16, one creature within 30 feet. Failure: 10 (3d6) Psychic damage. Success: Half damage.',
      attacks: [],
    },
    {
      name: 'Rend',
      action_type: 'ACTION',
      order_in_statblock: 2,
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

  it('partitions actions by type, ordered by order_in_statblock', () => {
    expect(c.actions?.map((a) => a.name)).toEqual(['Consume Memories', 'Tentacle', 'Rend'])
    expect(c.bonusActions?.map((a) => a.name)).toEqual(['Nimble Dodge'])
    expect(c.legendaryActions?.actions.map((a) => a.name)).toEqual(['Psychic Drain'])
    expect(c.legendaryActions?.perRound).toBe(3)
    expect(c.reactions).toBeUndefined()
  })

  it('captures an action recharge', () => {
    const recharging = c.actions?.find((a) => a.name === 'Consume Memories')
    expect(recharging?.recharge).toEqual({ type: 'dice', value: 5 })
  })

  it('maps traits', () => {
    expect(c.traits).toEqual([
      { name: 'Amphibious', text: 'The aboleth can breathe air and water.' },
    ])
  })

  it('maps defenses, skills, languages, initiative, and XP', () => {
    expect(c.xp).toBe(5900)
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

  it('maps a legendary action cost above 1, leaving the default (1) unset', () => {
    expect(mapOpen5eAction({ name: 'Wing', action_type: 'LEGENDARY_ACTION', desc: 'Flap.', legendary_action_cost: 2 }).legendaryCost).toBe(2)
    expect(mapOpen5eAction({ name: 'Tail', action_type: 'LEGENDARY_ACTION', desc: 'Swipe.', legendary_action_cost: 1 }).legendaryCost).toBeUndefined()
  })

  it('parses a save action from prose', () => {
    const save = c.actions?.find((a) => a.name === 'Consume Memories')
    expect(save?.kind).toBe('save')
    expect(save?.toHit).toBeNull()
    expect(save?.save).toEqual({ ability: 'int', dc: 16, onSave: 'half' })
    expect(save?.damage).toEqual([{ formula: '3d6', type: 'psychic' }])
  })

  it('extracts area damage from a save-less action (Deathly Teleport)', () => {
    const teleport = mapOpen5eCreature({
      ...ABOLETH,
      actions: [
        {
          name: 'Deathly Teleport',
          action_type: 'ACTION',
          order_in_statblock: 0,
          desc: 'The lich teleports up to 60 feet, and each creature within 10 feet of the space it left takes 11 (2d10) Necrotic damage.',
          attacks: [],
        },
      ],
    }).actions?.[0]
    expect(teleport?.toHit).toBeNull()
    expect(teleport?.save).toBeUndefined()
    expect(teleport?.damage).toEqual([{ formula: '2d10', type: 'necrotic' }])
  })

  it('tracks Legendary Resistance per day, plus the higher in-lair count', () => {
    const lich = mapOpen5eCreature({
      ...ABOLETH,
      traits: [
        {
          name: 'Legendary Resistance (4/Day, or 5/Day in Lair)',
          desc: 'If the lich fails a saving throw, it can choose to succeed instead.',
        },
      ],
    })
    expect(lich.legendaryResistance).toBe(4)
    expect(lich.legendaryResistanceLair).toBe(5)
  })

  it('leaves the lair count undefined when the creature has no lair clause', () => {
    const c2 = mapOpen5eCreature({
      ...ABOLETH,
      traits: [
        { name: 'Legendary Resistance (3/Day)', desc: 'It can choose to succeed instead.' },
      ],
    })
    expect(c2.legendaryResistance).toBe(3)
    expect(c2.legendaryResistanceLair).toBeUndefined()
  })
})

describe('parseSpellcasting', () => {
  const MAGE =
    'The mage casts one of the following spells, using Intelligence as the spellcasting ability (spell save DC 14):\n\n' +
    '- **At Will:** Detect Magic, Light, Mage Armor, Mage Hand, Prestidigitation\n' +
    '- **2/Day Each:** Fireball, Invisibility\n' +
    '- **1/Day Each:** Cone of Cold, Fly'

  it('parses the caster header — ability and save DC', () => {
    const sc = parseSpellcasting(MAGE, 'srd-5.2')
    expect(sc?.ability).toBe('int')
    expect(sc?.saveDc).toBe(14)
    expect(sc?.toHit).toBeUndefined()
  })

  it('groups spells by usage in stat-block order, with per-day counts', () => {
    const sc = parseSpellcasting(MAGE, 'srd-5.2')!
    expect(sc.groups.map((g) => g.usage)).toEqual([
      { type: 'atWill' },
      { type: 'perDay', per: 2 },
      { type: 'perDay', per: 1 },
    ])
    expect(sc.groups[1].spells).toEqual([
      { name: 'Fireball', ref: 'srd-5.2:fireball' },
      { name: 'Invisibility', ref: 'srd-5.2:invisibility' },
    ])
    // The ref is built within the given source, so 5.1 content keys differently.
    expect(parseSpellcasting(MAGE, 'srd-5.1')!.groups[1].spells[0].ref).toBe('srd-5.1:fireball')
  })

  it('captures a spell attack bonus when the block lists one', () => {
    const sc = parseSpellcasting(
      'casts using Charisma as the spellcasting ability (spell save DC 17, +9 to hit with spell attacks):\n\n- **At Will:** Fire Bolt',
      'srd-5.2',
    )
    expect(sc?.toHit).toBe(9)
    expect(sc?.saveDc).toBe(17)
  })

  it('drops an empty usage line (e.g. an unused "At Will:")', () => {
    const oni =
      'The oni casts, using Charisma as the spellcasting ability (spell save DC 13):\n\n' +
      '- **At Will:**\n' +
      '- **1/Day Each:** Charm Person, Darkness, Gaseous Form, Sleep'
    const sc = parseSpellcasting(oni, 'srd-5.2')!
    expect(sc.groups).toHaveLength(1)
    expect(sc.groups[0].usage).toEqual({ type: 'perDay', per: 1 })
    expect(sc.groups[0].spells).toHaveLength(4)
  })

  it('returns undefined for prose with no usage groups', () => {
    expect(
      parseSpellcasting('The pit fiend casts Fireball (level 5 version) twice.', 'srd-5.2'),
    ).toBeUndefined()
  })

  it('links spell names in cast-prose, leaving non-spell words alone', () => {
    const link = makeSpellLinker([
      { name: 'Command', ref: 'srd-5.2:command' },
      { name: 'Counterspell', ref: 'srd-5.2:counterspell' },
      { name: 'Shield', ref: 'srd-5.2:shield' },
    ])
    expect(link('The dragon uses Spellcasting to cast Command (level 2 version).')).toBe(
      'The dragon uses Spellcasting to cast [Command](spell:srd-5.2:command) (level 2 version).',
    )
    expect(link('The archmage casts Counterspell or Shield.')).toBe(
      'The archmage casts [Counterspell](spell:srd-5.2:counterspell) or [Shield](spell:srd-5.2:shield).',
    )
  })

  it('does not link spell names outside cast-prose (avoids common-word false hits)', () => {
    const link = makeSpellLinker([{ name: 'Shield', ref: 'srd-5.2:shield' }])
    // No "cast" in the sentence → left untouched even though "Shield" is a spell name.
    expect(link('The knight raises its Shield as a bonus action.')).toBe(
      'The knight raises its Shield as a bonus action.',
    )
  })

  it('lifts spellcasting off the actions and drops the prose action', () => {
    const caster = mapOpen5eCreature({
      ...ABOLETH,
      actions: [
        ...ABOLETH.actions!,
        {
          name: 'Spellcasting',
          action_type: 'ACTION',
          order_in_statblock: 5,
          desc: MAGE,
          attacks: [],
        },
      ],
    })
    expect(caster.spellcasting?.groups).toHaveLength(3)
    expect(caster.actions?.some((a) => a.name === 'Spellcasting')).toBe(false)
  })
})
