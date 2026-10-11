// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { boardEffect, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_7: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:fault-line': deepMagicProfile('Fault Line', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '8d6', type: 'bludgeoning' }], 6, [0]),
    },
  }),
  'kobold-press-deepm:feather-field': deepMagicProfile('Feather Field', {
    effect: boardEffect(
      'Feather Field',
      [
        {
          note: 'Ranged magic attacks: +5 AC',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      { summary: 'Ranged magic attacks: +5 AC', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:feather-travel': deepMagicProfile('Feather Travel', {}),
  'kobold-press-deepm:fey-crown': deepMagicProfile('Fey Crown', {
    effect: boardEffect('Fey Crown', [{ note: 'Magic save advantage; charm immune; 5 flowers' }], {
      summary: 'Magic save advantage; charm immune; 5 flowers',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kobold-press-deepm:find-kin': deepMagicProfile('Find Kin', {}),
  'kobold-press-deepm:fire-darts': deepMagicProfile('Fire Darts', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '4d6', type: 'fire' }], 2, [1]),
    },
  }),
  'kobold-press-deepm:fire-under-the-tongue': deepMagicProfile('Fire Under the Tongue', {
    effect: boardEffect('Fire Under the Tongue', [{ note: 'Stored flame; action to spit fire' }], {
      summary: 'Stored flame; action to spit fire',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kobold-press-deepm:firewalk': deepMagicProfile('Firewalk', {
    effect: boardEffect(
      'Firewalk',
      [{ note: 'Fire immune; walks on flame', duration: { type: 'rounds', rounds: 100 } }],
      { summary: 'Fire immune; walks on flame', targeting: 'ally', multi: true },
    ),
  }),
  'kobold-press-deepm:fist-of-iron': deepMagicProfile('Fist of Iron', {
    effect: boardEffect(
      'Fist of Iron',
      [
        {
          note: 'Magical unarmed strikes: 1d6 bludgeoning',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Magical unarmed strikes: 1d6 bludgeoning', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-deepm:flame-wave': deepMagicProfile('Flame Wave', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      damage: [{ formula: '6d8', type: 'fire' }],
      scaling: [5, 6, 7, 8, 9].map((level) => ({
        by: 'slot',
        level,
        damage: [{ formula: `${level + 3}d8`, type: 'fire' }],
      })),
    },
  }),
  'kobold-press-deepm:flesh-to-paper': deepMagicProfile('Flesh to Paper', {
    effect: boardEffect(
      'Flesh to Paper',
      [{ note: 'Flattened; no attacks/spells; wall-hide advantage' }],
      {
        summary: 'Flattened; no attacks/spells; wall-hide advantage',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:flickering-fate': deepMagicProfile('Flickering Fate', {}),
  'kobold-press-deepm:fluctuating-alignment': deepMagicProfile('Fluctuating Alignment', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
  }),
  'kobold-press-deepm:flurry': deepMagicProfile('Flurry', {
    effect: boardEffect(
      'Flurry',
      [
        {
          note: 'Looking through snow: attack/Perception disadvantage',
          duration: { type: 'rounds', rounds: 1 },
        },
      ],
      {
        summary: 'Looking through snow: attack/Perception disadvantage',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-deepm:forest-native': deepMagicProfile('Forest Native', {
    effect: boardEffect(
      'Forest Native',
      [{ note: 'Forest: ignores vegetation; environment save advantage' }],
      {
        summary: 'Forest: ignores vegetation; environment save advantage',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:forest-sanctuary': deepMagicProfile('Forest Sanctuary', {}),
  'kobold-press-deepm:foretell-distraction': deepMagicProfile('Foretell Distraction', {}),
  'kobold-press-deepm:form-of-the-gods': deepMagicProfile('Form of the Gods', {
    effect: boardEffect('Form of the Gods', [{ note: 'Divine avatar form' }], {
      summary: 'Divine avatar form',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kobold-press-deepm:freeze-blood': deepMagicProfile('Freeze Blood', {
    mechanics: { attackRoll: true },
    attackKind: 'melee',
  }),
  'kobold-press-deepm:freeze-potion': deepMagicProfile('Freeze Potion', {}),
  'kobold-press-deepm:freezing-fog': deepMagicProfile('Freezing Fog', {}),
  'kobold-press-deepm:frenzied-bolt': deepMagicProfile('Frenzied Bolt', {}),
  'kobold-press-deepm:frostbite': deepMagicProfile('Frostbite', {
    mechanics: {
      save: { ability: 'con', onSave: 'negates' },
      ...reviewedDamage([{ formula: '4d8', type: 'cold' }], 5, [0]),
    },
    effect: boardEffect(
      'Frostbite',
      [
        { note: 'Turn start: cold damage; 3 saves end effect' },
        { modifier: { applies: 'speed', mode: 'flatBonus', value: 'half', direction: 'outgoing' } },
        {
          modifier: {
            applies: 'attackRolls',
            mode: 'disadvantage',
            value: null,
            direction: 'outgoing',
          },
        },
        {
          modifier: {
            applies: 'abilityChecks',
            mode: 'disadvantage',
            value: null,
            direction: 'outgoing',
          },
        },
      ],
      {
        summary:
          'Turn start: cold damage; 3 saves end effect; Speed: half; Attacks: disadvantage; Checks: disadvantage',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:frostbitten-fingers': deepMagicProfile('Frostbitten Fingers', {
    mechanics: { attackRoll: true },
    attackKind: 'ranged',
  }),
  'kobold-press-deepm:frozen-razors': deepMagicProfile('Frozen Razors', {}),
  'kobold-press-deepm:furious-hooves': deepMagicProfile('Furious Hooves', {
    effect: boardEffect(
      'Furious Hooves',
      [{ note: 'Faster walking; hoof attacks', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Faster walking; hoof attacks', targeting: 'ally', multi: true },
    ),
  }),
  'kobold-press-deepm:fusillade-of-ice': deepMagicProfile('Fusillade of Ice', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage(
        [
          { formula: '4d6', type: 'cold' },
          { formula: '3d6', type: 'piercing' },
        ],
        4,
        [0, 0],
      ),
    },
  }),
  'kobold-press-deepm:gear-barrage': deepMagicProfile('Gear Barrage', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '3d8', type: 'slashing' }], 2, [0]),
    },
  }),
  'kobold-press-deepm:ghoul-kings-cloak': deepMagicProfile('Ghoul King’s Cloak', {
    effect: boardEffect(
      'Ghoul King’s Cloak',
      [
        {
          note: 'Extra weapon attack; necrotic/radiant immune; 1 HP floor',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Extra weapon attack; necrotic/radiant immune; 1 HP floor',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-deepm:gird-the-spirit': deepMagicProfile('Gird the Spirit', {
    effect: boardEffect(
      'Gird the Spirit',
      [{ note: 'Undead cannot reduce abilities/max HP', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Undead cannot reduce abilities/max HP', targeting: 'ally', multi: true },
    ),
  }),
}
