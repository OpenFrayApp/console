// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { boardEffect, sourceProfile } from './reviewedProfile.ts'

export const SPELLS_THAT_DONT_SUCK_6: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-spells-that-dont-suck:spell-glyph': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Spell Glyph',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:spirit-remnant': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Spirit Remnant',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:spreadshot': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Spreadshot',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:stinging-insects': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Stinging Insects',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'negates' },
        damage: [
          { formula: '1d4', type: 'piercing' },
          { formula: '1d4', type: 'poison' },
        ],
        scaling: [
          {
            by: 'character',
            level: 5,
            damage: [
              { formula: '2d4', type: 'piercing' },
              { formula: '2d4', type: 'poison' },
            ],
          },
          {
            by: 'character',
            level: 11,
            damage: [
              { formula: '3d4', type: 'piercing' },
              { formula: '3d4', type: 'poison' },
            ],
          },
          {
            by: 'character',
            level: 17,
            damage: [
              { formula: '4d4', type: 'piercing' },
              { formula: '4d4', type: 'poison' },
            ],
          },
        ],
      },
    },
  ),
  'somanyrobots-spells-that-dont-suck:stone-pact': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Stone Pact',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:stormcloud': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Stormcloud',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:stream-of-flame': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Stream of Flame',
    {
      mechanics: {
        save: { ability: 'dex', onSave: 'half' },
        damage: [{ formula: '4d8', type: 'fire' }],
        scaling: [
          { by: 'slot', level: 3, damage: [{ formula: '5d8', type: 'fire' }] },
          { by: 'slot', level: 4, damage: [{ formula: '6d8', type: 'fire' }] },
          { by: 'slot', level: 5, damage: [{ formula: '7d8', type: 'fire' }] },
          { by: 'slot', level: 6, damage: [{ formula: '8d8', type: 'fire' }] },
          { by: 'slot', level: 7, damage: [{ formula: '9d8', type: 'fire' }] },
          { by: 'slot', level: 8, damage: [{ formula: '10d8', type: 'fire' }] },
          { by: 'slot', level: 9, damage: [{ formula: '11d8', type: 'fire' }] },
        ],
      },
    },
  ),
  'somanyrobots-spells-that-dont-suck:summon-animal-spirit': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Summon Animal Spirit',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:summon-golem': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Summon Golem',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:summon-grave-spirit': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Summon Grave Spirit',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:symbol-of-resilience': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Symbol of Resilience',
    {
      effect: boardEffect(
        'Symbol of Resilience',
        [{ note: 'Symbol: Wis save advantage; maximum healing' }],
        { summary: 'Symbol: Wis save advantage; maximum healing', targeting: 'self', multi: false },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:synaptic-shockwave': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Synaptic Shockwave',
    {
      mechanics: {
        save: { ability: 'int', onSave: 'half' },
        damage: [{ formula: '10d8', type: 'psychic' }],
      },
      effect: boardEffect(
        'Synaptic Shockwave',
        [
          {
            condition: 'Stunned',
            duration: { type: 'manual' },
            durationNote: 'Until escape save or Intelligence reaches 0',
          },
          {
            note: 'Turn end: Intelligence drains; 0 Intelligence dies',
            duration: { type: 'manual' },
            durationNote: 'Until escape save or Intelligence reaches 0',
          },
        ],
        {
          summary: 'Stunned; Turn end: Intelligence drains; 0 Intelligence dies',
          targeting: 'enemy',
          multi: true,
        },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:synaptic-spear': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Synaptic Spear',
    {
      mechanics: {
        save: { ability: 'int', onSave: 'half' },
        damage: [{ formula: '6d8', type: 'psychic' }],
        scaling: [
          { by: 'slot', level: 5, damage: [{ formula: '7d8', type: 'psychic' }] },
          { by: 'slot', level: 6, damage: [{ formula: '8d8', type: 'psychic' }] },
          { by: 'slot', level: 7, damage: [{ formula: '9d8', type: 'psychic' }] },
          { by: 'slot', level: 8, damage: [{ formula: '10d8', type: 'psychic' }] },
          { by: 'slot', level: 9, damage: [{ formula: '11d8', type: 'psychic' }] },
        ],
      },
      effect: boardEffect(
        'Synaptic Spear',
        [
          { condition: 'Blinded', duration: { type: 'untilSourceTurn', when: 'endOfTurn' } },
          { condition: 'Deafened', duration: { type: 'untilSourceTurn', when: 'endOfTurn' } },
        ],
        { summary: 'Blinded; Deafened', targeting: 'enemy', multi: false },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:tempest': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Tempest',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:thought-wisp': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Thought Wisp',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:thunder-burst': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Thunder Burst',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'negates' },
        damage: [{ formula: '1d8', type: 'thunder' }],
        scaling: [
          { by: 'character', level: 5, damage: [{ formula: '2d8', type: 'thunder' }] },
          { by: 'character', level: 11, damage: [{ formula: '3d8', type: 'thunder' }] },
          { by: 'character', level: 17, damage: [{ formula: '4d8', type: 'thunder' }] },
        ],
      },
      effect: boardEffect(
        'Thunder Burst',
        [
          {
            condition: 'Deafened',
            duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
            turnOwner: 'target',
          },
        ],
        { summary: 'Deafened', targeting: 'enemy', multi: true },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:touch-of-filth': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Touch of Filth',
    {
      attackKind: 'melee',
      mechanics: {
        attackRoll: true,
        damage: [{ formula: '1d6', type: 'poison' }],
        scaling: [
          { by: 'slot', level: 3, damage: [{ formula: '2d6', type: 'poison' }] },
          { by: 'slot', level: 4, damage: [{ formula: '3d6', type: 'poison' }] },
          { by: 'slot', level: 5, damage: [{ formula: '4d6', type: 'poison' }] },
          { by: 'slot', level: 6, damage: [{ formula: '5d6', type: 'poison' }] },
          { by: 'slot', level: 7, damage: [{ formula: '6d6', type: 'poison' }] },
          { by: 'slot', level: 8, damage: [{ formula: '7d6', type: 'poison' }] },
          { by: 'slot', level: 9, damage: [{ formula: '8d6', type: 'poison' }] },
        ],
      },
      effect: boardEffect('Touch of Filth', [{ condition: 'Poisoned', duration: 'escape' }], {
        summary: 'Poisoned',
        targeting: 'enemy',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:twister': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Twister',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:unbridled-fury': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Unbridled Fury',
    {
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
      effect: boardEffect(
        'Unbridled Fury',
        [
          { condition: 'Charmed', duration: 'escape' },
          { note: 'Raging: approaches and attacks nearest creature', duration: 'escape' },
        ],
        {
          summary: 'Charmed; Raging: approaches and attacks nearest creature',
          targeting: 'enemy',
          multi: false,
        },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:unearth-legend': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Unearth Legend',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:unerring-sentry': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Unerring Sentry',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:wall-of-dust': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Wall of Dust',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:warding-sigil': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Warding Sigil',
    {
      effect: boardEffect('Warding Sigil', [{ note: '4-HP ward; absorbs damage before caster' }], {
        summary: '4-HP ward; absorbs damage before caster',
        targeting: 'self',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:water-wall': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Water Wall',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:wayfinding': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Wayfinding',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:wellspring': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Wellspring',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:whirling-blades': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Whirling Blades',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:whirling-water': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Whirling Water',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:whirlpool': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Whirlpool',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:withering-field': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Withering Field',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'half' },
        damage: [{ formula: '12d8', type: 'necrotic' }],
      },
      effect: boardEffect(
        'Withering Field',
        [
          {
            modifier: {
              applies: 'attackRolls',
              mode: 'disadvantage',
              value: null,
              direction: 'outgoing',
            },
            duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
            turnOwner: 'target',
          },
          {
            duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
            turnOwner: 'target',
            modifier: {
              applies: 'abilityChecks',
              mode: 'disadvantage',
              value: null,
              direction: 'outgoing',
            },
          },
          {
            duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
            turnOwner: 'target',
            modifier: { applies: 'speed', mode: 'flatBonus', value: 'half', direction: 'outgoing' },
          },
        ],
        {
          summary: 'Attacks: disadvantage; Checks: disadvantage; Speed: half',
          targeting: 'enemy',
          multi: true,
        },
      ),
    },
  ),
}
