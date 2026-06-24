// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import { describe, expect, it } from 'vitest'
import {
  mapDndApiMonster,
  mapDndApiSpell,
  type DndApiMonster,
  type DndApiSpell,
} from '../../src/compendium/dnd5eapi.ts'

const baseMonster = (over: Partial<DndApiMonster>): DndApiMonster => ({
  index: 'x',
  name: 'X',
  size: 'Medium',
  type: 'humanoid',
  hit_points: 10,
  strength: 10,
  dexterity: 10,
  constitution: 10,
  intelligence: 10,
  wisdom: 10,
  charisma: 10,
  ...over,
})

describe('mapDndApiMonster', () => {
  it('maps identity, abilities, saves/skills, hp formula, and tags source/edition', () => {
    const c = mapDndApiMonster(
      baseMonster({
        index: 'archmage',
        name: 'Archmage',
        size: 'Medium',
        type: 'Humanoid',
        challenge_rating: 12,
        xp: 8400,
        hit_points: 99,
        hit_points_roll: '18d8+18',
        armor_class: [{ type: 'dex', value: 12 }],
        intelligence: 20,
        wisdom: 15,
        proficiencies: [
          { value: 9, proficiency: { index: 'saving-throw-int', name: 'INT' } },
          { value: 6, proficiency: { index: 'saving-throw-wis', name: 'WIS' } },
          { value: 13, proficiency: { index: 'skill-arcana', name: 'Arcana' } },
        ],
        speed: { walk: '30 ft.' },
        senses: { passive_perception: 12 },
        languages: 'any six languages',
        damage_resistances: ['damage from spells', 'bludgeoning from nonmagical attacks'],
        condition_immunities: [{ index: 'charmed', name: 'charmed' }],
      }),
    )
    expect(c.id).toBe('srd-5.1:archmage')
    expect(c.source).toBe('srd-5.1')
    expect(c.edition).toBe('5.0')
    expect(c.type).toBe('humanoid')
    expect(c.ac).toBe(12)
    expect(c.maxHp).toBe(99)
    expect(c.hpFormula).toBe('18d8+18')
    expect(c.cr).toBe(12)
    expect(c.xp).toBe(8400)
    expect(c.saves).toEqual({ int: 9, wis: 6 })
    expect(c.skills).toEqual({ arcana: 13 })
    expect(c.speed).toEqual({ walk: 30 })
    // Defenses + languages are capitalized to match the 5.2 set.
    expect(c.languages).toEqual(['Any six languages'])
    expect(c.resistances).toEqual(['Damage from spells', 'Bludgeoning from nonmagical attacks'])
    expect(c.conditionImmunities).toEqual(['Charmed'])
  })

  it('lifts structured spellcasting into slots + groups (at-will, per level)', () => {
    const c = mapDndApiMonster(
      baseMonster({
        special_abilities: [
          {
            name: 'Spellcasting',
            desc: '…prepared:\n- 1st level (4 slots): magic missile\n* The archmage casts these spells on itself before combat.',
            spellcasting: {
              level: 18,
              ability: { index: 'int', name: 'INT' },
              dc: 17,
              modifier: 9,
              slots: { '1': 4, '3': 3, '9': 1 },
              spells: [
                { name: 'Fire Bolt', level: 0, url: '/api/2014/spells/fire-bolt' },
                { name: 'Disguise Self', level: 1, url: '/api/2014/spells/disguise-self', usage: { type: 'at will' } },
                { name: 'Magic Missile', level: 1, url: '/api/2014/spells/magic-missile' },
                { name: 'Counterspell', level: 3, url: '/api/2014/spells/counterspell' },
                { name: 'Time Stop', level: 9, url: '/api/2014/spells/time-stop' },
              ],
            },
          },
        ],
      }),
    )
    const sc = c.spellcasting!
    expect(sc.ability).toBe('int')
    expect(sc.saveDc).toBe(17)
    expect(sc.toHit).toBe(9)
    expect(sc.slots).toEqual({ '1': 4, '3': 3, '9': 1 })
    // at-will = cantrips + "at will" spells
    expect(sc.groups[0].usage).toEqual({ type: 'atWill' })
    expect(sc.groups[0].spells.map((s) => s.name)).toEqual(['Fire Bolt', 'Disguise Self'])
    // slot groups by ascending level, spells carry srd-5.1 refs
    expect(sc.groups[1].usage).toEqual({ type: 'slots', level: 1 })
    expect(sc.groups[1].spells[0]).toEqual({ name: 'Magic Missile', ref: 'srd-5.1:magic-missile' })
    expect(sc.groups[2].usage).toEqual({ type: 'slots', level: 3 })
    expect(sc.groups[3].usage).toEqual({ type: 'slots', level: 9 })
    // the footnote from the ability prose is captured as a note
    expect(sc.note).toBe('* The archmage casts these spells on itself before combat.')
    // the spellcasting ability is not also kept as a trait
    expect(c.traits).toBeUndefined()
  })

  it('maps actions: attack with typed damage, recharge save, and legendary cost; reads LR from usage', () => {
    const c = mapDndApiMonster(
      baseMonster({
        special_abilities: [
          { name: 'Legendary Resistance', desc: 'choose to succeed', usage: { type: 'per day', times: 3 } },
        ],
        actions: [
          {
            name: 'Bite',
            desc: 'Melee Weapon Attack: +14 to hit, reach 10 ft.',
            attack_bonus: 14,
            damage: [
              { damage_type: { index: 'piercing', name: 'Piercing' }, damage_dice: '2d10+8' },
              { damage_type: { index: 'fire', name: 'Fire' }, damage_dice: '2d6' },
            ],
          },
          {
            name: 'Fire Breath',
            desc: 'exhales fire',
            usage: { type: 'recharge on roll', dice: '1d6', min_value: 5 },
            dc: { dc_type: { index: 'dex', name: 'DEX' }, dc_value: 21, success_type: 'half' },
            damage: [{ damage_type: { index: 'fire', name: 'Fire' }, damage_dice: '18d6' }],
          },
        ],
        legendary_actions: [
          { name: 'Wing Attack (Costs 2 Actions)', desc: 'beats its wings' },
        ],
      }),
    )
    expect(c.legendaryResistance).toBe(3)

    const bite = c.actions![0]
    expect(bite).toMatchObject({ kind: 'melee', toHit: 14, reach: 10 })
    expect(bite.damage).toEqual([
      { formula: '2d10+8', type: 'piercing' },
      { formula: '2d6', type: 'fire' },
    ])

    const breath = c.actions![1]
    expect(breath.kind).toBe('save')
    expect(breath.recharge).toEqual({ type: 'dice', value: 5 })
    expect(breath.save).toEqual({ ability: 'dex', dc: 21, onSave: 'half' })

    const la = c.legendaryActions!.actions[0]
    expect(la.name).toBe('Wing Attack')
    expect(la.legendaryCost).toBe(2)
  })
})

