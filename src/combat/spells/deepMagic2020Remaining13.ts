// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile, deepMagicTurnConditions } from './deepMagic2020Profile.ts'
import { boardEffect, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_13: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:scribe': deepMagicProfile('Scribe', {}),
  'kobold-press-deepm:scry-ambush': deepMagicProfile('Scry Ambush', {}),
  'kobold-press-deepm:sculpt-snow': deepMagicProfile('Sculpt Snow', {}),
  'kobold-press-deepm:seal-of-sanctuary': deepMagicProfile('Seal of Sanctuary', {}),
  'kobold-press-deepm:searing-sun': deepMagicProfile('Searing Sun', {}),
  'kobold-press-deepm:see-beyond': deepMagicProfile('See Beyond', {
    effect: boardEffect('See Beyond', [{ note: 'Sees through obstructions within 30 ft' }], {
      summary: 'Sees through obstructions within 30 ft',
      targeting: 'ally',
      multi: true,
    }),
  }),
  'kobold-press-deepm:seed-of-destruction': deepMagicProfile('Seed of Destruction', {
    mechanics: { attackRoll: true },
    attackKind: 'ranged',
  }),
  'kobold-press-deepm:seeping-death': deepMagicProfile('Seeping Death', {
    mechanics: { attackRoll: true },
    attackKind: 'melee',
  }),
  'kobold-press-deepm:seers-reaction': deepMagicProfile('Seer’s Reaction', {}),
  'kobold-press-deepm:semblance-of-dread': deepMagicProfile('Semblance of Dread', {
    effect: boardEffect(
      'Semblance of Dread',
      [
        {
          note: 'Radiant vulnerability; fear-save advantage',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Radiant vulnerability; fear-save advantage', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:shade': deepMagicProfile('Shade', {
    effect: boardEffect(
      'Shade',
      [
        {
          note: 'Protected from visible blindness and sunlight penalties',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      {
        summary: 'Protected from visible blindness and sunlight penalties',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:shadow-armor': deepMagicProfile('Shadow Armor', {
    effect: boardEffect(
      'Shadow Armor',
      [
        {
          note: 'Radiant resistance',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
          durationNote: 'Until caster next turn start',
          concentration: false,
        },
      ],
      { summary: 'Radiant resistance', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:shadow-bite': deepMagicProfile('Shadow Bite', {
    mechanics: {
      save: { ability: 'con', onSave: 'negates' },
      ...reviewedDamage([{ formula: '1d6', type: 'necrotic' }], 0, [1]),
    },
  }),
  'kobold-press-deepm:shadow-blindness': deepMagicProfile('Shadow Blindness', {
    mechanics: { attackRoll: true },
    attackKind: 'melee',
  }),
  'kobold-press-deepm:shadow-hands': deepMagicProfile('Shadow Hands', {
    mechanics: {
      save: { ability: 'wis', onSave: 'half' },
      ...reviewedDamage([{ formula: '2d4', type: 'necrotic' }], 1, [2]),
    },
    effect: deepMagicTurnConditions(['Frightened'], 'target', 'endOfTurn', true),
  }),
  'kobold-press-deepm:shadow-monsters': deepMagicProfile('Shadow Monsters', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Shadow Monsters',
      [{ note: 'Must attack nearest ally', duration: 'escape' }],
      { summary: 'Must attack nearest ally', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:shadow-puppets': deepMagicProfile('Shadow Puppets', {
    effect: boardEffect(
      'Shadow Puppets',
      [
        {
          note: 'Shadow strike: 2d8 psychic; can incapacitate',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Shadow strike: 2d8 psychic; can incapacitate', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:shadow-trove': deepMagicProfile('Shadow Trove', {}),
  'kobold-press-deepm:shared-sacrifice': deepMagicProfile('Shared Sacrifice', {}),
  'kobold-press-deepm:sheen-of-ice': deepMagicProfile('Sheen of Ice', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: boardEffect(
      'Sheen of Ice',
      [
        { note: 'Outlined; fire damage 5+ ends effect' },
        { modifier: { applies: 'speed', mode: 'flatBonus', value: 'half', direction: 'outgoing' } },
      ],
      {
        summary: 'Outlined; fire damage 5+ ends effect; Speed: half',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:shifting-the-odds': deepMagicProfile('Shifting the Odds', {}),
  'kobold-press-deepm:shiver': deepMagicProfile('Shiver', {}),
  'kobold-press-deepm:shroud-of-death': deepMagicProfile('Shroud of Death', {
    effect: boardEffect(
      'Shroud of Death',
      [
        {
          note: 'Escalating necrotic aura; temp HP from life drained',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Escalating necrotic aura; temp HP from life drained',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:sidestep-arrow': deepMagicProfile('Sidestep Arrow', {}),
  'kobold-press-deepm:sign-of-koth': deepMagicProfile('Sign of Koth', {}),
  'kobold-press-deepm:silhouette': deepMagicProfile('Silhouette', {}),
  'kobold-press-deepm:sir-mittinzs-move-curse': deepMagicProfile('Sir Mittinz’s Move Curse', {}),
  'kobold-press-deepm:sleep-of-the-deep': deepMagicProfile('Sleep of the Deep', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
  }),
  'kobold-press-deepm:slippery-fingers': deepMagicProfile('Slippery Fingers', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
  }),
  'kobold-press-deepm:slither': deepMagicProfile('Slither', {
    effect: boardEffect(
      'Slither',
      [
        {
          note: 'Shadow form; no speech/items/attacks/spells',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Shadow form; no speech/items/attacks/spells', targeting: 'self', multi: false },
    ),
  }),
}
