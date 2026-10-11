// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile, deepMagicTurnConditions } from './deepMagic2020Profile.ts'
import { boardEffect, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_11: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:memento-mori': deepMagicProfile('Memento Mori', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: deepMagicTurnConditions(['Stunned'], 'target', 'endOfTurn', true),
  }),
  'kobold-press-deepm:mephitic-croak': deepMagicProfile('Mephitic Croak', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage(
        [
          { formula: '2d6', type: 'acid' },
          { formula: '2d6', type: 'thunder' },
        ],
        2,
        [1, 1],
      ),
    },
  }),
  'kobold-press-deepm:mind-exchange': deepMagicProfile('Mind Exchange', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
  }),
  'kobold-press-deepm:mire': deepMagicProfile('Mire', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    persistsAfterSave: true,
  }),
  'kobold-press-deepm:misstep': deepMagicProfile('Misstep', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
  }),
  'kobold-press-deepm:mist-of-wonders': deepMagicProfile('Mist of Wonders', {}),
  'kobold-press-deepm:monstrous-empathy': deepMagicProfile('Monstrous Empathy', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect('Monstrous Empathy', [{ condition: 'Charmed' }], {
      summary: 'Charmed',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-deepm:moon-trap': deepMagicProfile('Moon Trap', {}),
  'kobold-press-deepm:mosquito-bane': deepMagicProfile('Mosquito Bane', {}),
  'kobold-press-deepm:mud-pack': deepMagicProfile('Mud Pack', {
    effect: boardEffect(
      'Mud Pack',
      [{ note: 'Environmental temperature saves pass; terrain-hide advantage' }],
      {
        summary: 'Environmental temperature saves pass; terrain-hide advantage',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:negative-image': deepMagicProfile('Negative Image', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
  }),
  'kobold-press-deepm:nether-weapon': deepMagicProfile('Nether Weapon', {
    effect: boardEffect(
      'Nether Weapon',
      [{ note: 'Weapon hits: +2d6 necrotic; target cannot heal' }],
      {
        summary: 'Weapon hits: +2d6 necrotic; target cannot heal',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:night-terrors': deepMagicProfile('Night Terrors', {}),
  'kobold-press-deepm:nightfall': deepMagicProfile('Nightfall', {}),
  'kobold-press-deepm:nip-at-the-heels': deepMagicProfile('Nip at the Heels', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Nip at the Heels',
      [
        {
          modifier: {
            applies: 'attackRolls',
            mode: 'disadvantage',
            value: null,
            direction: 'outgoing',
          },
          duration: 'escape',
        },
        {
          modifier: {
            applies: 'abilityChecks',
            mode: 'disadvantage',
            value: null,
            direction: 'outgoing',
          },
          duration: 'escape',
        },
      ],
      { summary: 'Attacks: disadvantage; Checks: disadvantage', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:not-dead-yet': deepMagicProfile('Not Dead Yet', {}),
  'kobold-press-deepm:not-this-day': deepMagicProfile('Not This Day!', {
    effect: boardEffect('Not This Day!', [{ note: 'Chosen source: save advantage' }], {
      summary: 'Chosen source: save advantage',
      targeting: 'ally',
      multi: true,
    }),
  }),
  'kobold-press-deepm:orb-of-light': deepMagicProfile('Orb of Light', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '3d8', type: 'radiant' }], 2, [1]),
    },
  }),
  'kobold-press-deepm:outflanking-boon': deepMagicProfile('Outflanking Boon', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Outflanking Boon',
      [{ note: 'Caster’s allies: melee advantage vs target' }],
      { summary: 'Caster’s allies: melee advantage vs target', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:paragon-of-chaos': deepMagicProfile('Paragon of Chaos', {
    effect: boardEffect(
      'Paragon of Chaos',
      [
        {
          note: 'Chaos form; resistances, immunities, truesight',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Chaos form; resistances, immunities, truesight',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:pendulum': deepMagicProfile('Pendulum', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect('Pendulum', [{ note: 'd20 sequence: 20, 1, 19, 2…' }], {
      summary: 'd20 sequence: 20, 1, 19, 2…',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-deepm:phantom-dragon': deepMagicProfile('Phantom Dragon', {
    effect: boardEffect('Phantom Dragon', [{ note: 'Appears as dragon; can frighten observers' }], {
      summary: 'Appears as dragon; can frighten observers',
      targeting: 'ally',
      multi: true,
    }),
  }),
  'kobold-press-deepm:pitfall': deepMagicProfile('Pitfall', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
  }),
  'kobold-press-deepm:poisoned-volley': deepMagicProfile('Poisoned Volley', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '3d8', type: 'poison' }], 2, [1]),
    },
  }),
  'kobold-press-deepm:potency-of-the-pack': deepMagicProfile('Potency of the Pack', {
    effect: boardEffect(
      'Potency of the Pack',
      [{ note: 'Chosen pack benefit', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Chosen pack benefit', targeting: 'ally', multi: true },
    ),
  }),
  'kobold-press-deepm:power-word-kneel': deepMagicProfile('Power Word Kneel', {}),
  'kobold-press-deepm:power-word-pain': deepMagicProfile('Power Word Pain', {}),
  'kobold-press-deepm:primal-infusion': deepMagicProfile('Primal Infusion', {
    effect: boardEffect(
      'Primal Infusion',
      [
        { note: 'Pack advantage; +1d10 weapon damage', duration: { type: 'rounds', rounds: 10 } },
        {
          duration: { type: 'rounds', rounds: 10 },
          modifier: { applies: 'ac', mode: 'flatBonus', value: 2, direction: 'outgoing' },
        },
      ],
      { summary: 'Pack advantage; +1d10 weapon damage; AC: +2', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:prismatic-ray': deepMagicProfile('Prismatic Ray', {}),
  'kobold-press-deepm:protection-from-the-void': deepMagicProfile('Protection from the Void', {
    effect: boardEffect(
      'Protection from the Void',
      [
        {
          note: 'Resist necrotic/psychic; Void save advantage',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      { summary: 'Resist necrotic/psychic; Void save advantage', targeting: 'ally', multi: true },
    ),
  }),
}
