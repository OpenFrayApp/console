// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { condition } from '../effects.ts'
import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { kibblesDamage, kibblesProfile } from './kibblesProfile.ts'
import { boardEffect } from './reviewedProfile.ts'

export const KIBBLES_CASTING_10: Record<string, ReviewedSpellCasting> = {
  'kibblestasty-casting-compendium-v2.3:vacuum-pull': kibblesProfile('Vacuum Pull', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
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
  'kibblestasty-casting-compendium-v2.3:vampiric-blade': kibblesProfile('Vampiric Blade', {}),
  'kibblestasty-casting-compendium-v2.3:vampiric-brand': kibblesProfile('Vampiric Brand', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Vampiric Brand',
      [{ note: 'Damage adds 2d6 necrotic; caster heals half', duration: 'escape' }],
      { summary: 'Damage adds 2d6 necrotic; caster heals half', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:vampiric-mosquito': kibblesProfile('Vampiric Mosquito', {
    effect: boardEffect(
      'Vampiric Mosquito',
      [
        {
          note: 'Turn end: 1d4 necrotic; end spell heals caster',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Turn end: 1d4 necrotic; end spell heals caster',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:vessel-of-transportation': kibblesProfile(
    'Vessel of Transportation',
    {},
  ),
  'kibblestasty-casting-compendium-v2.3:vicious-hound': kibblesProfile('Vicious Hound', {
    effect: boardEffect(
      'Vicious Hound',
      [{ note: 'Moved less than 40 ft: 3d8 psychic', duration: 'escape' }],
      { summary: 'Moved less than 40 ft: 3d8 psychic', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:vicious-vapors': kibblesProfile('Vicious Vapors', {
    effect: boardEffect(
      'Vicious Vapors',
      [
        {
          condition: 'Poisoned',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
          concentration: false,
        },
      ],
      { summary: 'Poisoned until caster’s next turn', targeting: 'enemy', multi: false },
    ),
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '1d12', type: 'poison' }], 2, [1]),
    },

    persistsAfterSave: true,
  }),
  'kibblestasty-casting-compendium-v2.3:violent-crush': kibblesProfile('Violent Crush', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...kibblesDamage([{ formula: '6d12', type: 'bludgeoning' }], 4, [1]),
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
  'kibblestasty-casting-compendium-v2.3:violent-updraft': kibblesProfile('Violent Updraft', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
  }),
  'kibblestasty-casting-compendium-v2.3:vital-surge': kibblesProfile('Vital Surge', {
    effect: boardEffect(
      'Vital Surge',
      [{ note: 'One bonus action: heal 4d8 and spend Hit Dice' }],
      { summary: 'One bonus action: heal 4d8 and spend Hit Dice', targeting: 'ally', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:volcanic-burst': kibblesProfile('Volcanic Burst', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage(
        [
          { formula: '4d10', type: 'bludgeoning' },
          { formula: '4d6', type: 'fire' },
        ],
        6,
        [0, 0],
      ),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:vorpal-shot': kibblesProfile('Vorpal Shot', {}),
  'kibblestasty-casting-compendium-v2.3:vorpal-weapon': kibblesProfile('Vorpal Weapon', {}),
  'kibblestasty-casting-compendium-v2.3:vortex-blast': kibblesProfile('Vortex Blast', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
  }),
  'kibblestasty-casting-compendium-v2.3:wall-of-blood': kibblesProfile('Wall of Blood', {}),
  'kibblestasty-casting-compendium-v2.3:wasp-barrage': kibblesProfile('Wasp Barrage', {
    attackKind: 'ranged',
    mechanics: { attackRoll: true },
  }),
  'kibblestasty-casting-compendium-v2.3:water-blast': kibblesProfile('Water Blast', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '3d6', type: 'bludgeoning' }], 1, [1]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:water-bullet': kibblesProfile('Water Bullet', {
    attackKind: 'ranged',
    mechanics: { attackRoll: true },
  }),
  'kibblestasty-casting-compendium-v2.3:water-cannon': kibblesProfile('Water Cannon', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...kibblesDamage([{ formula: '6d6', type: 'bludgeoning' }], 3, [1]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:waterspout': kibblesProfile('Waterspout', {}),
  'kibblestasty-casting-compendium-v2.3:whirling-conflagration': kibblesProfile(
    'Whirling Conflagration',
    {},
  ),
  'kibblestasty-casting-compendium-v2.3:wind-cutter': kibblesProfile('Wind Cutter', {}),
  'kibblestasty-casting-compendium-v2.3:windborne-weapon': kibblesProfile('Windborne Weapon', {
    attackKind: 'ranged',
    mechanics: { attackRoll: true },
  }),
  'kibblestasty-casting-compendium-v2.3:windsense': kibblesProfile('Windsense', {
    effect: boardEffect(
      'Windsense',
      [
        {
          note: 'Blindsight 60 ft; ignores ranged weapon cover',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      { summary: 'Blindsight 60 ft; ignores ranged weapon cover', targeting: 'self', multi: false },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:wither': kibblesProfile('Wither', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d10+4', type: 'necrotic' }], 3, [1]),
    },
    effect: boardEffect(
      'Wither',
      [
        {
          note: 'Fire resistance removed, or fire vulnerability',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      {
        summary: 'Fire resistance removed, or fire vulnerability',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
}
