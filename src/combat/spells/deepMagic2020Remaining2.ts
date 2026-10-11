// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { boardEffect, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_2: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:blade-of-wrath': deepMagicProfile('Blade of Wrath', {
    effect: boardEffect(
      'Blade of Wrath',
      [
        {
          note: 'Luminous blade: 2d8 fire + 2d8 radiant',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      { summary: 'Luminous blade: 2d8 fire + 2d8 radiant', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:blazing-chariot': deepMagicProfile('Blazing Chariot', {}),
  'kobold-press-deepm:bleating-call': deepMagicProfile('Bleating Call', {}),
  'kobold-press-deepm:bleed': deepMagicProfile('Bleed', {
    effect: boardEffect(
      'Bleed',
      [
        {
          note: 'Slashing hits: +1d4 necrotic; can cause bleeding',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Slashing hits: +1d4 necrotic; can cause bleeding',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:bless-the-dead': deepMagicProfile('Bless the Dead', {}),
  'kobold-press-deepm:blessed-halo': deepMagicProfile('Blessed Halo', {
    effect: boardEffect(
      'Blessed Halo',
      [
        {
          note: '10-HP healing pool; good creature Charisma advantage',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: '10-HP healing pool; good creature Charisma advantage',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:blizzard': deepMagicProfile('Blizzard', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '8d8', type: 'cold' }], 7, [0]),
    },
    persistsAfterSave: true,
  }),
  'kobold-press-deepm:blood-and-steel': deepMagicProfile('Blood and Steel', {}),
  'kobold-press-deepm:blood-armor': deepMagicProfile('Blood Armor', {
    effect: boardEffect(
      'Blood Armor',
      [{ note: 'AC 18 + Dex; celestial blood: Cha save advantage' }],
      {
        summary: 'AC 18 + Dex; celestial blood: Cha save advantage',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:blood-lure': deepMagicProfile('Blood Lure', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: boardEffect('Blood Lure', [{ note: 'Compelled to consume blood' }], {
      summary: 'Compelled to consume blood',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-deepm:blood-offering': deepMagicProfile('Blood Offering', {}),
  'kobold-press-deepm:blood-puppet': deepMagicProfile('Blood Puppet', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect(
      'Blood Puppet',
      [{ note: 'Caster controls physical activity', duration: 'escape' }],
      { summary: 'Caster controls physical activity', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:blood-scarab': deepMagicProfile('Blood Scarab', {
    mechanics: {
      save: { ability: 'con', onSave: 'negates' },
      ...reviewedDamage([{ formula: '1d6', type: 'necrotic' }], 1, [0]),
    },
  }),
  'kobold-press-deepm:blood-spoor': deepMagicProfile('Blood Spoor', {}),
  'kobold-press-deepm:blood-tide': deepMagicProfile('Blood Tide', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect(
      'Blood Tide',
      [
        {
          modifier: {
            applies: 'abilityChecks',
            mode: 'flatBonus',
            value: -2,
            direction: 'outgoing',
            abilities: ['int', 'wis', 'cha'],
          },
        },
      ],
      { summary: 'Checks (int/wis/cha): -2', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-deepm:blood-to-acid': deepMagicProfile('Blood to Acid', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '10d12', type: 'acid' }], 9, [0]),
    },
  }),
  'kobold-press-deepm:bloodhound': deepMagicProfile('Bloodhound', {
    effect: boardEffect(
      'Bloodhound',
      [{ note: 'Smell/tracking advantage; blindsight at higher slots' }],
      {
        summary: 'Smell/tracking advantage; blindsight at higher slots',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:bloodshot': deepMagicProfile('Bloodshot', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage(
        [
          { formula: '2d10', type: 'fire' },
          { formula: '2d8', type: 'psychic' },
        ],
        2,
        [1, 0],
      ),
    },
    attackKind: 'ranged',
  }),
  'kobold-press-deepm:bloody-hands': deepMagicProfile('Bloody Hands', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect('Bloody Hands', [{ note: '1 necrotic/round; hand attacks disadvantage' }], {
      summary: '1 necrotic/round; hand attacks disadvantage',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-deepm:bloody-smite': deepMagicProfile('Bloody Smite', {
    effect: boardEffect(
      'Bloody Smite',
      [
        {
          note: 'Next melee hit: +1d6 necrotic; can cause bleeding',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Next melee hit: +1d6 necrotic; can cause bleeding',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:boiling-blood': deepMagicProfile('Boiling Blood', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '4d6', type: 'fire' }], 4, [0]),
    },
  }),
  'kobold-press-deepm:boiling-oil': deepMagicProfile('Boiling Oil', {}),
  'kobold-press-deepm:bolster-undead': deepMagicProfile('Bolster Undead', {
    effect: boardEffect('Bolster Undead', [{ note: 'Turning/radiant saves: advantage' }], {
      summary: 'Turning/radiant saves: advantage',
      targeting: 'ally',
      multi: true,
    }),
  }),
  'kobold-press-deepm:booster-shot': deepMagicProfile('Booster Shot', {
    effect: boardEffect(
      'Booster Shot',
      [
        {
          note: 'Ranged weapon: chosen projectile damage/rider',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Ranged weapon: chosen projectile damage/rider', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:boreass-breath': deepMagicProfile('Boreas’s Breath', {}),
  'kobold-press-deepm:bottled-arcana': deepMagicProfile('Bottled Arcana', {}),
  'kobold-press-deepm:bottomless-stomach': deepMagicProfile('Bottomless Stomach', {
    effect: boardEffect(
      'Bottomless Stomach',
      [{ note: 'Stores dangerous liquids; can regurgitate' }],
      { summary: 'Stores dangerous liquids; can regurgitate', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:breathtaking-wind': deepMagicProfile('Breathtaking Wind', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect('Breathtaking Wind', [{ note: 'Cannot speak or cast verbal spells' }], {
      summary: 'Cannot speak or cast verbal spells',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-deepm:breeze-compass': deepMagicProfile('Breeze Compass', {}),
  'kobold-press-deepm:brimstone-infusion': deepMagicProfile('Brimstone Infusion', {}),
}
