// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile, deepMagicTurnConditions } from './deepMagic2020Profile.ts'
import { boardEffect, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_6: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:doom-of-the-earthen-maw': deepMagicProfile('Doom of the Earthen Maw', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    effect: boardEffect(
      'Doom of the Earthen Maw',
      [{ condition: 'Restrained' }, { note: 'Sinking; may suffocate' }],
      { summary: 'Restrained; Sinking; may suffocate', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:doom-of-the-slippery-rogue': deepMagicProfile(
    'Doom of the Slippery Rogue',
    {},
  ),
  'kobold-press-deepm:douse-light': deepMagicProfile('Douse Light', {}),
  'kobold-press-deepm:draconic-smite': deepMagicProfile('Draconic Smite', {
    effect: boardEffect(
      'Draconic Smite',
      [
        {
          note: 'Next melee hit: +1d6 cold; secondary cold burst',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Next melee hit: +1d6 cold; secondary cold burst',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:dragon-breath': deepMagicProfile('Dragon Breath', {
    effect: boardEffect(
      'Dragon Breath',
      [{ note: 'Chosen dragon breath; d6 recharge', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Chosen dragon breath; d6 recharge', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:dragon-roar': deepMagicProfile('Dragon Roar', {
    mechanics: {
      save: { ability: 'cha', onSave: 'negates' },
      ...reviewedDamage([{ formula: '1d4', type: 'psychic' }], 0, [1]),
    },
    effect: deepMagicTurnConditions(['Frightened'], 'caster', 'startOfTurn'),
  }),
  'kobold-press-deepm:drown': deepMagicProfile('Drown', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
  }),
  'kobold-press-deepm:dryads-kiss': deepMagicProfile('Dryad’s Kiss', {}),
  'kobold-press-deepm:earthskimmer': deepMagicProfile('Earthskimmer', {
    effect: boardEffect(
      'Earthskimmer',
      [
        {
          note: 'Terrain-ignoring Speed 60 ft; Dash can trample',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Terrain-ignoring Speed 60 ft; Dash can trample',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:earworm-melody': deepMagicProfile('Earworm Melody', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
  }),
  'kobold-press-deepm:echoes-of-steel': deepMagicProfile('Echoes of Steel', {}),
  'kobold-press-deepm:ectoplasm': deepMagicProfile('Ectoplasm', {}),
  'kobold-press-deepm:eidetic-memory': deepMagicProfile('Eidetic Memory', {
    effect: boardEffect(
      'Eidetic Memory',
      [
        {
          modifier: {
            applies: 'abilityChecks',
            mode: 'flatBonus',
            value: 10,
            direction: 'outgoing',
            abilities: ['int'],
          },
        },
      ],
      { summary: 'Checks (int): +10', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:eldritch-communion': deepMagicProfile('Eldritch Communion', {}),
  'kobold-press-deepm:elemental-horns': deepMagicProfile('Elemental Horns', {
    effect: boardEffect(
      'Elemental Horns',
      [{ note: 'Gore hits: +3d6 chosen element', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Gore hits: +3d6 chosen element', targeting: 'ally', multi: true },
    ),
  }),
  'kobold-press-deepm:elemental-twist': deepMagicProfile('Elemental Twist', {
    effect: boardEffect(
      'Elemental Twist',
      [
        {
          note: 'Elemental spells: random type, +1d6 damage',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Elemental spells: random type, +1d6 damage', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:emanation-of-yoth': deepMagicProfile('Emanation of Yoth', {}),
  'kobold-press-deepm:enchant-ring': deepMagicProfile('Enchant Ring', {}),
  'kobold-press-deepm:encrypt-decrypt': deepMagicProfile('Encrypt / Decrypt', {}),
  'kobold-press-deepm:endow-attribute': deepMagicProfile('Endow Attribute', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
  }),
  'kobold-press-deepm:energy-absorption': deepMagicProfile('Energy Absorption', {}),
  'kobold-press-deepm:energy-foreknowledge': deepMagicProfile('Energy Foreknowledge', {}),
  'kobold-press-deepm:enhance-greed': deepMagicProfile('Enhance Greed', {
    effect: boardEffect(
      'Enhance Greed',
      [{ note: 'Senses valuables within 60 ft', duration: { type: 'rounds', rounds: 100 } }],
      { summary: 'Senses valuables within 60 ft', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:entomb': deepMagicProfile('Entomb', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
  }),
  'kobold-press-deepm:entropic-damage-field': deepMagicProfile('Entropic Damage Field', {
    effect: boardEffect(
      'Entropic Damage Field',
      [
        {
          note: 'Caster damage shared among failed Cha saves',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Caster damage shared among failed Cha saves', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:essence-instability': deepMagicProfile('Essence Instability', {
    effect: boardEffect(
      'Essence Instability',
      [
        {
          note: 'Aura: 2d6 poison; Con saves can end damage',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Aura: 2d6 poison; Con saves can end damage', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:evercold': deepMagicProfile('Evercold', {
    mechanics: {
      save: { ability: 'wis', onSave: 'negates' },
      ...reviewedDamage([{ formula: '1d6', type: 'cold' }], 4, [0]),
    },
    effect: boardEffect(
      'Evercold',
      [{ note: 'Hourly Con save: exhaustion; cold save disadvantage' }],
      {
        summary: 'Hourly Con save: exhaustion; cold save disadvantage',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:exsanguinate': deepMagicProfile('Exsanguinate', {}),
  'kobold-press-deepm:exsanguinating-cloud': deepMagicProfile('Exsanguinating Cloud', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '6d6', type: 'necrotic' }], 5, [0]),
    },
    persistsAfterSave: true,
  }),
  'kobold-press-deepm:extract-knowledge': deepMagicProfile('Extract Knowledge', {}),
}
