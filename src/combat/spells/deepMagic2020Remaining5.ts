// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { boardEffect, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_5: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:dark-dementing': deepMagicProfile('Dark Dementing', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: boardEffect(
      'Dark Dementing',
      [{ note: 'Avoids spaces not brightly lit' }, { condition: 'Frightened' }],
      { summary: 'Avoids spaces not brightly lit; Frightened', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:dark-heraldry': deepMagicProfile('Dark Heraldry', {
    mechanics: {
      save: { ability: 'wis', onSave: 'half' },
      ...reviewedDamage([{ formula: '5d8', type: 'psychic' }], 3, [0]),
    },
    effect: boardEffect(
      'Dark Heraldry',
      [
        { note: 'Escape save disadvantage while caster sees target' },
        { condition: 'Frightened', duration: 'escape' },
      ],
      {
        summary: 'Escape save disadvantage while caster sees target; Frightened',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:dark-maw': deepMagicProfile('Dark Maw', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '1d8', type: 'necrotic' }], 0, [1]),
    },
    attackKind: 'melee',
  }),
  'kobold-press-deepm:dark-path': deepMagicProfile('Dark Path', {}),
  'kobold-press-deepm:darkbolt': deepMagicProfile('Darkbolt', {}),
  'kobold-press-deepm:dead-walking': deepMagicProfile('Dead Walking', {
    effect: boardEffect(
      'Dead Walking',
      [{ note: 'Invisible to undead; any attack/cast ends for all' }],
      {
        summary: 'Invisible to undead; any attack/cast ends for all',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:deadly-sting': deepMagicProfile('Deadly Sting', {
    effect: boardEffect(
      'Deadly Sting',
      [{ note: 'Tail: 1d4 piercing + 4d10 poison', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Tail: 1d4 piercing + 4d10 poison', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:death-gods-touch': deepMagicProfile('Death God’s Touch', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '10d10', type: 'necrotic' }], 7, [2]),
    },
    attackKind: 'melee',
  }),
  'kobold-press-deepm:decay': deepMagicProfile('Decay', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '1d10', type: 'necrotic' }], 0, [1]),
    },
    attackKind: 'melee',
  }),
  'kobold-press-deepm:decelerate': deepMagicProfile('Decelerate', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Decelerate',
      [{ note: 'Walking speed repeatedly halved (minimum 5 ft)' }],
      {
        summary: 'Walking speed repeatedly halved (minimum 5 ft)',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:deep-breath': deepMagicProfile('Deep Breath', {
    effect: boardEffect('Deep Breath', [{ note: 'Protected against thin atmosphere' }], {
      summary: 'Protected against thin atmosphere',
      targeting: 'ally',
      multi: true,
    }),
  }),
  'kobold-press-deepm:defile-healing': deepMagicProfile('Defile Healing', {}),
  'kobold-press-deepm:delay-potion': deepMagicProfile('Delay Potion', {
    effect: boardEffect('Delay Potion', [{ note: 'Delayed potion: bonus action to activate' }], {
      summary: 'Delayed potion: bonus action to activate',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kobold-press-deepm:delayed-healing': deepMagicProfile('Delayed Healing', {}),
  'kobold-press-deepm:demon-within': deepMagicProfile('Demon Within', {
    mechanics: {
      save: { ability: 'wis', onSave: 'negates' },
      ...reviewedDamage([{ formula: '4d6', type: 'force' }], 3, [0]),
    },
    effect: boardEffect('Demon Within', [{ note: 'Possessed; caster bonus action: 2d6 force' }], {
      summary: 'Possessed; caster bonus action: 2d6 force',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-deepm:desiccating-breath': deepMagicProfile('Desiccating Breath', {}),
  'kobold-press-deepm:destructive-resonance': deepMagicProfile('Destructive Resonance', {
    mechanics: {
      save: { ability: 'wis', onSave: 'half' },
      ...reviewedDamage([{ formula: '4d6', type: 'psychic' }], 2, [1]),
    },
  }),
  'kobold-press-deepm:detect-dragons': deepMagicProfile('Detect Dragons', {
    effect: boardEffect(
      'Detect Dragons',
      [
        {
          note: 'Studies dragon presence/count/type/location',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      { summary: 'Studies dragon presence/count/type/location', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:devas-wings': deepMagicProfile('Deva’s Wings', {
    effect: boardEffect(
      'Deva’s Wings',
      [{ note: 'Fly 60 ft; bonus-action wing attack', duration: { type: 'rounds', rounds: 100 } }],
      { summary: 'Fly 60 ft; bonus-action wing attack', targeting: 'ally', multi: true },
    ),
  }),
  'kobold-press-deepm:dimensional-shove': deepMagicProfile('Dimensional Shove', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
  }),
  'kobold-press-deepm:disquieting-gaze': deepMagicProfile('Disquieting Gaze', {
    effect: boardEffect(
      'Disquieting Gaze',
      [
        {
          note: 'Seeing eyes: Intimidation/necrotic attack advantage',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Seeing eyes: Intimidation/necrotic attack advantage',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:disruptive-aura': deepMagicProfile('Disruptive Aura', {}),
  'kobold-press-deepm:distracting-divination': deepMagicProfile('Distracting Divination', {
    mechanics: { attackRoll: true },
    attackKind: 'melee',
  }),
  'kobold-press-deepm:distraction-cascade': deepMagicProfile('Distraction Cascade', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
  }),
  'kobold-press-deepm:doom-of-blue-crystal': deepMagicProfile('Doom of Blue Crystal', {}),
  'kobold-press-deepm:doom-of-consuming-fire': deepMagicProfile('Doom of Consuming Fire', {
    effect: boardEffect(
      'Doom of Consuming Fire',
      [
        {
          note: 'Cold aura; caster takes 1d6 each round',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Cold aura; caster takes 1d6 each round', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:doom-of-dancing-blades': deepMagicProfile('Doom of Dancing Blades', {
    effect: boardEffect('Doom of Dancing Blades', [{ note: '1d4 defensive blade images' }], {
      summary: '1d4 defensive blade images',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kobold-press-deepm:doom-of-disenchantment': deepMagicProfile('Doom of Disenchantment', {
    effect: boardEffect(
      'Doom of Disenchantment',
      [
        {
          note: 'Suppresses attacking magic bonuses/properties',
          duration: { type: 'rounds', rounds: 5 },
        },
      ],
      { summary: 'Suppresses attacking magic bonuses/properties', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:doom-of-serpent-coils': deepMagicProfile('Doom of Serpent Coils', {
    effect: boardEffect(
      'Doom of Serpent Coils',
      [
        { condition: 'Poisoned', duration: 'escape' },
        { note: 'Failed escape: 4d6 poison', duration: 'escape' },
      ],
      { summary: 'Poisoned; failed escape: 4d6 poison', targeting: 'enemy', multi: true },
    ),
    mechanics: {
      save: { ability: 'con', onSave: 'negates' },
      ...reviewedDamage([{ formula: '4d6', type: 'poison' }], 4, [0]),
    },
  }),
  'kobold-press-deepm:doom-of-the-cracked-shield': deepMagicProfile(
    'Doom of the Cracked Shield',
    {},
  ),
}
