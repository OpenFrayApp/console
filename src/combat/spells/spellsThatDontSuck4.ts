// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { boardEffect, sourceProfile } from './reviewedProfile.ts'

export const SPELLS_THAT_DONT_SUCK_4: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-spells-that-dont-suck:injunction': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Injunction',
    {
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
      effect: boardEffect(
        'Injunction',
        [{ condition: 'Charmed' }, { note: 'Disobeying: −5d10 current/max HP once per turn' }],
        {
          summary: 'Charmed; Disobeying: −5d10 current/max HP once per turn',
          targeting: 'enemy',
          multi: false,
        },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:irradiate': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Irradiate',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:lashing-vine': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Lashing Vine',
    {
      mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    },
  ),
  'somanyrobots-spells-that-dont-suck:life-drain': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Life Drain',
    {
      mechanics: {
        attackRoll: true,
        damage: [{ formula: '3d6', type: 'necrotic' }],
        scaling: [
          { by: 'slot', level: 7, damage: [{ formula: '4d6', type: 'necrotic' }] },
          { by: 'slot', level: 8, damage: [{ formula: '4d6', type: 'necrotic' }] },
          { by: 'slot', level: 9, damage: [{ formula: '5d6', type: 'necrotic' }] },
        ],
      },
    },
  ),
  'somanyrobots-spells-that-dont-suck:lightning-beam': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Lightning Beam',
    {
      mechanics: {
        save: { ability: 'dex', onSave: 'half' },
        damage: [{ formula: '4d12', type: 'lightning' }],
        scaling: [
          { by: 'slot', level: 4, damage: [{ formula: '5d12', type: 'lightning' }] },
          { by: 'slot', level: 5, damage: [{ formula: '6d12', type: 'lightning' }] },
          { by: 'slot', level: 6, damage: [{ formula: '7d12', type: 'lightning' }] },
          { by: 'slot', level: 7, damage: [{ formula: '8d12', type: 'lightning' }] },
          { by: 'slot', level: 8, damage: [{ formula: '9d12', type: 'lightning' }] },
          { by: 'slot', level: 9, damage: [{ formula: '10d12', type: 'lightning' }] },
        ],
      },
    },
  ),
  'somanyrobots-spells-that-dont-suck:lightning-leash': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Lightning Leash',
    {
      attackKind: 'melee',
      mechanics: {
        attackRoll: true,
        damage: [{ formula: '1d6', type: 'lightning' }],
        scaling: [
          { by: 'character', level: 5, damage: [{ formula: '2d6', type: 'lightning' }] },
          { by: 'character', level: 11, damage: [{ formula: '3d6', type: 'lightning' }] },
          { by: 'character', level: 17, damage: [{ formula: '4d6', type: 'lightning' }] },
        ],
      },
      effect: boardEffect(
        'Lightning Leash',
        [
          {
            note: 'Leaving 30 ft can trigger lightning',
            duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
          },
        ],
        { summary: 'Leaving 30 ft can trigger lightning', targeting: 'enemy', multi: false },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:lightning-tendril': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Lightning Tendril',
    {
      effect: boardEffect(
        'Lightning Tendril',
        [{ note: 'Action: 1d12 lightning to one creature' }],
        { summary: 'Action: 1d12 lightning to one creature', targeting: 'self', multi: false },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:luminous-smite': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Luminous Smite',
    {
      effect: boardEffect(
        'Luminous Smite',
        [{ note: 'Next melee hit: +2d8 radiant; glowing target' }],
        {
          summary: 'Next melee hit: +2d8 radiant; glowing target',
          targeting: 'self',
          multi: false,
        },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:lunar-beam': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Lunar Beam',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:magic-fruit': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Magic Fruit',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:magic-net': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Magic Net',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:manipulate-earth': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Manipulate Earth',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:manipulate-fire': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Manipulate Fire',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:manipulate-water': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Manipulate Water',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:manipulate-wind': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Manipulate Wind',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:martial-transformation': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Martial Transformation',
    {
      effect: boardEffect(
        'Martial Transformation',
        [{ note: 'Weapon advantage; +2d12 force; cannot cast' }],
        { summary: 'Weapon advantage; +2d12 force; cannot cast', targeting: 'self', multi: false },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:mass-freeze': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Mass Freeze',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'half' },
        damage: [{ formula: '4d8', type: 'cold' }],
      },
      effect: boardEffect(
        'Mass Freeze',
        [
          { condition: 'Restrained', duration: 'escape' },
          { note: 'Turn start: 1d8 cold', duration: 'escape' },
        ],
        { summary: 'Restrained; Turn start: 1d8 cold', targeting: 'enemy', multi: true },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:mind-link': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Mind Link',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:minor-drain': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Minor Drain',
    {
      mechanics: {
        attackRoll: true,
        damage: [{ formula: '3d6', type: 'necrotic' }],
        scaling: [
          { by: 'slot', level: 2, damage: [{ formula: '4d6', type: 'necrotic' }] },
          { by: 'slot', level: 3, damage: [{ formula: '5d6', type: 'necrotic' }] },
          { by: 'slot', level: 4, damage: [{ formula: '6d6', type: 'necrotic' }] },
          { by: 'slot', level: 5, damage: [{ formula: '7d6', type: 'necrotic' }] },
          { by: 'slot', level: 6, damage: [{ formula: '8d6', type: 'necrotic' }] },
          { by: 'slot', level: 7, damage: [{ formula: '9d6', type: 'necrotic' }] },
          { by: 'slot', level: 8, damage: [{ formula: '10d6', type: 'necrotic' }] },
          { by: 'slot', level: 9, damage: [{ formula: '11d6', type: 'necrotic' }] },
        ],
      },
    },
  ),
  'somanyrobots-spells-that-dont-suck:misdirection': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Misdirection',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:misfortune': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Misfortune',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:morph-earth': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Morph Earth',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:muddy-servant': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Muddy Servant',
    {
      persistsAfterSave: true,
      mechanics: {
        save: { ability: 'str', onSave: 'negates' },
        damage: [{ formula: '2d6', type: 'bludgeoning' }],
      },
      effect: boardEffect(
        'Muddy Servant',
        [{ condition: 'Restrained', duration: { type: 'rounds', rounds: 10 } }],
        { summary: 'Restrained', targeting: 'enemy', multi: false },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:nature-s-fury': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    "Nature's Fury",
    {},
  ),
  'somanyrobots-spells-that-dont-suck:nature-s-protection': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    "Nature's Protection",
    {
      effect: boardEffect("Nature's Protection", [{ note: 'Aura: three-quarters cover' }], {
        summary: 'Aura: three-quarters cover',
        targeting: 'self',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:necromantic-infusion': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Necromantic Infusion',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:necromantic-storm': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Necromantic Storm',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'half' },
        damage: [{ formula: '6d8', type: 'necrotic' }],
      },
    },
  ),
  'somanyrobots-spells-that-dont-suck:necrotic-sphere': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Necrotic Sphere',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'half' },
        damage: [{ formula: '8d8', type: 'necrotic' }],
      },
    },
  ),
  'somanyrobots-spells-that-dont-suck:oakenhide': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Oakenhide',
    {
      effect: boardEffect(
        'Oakenhide',
        [
          {
            note: 'Turn start: 6 temp HP; AC 15 + Dex while held',
            duration: { type: 'rounds', rounds: 10 },
          },
        ],
        {
          summary: 'Turn start: 6 temp HP; AC 15 + Dex while held',
          targeting: 'self',
          multi: false,
        },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:petrify': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Petrify',
    {},
  ),
}
