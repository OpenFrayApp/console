// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { condition } from '../effects.ts'
import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { kibblesDamage, kibblesProfile } from './kibblesProfile.ts'
import { boardEffect } from './reviewedProfile.ts'

export const KIBBLES_CASTING_7: Record<string, ReviewedSpellCasting> = {
  'kibblestasty-casting-compendium-v2.3:mind-blast': kibblesProfile('Mind Blast', {
    mechanics: {
      save: { ability: 'int', onSave: 'half' },
      ...kibblesDamage([{ formula: '6d8', type: 'psychic' }], 6, [0]),
    },
    effect: {
      summary: 'Stunned',
      targeting: 'enemy',
      multi: true,
      build: ({ source, target }) => [
        condition('Stunned', {
          source: target?.combatantId ?? source,
          duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
        }),
      ],
    },
  }),
  'kibblestasty-casting-compendium-v2.3:mind-ray': kibblesProfile('Mind Ray', {
    mechanics: {
      save: { ability: 'wis', onSave: 'half' },
      ...kibblesDamage([{ formula: '2d8', type: 'psychic' }], 1, [1]),
    },
    effect: boardEffect(
      'Mind Ray',
      [
        {
          note: 'Next attack or ability check: disadvantage',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      { summary: 'Next attack or ability check: disadvantage', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:mirror-army': kibblesProfile('Mirror Army', {
    effect: boardEffect('Mirror Army', [{ note: '3 duplicates; d20 can redirect attacks' }], {
      summary: '3 duplicates; d20 can redirect attacks',
      targeting: 'ally',
      multi: true,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:morbid-puppet': kibblesProfile('Morbid Puppet', {}),
  'kibblestasty-casting-compendium-v2.3:mounting-paranoia': kibblesProfile('Mounting Paranoia', {
    effect: boardEffect(
      'Mounting Paranoia',
      [{ note: 'Shadow visions; narrowing vision and fear' }],
      { summary: 'Shadow visions; narrowing vision and fear', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:multishot': kibblesProfile('Multishot', {}),
  'kibblestasty-casting-compendium-v2.3:mutate': kibblesProfile('Mutate', {
    effect: boardEffect('Mutate', [{ note: 'Chosen mutations' }], {
      summary: 'Chosen mutations',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:nauseating-poison': kibblesProfile('Nauseating Poison', {
    effect: boardEffect(
      'Nauseating Poison',
      [
        {
          note: 'Next melee hit: +1d12 poison; can poison target',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      {
        summary: 'Next melee hit: +1d12 poison; can poison target',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:nullify-effect': kibblesProfile('Nullify Effect', {
    effect: boardEffect(
      'Nullify Effect',
      [
        {
          note: 'Mental save advantage; resist psychic/force',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      { summary: 'Mental save advantage; resist psychic/force', targeting: 'self', multi: false },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:orbital-stones': kibblesProfile('Orbital Stones', {
    effect: boardEffect(
      'Orbital Stones',
      [{ note: '3 rocks: three-quarters cover; can fling rocks' }],
      {
        summary: '3 rocks: three-quarters cover; can fling rocks',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:pillar-of-fire': kibblesProfile('Pillar of Fire', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '10d6', type: 'fire' }], 4, [1]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:platinum-lances': kibblesProfile('Platinum Lances', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '8d8', type: 'radiant' }], 6, [1]),
    },
    effect: {
      summary: 'Prone',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        {
          ...condition('Prone', { source, duration: { type: 'manual' } }),
          concentration: false,
          durationNote: 'Until it stands up',
        },
      ],
    },
  }),
  'kibblestasty-casting-compendium-v2.3:poison-blast': kibblesProfile('Poison Blast', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d12', type: 'poison' }], 4, [0]),
    },
    effect: boardEffect(
      'Poison Blast',
      [
        {
          condition: 'Poisoned',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
          turnOwner: 'target',
          concentration: false,
        },
      ],
      { summary: 'Poisoned until its next turn', targeting: 'enemy', multi: false },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:poison-dart': kibblesProfile('Poison Dart', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '3d12', type: 'poison' }], 2, [1]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:power-torrent': kibblesProfile('Power Torrent', {}),
  'kibblestasty-casting-compendium-v2.3:preservation': kibblesProfile('Preservation', {}),
  'kibblestasty-casting-compendium-v2.3:pressure-cutter': kibblesProfile('Pressure Cutter', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '10d6', type: 'slashing' }], 5, [1]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:prismatic-flash': kibblesProfile('Prismatic Flash', {}),
  'kibblestasty-casting-compendium-v2.3:pseudopod-slam': kibblesProfile('Pseudopod Slam', {
    attackKind: 'melee',
    mechanics: { attackRoll: true, ...kibblesDamage([{ formula: '8d4', type: 'acid' }], 2, [2]) },
  }),
  'kibblestasty-casting-compendium-v2.3:psychic-drain': kibblesProfile('Psychic Drain', {
    mechanics: {
      save: { ability: 'cha', onSave: 'negates' },
      ...kibblesDamage([{ formula: '3d8', type: 'psychic' }], 2, [0]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:pyroclastic-lance': kibblesProfile('Pyroclastic Lance', {
    attackKind: 'ranged',
    mechanics: { attackRoll: true, ...kibblesDamage([{ formula: '8d6', type: 'fire' }], 5, [1]) },
  }),
  'kibblestasty-casting-compendium-v2.3:quicksand': kibblesProfile('Quicksand', {}),
  'kibblestasty-casting-compendium-v2.3:quicksilver-steps': kibblesProfile('Quicksilver Steps', {
    effect: boardEffect(
      'Quicksilver Steps',
      [{ note: 'No opportunity attacks; 4 off-turn moves' }],
      { summary: 'No opportunity attacks; 4 off-turn moves', targeting: 'self', multi: false },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:rain-of-spiders': kibblesProfile('Rain of Spiders', {}),
  'kibblestasty-casting-compendium-v2.3:rain-of-swords': kibblesProfile('Rain of Swords', {}),
  'kibblestasty-casting-compendium-v2.3:repair': kibblesProfile('Repair', {}),
  'kibblestasty-casting-compendium-v2.3:returning-weapon': kibblesProfile('Returning Weapon', {}),
  'kibblestasty-casting-compendium-v2.3:reverberating-dash': kibblesProfile(
    'Reverberating Dash',
    {},
  ),
  'kibblestasty-casting-compendium-v2.3:ribcage': kibblesProfile('Ribcage', {}),
  'kibblestasty-casting-compendium-v2.3:rock-slam': kibblesProfile('Rock Slam', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '1d10', type: 'bludgeoning' }], 0, [1]),
    },
  }),
}
