// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { kibblesDamage, kibblesProfile } from './kibblesProfile.ts'
import { boardEffect } from './reviewedProfile.ts'

export const KIBBLES_CASTING_3: Record<string, ReviewedSpellCasting> = {
  'kibblestasty-casting-compendium-v2.3:corpse-explosion': kibblesProfile('Corpse Explosion', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage(
        [
          { formula: '3d8', type: 'necrotic' },
          { formula: '3d8', type: 'thunder' },
        ],
        3,
        [0, 0],
      ),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:crackle': kibblesProfile('Crackle', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '1d12', type: 'lightning' }], 2, [0]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:crashing-wave': kibblesProfile('Crashing Wave', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...kibblesDamage([{ formula: '2d6', type: 'bludgeoning' }], 1, [1]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:create-pit': kibblesProfile('Create Pit', {}),
  'kibblestasty-casting-compendium-v2.3:crescent-wind-slash': kibblesProfile(
    'Crescent Wind Slash',
    {},
  ),
  'kibblestasty-casting-compendium-v2.3:crimson-poison': kibblesProfile('Crimson Poison', {}),
  'kibblestasty-casting-compendium-v2.3:crimson-tide': kibblesProfile('Crimson Tide', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '6d6', type: 'necrotic' }], 3, [0]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:crippling-agony': kibblesProfile('Crippling Agony', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect(
      'Crippling Agony',
      [{ note: 'Action or moving over half speed: 1d6 necrotic' }],
      {
        summary: 'Action or moving over half speed: 1d6 necrotic',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:cruel-puppetry': kibblesProfile('Cruel Puppetry', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: boardEffect('Cruel Puppetry', [{ note: 'Linked to doll; caster manipulates target' }], {
      summary: 'Linked to doll; caster manipulates target',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:crushing-singularity': kibblesProfile(
    'Crushing Singularity',
    {
      mechanics: {
        save: { ability: 'str', onSave: 'half' },
        ...kibblesDamage([{ formula: '6d6', type: 'bludgeoning' }], 3, [1]),
      },

      persistsAfterSave: true,
    },
  ),
  'kibblestasty-casting-compendium-v2.3:curse-of-impotence': kibblesProfile('Curse of Impotence', {
    effect: boardEffect(
      'Curse of Impotence',
      [{ note: 'Damaging actions: Wis save or no damage' }],
      { summary: 'Damaging actions: Wis save or no damage', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:dancing-object': kibblesProfile('Dancing Object', {}),
  'kibblestasty-casting-compendium-v2.3:dancing-wave': kibblesProfile('Dancing Wave', {}),
  'kibblestasty-casting-compendium-v2.3:decaying-touch': kibblesProfile('Decaying Touch', {
    attackKind: 'melee',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '1d6', type: 'necrotic' }], 0, [1]),
    },
    effect: boardEffect(
      'Decaying Touch',
      [
        {
          note: 'Next other-source damage adds necrotic dice',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      { summary: 'Next other-source damage adds necrotic dice', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:deglove-creature': kibblesProfile('Deglove Creature', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '7d10+7', type: 'necrotic' }], 5, [0]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:delve-mind': kibblesProfile('Delve Mind', {
    mechanics: { save: { ability: 'int', onSave: 'negates' } },
  }),
  'kibblestasty-casting-compendium-v2.3:devour-shadow': kibblesProfile('Devour Shadow', {
    mechanics: {
      save: { ability: 'cha', onSave: 'half' },
      ...kibblesDamage([{ formula: '6d6', type: 'necrotic' }], 4, [0]),
    },
    effect: boardEffect(
      'Devour Shadow',
      [
        {
          modifier: {
            applies: 'attackRolls',
            mode: 'flatBonus',
            value: '-1d4',
            direction: 'outgoing',
          },
        },
        {
          modifier: {
            applies: 'savingThrows',
            mode: 'flatBonus',
            value: '-1d4',
            direction: 'outgoing',
          },
        },
        {
          modifier: {
            applies: 'abilityChecks',
            mode: 'flatBonus',
            value: '-1d4',
            direction: 'outgoing',
          },
        },
      ],
      { summary: 'Attacks: -1d4; Saves: -1d4; Checks: -1d4', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:devouring-darkness': kibblesProfile('Devouring Darkness', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '6d8', type: 'necrotic' }], 5, [1]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:devouring-mist': kibblesProfile('Devouring Mist', {
    effect: boardEffect(
      'Devouring Mist',
      [
        {
          note: 'Mist form; no actions; Fly 60 ft; drains life',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      { summary: 'Mist form; no actions; Fly 60 ft; drains life', targeting: 'self', multi: false },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:dig': kibblesProfile('Dig', {}),
  'kibblestasty-casting-compendium-v2.3:dimension-cutter': kibblesProfile('Dimension Cutter', {}),
  'kibblestasty-casting-compendium-v2.3:disorient': kibblesProfile('Disorient', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Disorient',
      [
        { note: 'Turn start: random movement; failure by 5: Prone', duration: 'escape' },
        {
          modifier: {
            applies: 'attackRolls',
            mode: 'disadvantage',
            value: null,
            direction: 'outgoing',
          },
          duration: 'escape',
        },
      ],
      {
        summary: 'Turn start: random movement; failure by 5: Prone; Attacks: disadvantage',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:dispel-construct': kibblesProfile('Dispel Construct', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect('Dispel Construct', [{ condition: 'Stunned', duration: 'escape' }], {
      summary: 'Stunned',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:divide-self': kibblesProfile('Divide Self', {}),
  'kibblestasty-casting-compendium-v2.3:divine-descent': kibblesProfile('Divine Descent', {}),
  'kibblestasty-casting-compendium-v2.3:divine-judgment': kibblesProfile('Divine Judgment', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '2d8', type: 'radiant' }], 2, [1]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:dragon-surge': kibblesProfile('Dragon Surge', {
    mechanics: { save: { ability: 'dex', onSave: 'half' } },
  }),
  'kibblestasty-casting-compendium-v2.3:dust-cyclone': kibblesProfile('Dust Cyclone', {}),
  'kibblestasty-casting-compendium-v2.3:earth-ripple': kibblesProfile('Earth Ripple', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
  }),
  'kibblestasty-casting-compendium-v2.3:echoing-lance': kibblesProfile('Echoing Lance', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '3d8', type: 'thunder' }], 4, [1]),
    },
    effect: boardEffect(
      'Echoing Lance',
      [
        { condition: 'Stunned', duration: 'escape' },
        { note: 'Failed escape: 1d8 thunder', duration: 'escape' },
      ],
      { summary: 'Stunned; Failed escape: 1d8 thunder', targeting: 'enemy', multi: true },
    ),
  }),
}