describe('mapDndApiSpell', () => {
  it('maps a damage+save spell with slot scaling', () => {
    const s = mapDndApiSpell({
      index: 'fireball',
      name: 'Fireball',
      level: 3,
      school: { index: 'evocation', name: 'Evocation' },
      casting_time: '1 action',
      range: '150 feet',
      duration: 'Instantaneous',
      concentration: false,
      ritual: false,
      components: ['V', 'S', 'M'],
      material: 'A tiny ball of bat guano and sulfur.',
      desc: ['A bright streak…'],
      higher_level: ['…increases by 1d6…'],
      classes: [{ index: 'wizard', name: 'Wizard' }],
      damage: {
        damage_type: { index: 'fire', name: 'Fire' },
        damage_at_slot_level: { '3': '8d6', '4': '9d6', '5': '10d6' },
      },
      dc: { dc_type: { index: 'dex', name: 'DEX' }, dc_success: 'half' },
    } as DndApiSpell)

    expect(s.id).toBe('srd-5.1:fireball')
    expect(s.level).toBe(3)
    expect(s.components).toMatchObject({ verbal: true, somatic: true, material: true })
    expect(s.mechanics?.damage).toEqual([{ formula: '8d6', type: 'fire' }])
    expect(s.mechanics?.save).toEqual({ ability: 'dex', onSave: 'half' })
    expect(s.mechanics?.scaling).toEqual([
      { level: 4, by: 'slot', damage: [{ formula: '9d6', type: 'fire' }] },
      { level: 5, by: 'slot', damage: [{ formula: '10d6', type: 'fire' }] },
    ])
    expect(s.text).toContain('At Higher Levels:')
  })
})
