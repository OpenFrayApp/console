// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { condition } from '../effects.ts'
import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { kibblesDamage, kibblesProfile } from './kibblesProfile.ts'
import { boardEffect } from './reviewedProfile.ts'

export const KIBBLES_CASTING_5: Record<string, ReviewedSpellCasting> = {
  'kibblestasty-casting-compendium-v2.3:form-of-ice': kibblesProfile('Form of Ice', {
    effect: boardEffect('Form of Ice', [{ note: 'Cold immune; icy aura' }], {
      summary: 'Cold immune; icy aura',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:form-of-stone': kibblesProfile('Form of Stone', {
    effect: boardEffect('Form of Stone', [{ note: 'Resist nonmagic B/P/S; stone movement' }], {
      summary: 'Resist nonmagic B/P/S; stone movement',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:form-of-the-elements': kibblesProfile(
    'Form of the Elements',
    {
      effect: boardEffect('Form of the Elements', [{ note: 'Five elemental forms’ benefits' }], {
        summary: 'Five elemental forms’ benefits',
        targeting: 'self',
        multi: false,
      }),
    },
  ),
  'kibblestasty-casting-compendium-v2.3:form-of-water': kibblesProfile('Form of Water', {
    effect: boardEffect('Form of Water', [{ note: 'Resist nonmagic B/P/S; water form' }], {
      summary: 'Resist nonmagic B/P/S; water form',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:form-of-wind': kibblesProfile('Form of Wind', {
    effect: boardEffect(
      'Form of Wind',
      [{ condition: 'Invisible' }, { note: 'Fly 60 ft; wind form' }],
      {
        summary: 'Invisible; fly 60 ft; wind form',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:freeze': kibblesProfile('Freeze', {
    attackKind: 'melee',
    mechanics: { attackRoll: true, ...kibblesDamage([{ formula: '1d8', type: 'cold' }], 0, [1]) },
    effect: boardEffect(
      'Freeze',
      [
        {
          modifier: { applies: 'speed', mode: 'flatBonus', value: -10, direction: 'outgoing' },
          duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
          turnOwner: 'target',
        },
      ],
      { summary: 'Speed: -10', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:future-insight': kibblesProfile('Future Insight', {
    effect: boardEffect(
      'Future Insight',
      [{ note: 'Recorded foresight dice modify later rolls' }],
      { summary: 'Recorded foresight dice modify later rolls', targeting: 'self', multi: false },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:gale-bolt': kibblesProfile('Gale Bolt', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '2d8', type: 'bludgeoning' }], 1, [1]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:gale-shot': kibblesProfile('Gale Shot', {}),
  'kibblestasty-casting-compendium-v2.3:geyser': kibblesProfile('Geyser', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d6', type: 'bludgeoning' }], 4, [1]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:ghost-step': kibblesProfile('Ghost Step', {
    effect: boardEffect(
      'Ghost Step',
      [
        {
          note: 'Intangible; immune except force',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      { summary: 'Intangible; immune except force', targeting: 'self', multi: false },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:glacial-crash': kibblesProfile('Glacial Crash', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '6d6', type: 'cold' }], 7, [0]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:glimpse-the-future': kibblesProfile('Glimpse the Future', {
    effect: boardEffect('Glimpse the Future', [{ note: 'Chosen foreseen event' }], {
      summary: 'Chosen foreseen event',
      targeting: 'ally',
      multi: false,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:gory-doom': kibblesProfile('Gory Doom', {}),
  'kibblestasty-casting-compendium-v2.3:grasping-roots': kibblesProfile('Grasping Roots', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
  }),
  'kibblestasty-casting-compendium-v2.3:gravity-surge': kibblesProfile('Gravity Surge', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...kibblesDamage([{ formula: '2d6', type: 'bludgeoning' }], 2, [0]),
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
  'kibblestasty-casting-compendium-v2.3:grip-of-the-dead': kibblesProfile('Grip of the Dead', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    effect: boardEffect(
      'Grip of the Dead',
      [{ condition: 'Restrained' }, { note: 'Turn start: 1d8 necrotic; caster heals half' }],
      {
        summary: 'Restrained; Turn start: 1d8 necrotic; caster heals half',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:heavenly-ray': kibblesProfile('Heavenly Ray', {}),
  'kibblestasty-casting-compendium-v2.3:heavy-blow': kibblesProfile('Heavy Blow', {
    effect: boardEffect(
      'Heavy Blow',
      [
        {
          note: 'Next melee hit: +1d10 bludgeoning; can daze',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      { summary: 'Next melee hit: +1d10 bludgeoning; can daze', targeting: 'self', multi: false },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:hellfire-pit': kibblesProfile('Hellfire Pit', {}),
  'kibblestasty-casting-compendium-v2.3:hungering-void': kibblesProfile('Hungering Void', {}),
  'kibblestasty-casting-compendium-v2.3:hungry-blood': kibblesProfile('Hungry Blood', {
    attackKind: 'melee',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage(
        [
          { formula: '2d6', type: 'piercing' },
          { formula: '2d6', type: 'necrotic' },
        ],
        2,
        [0, 0],
      ),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:hurricane-slash': kibblesProfile('Hurricane Slash', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '3d8', type: 'slashing' }], 2, [0]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:ice-arrow': kibblesProfile('Ice Arrow', {
    attackKind: 'ranged',
    mechanics: { attackRoll: true },
  }),
  'kibblestasty-casting-compendium-v2.3:ice-spike': kibblesProfile('Ice Spike', {}),
  'kibblestasty-casting-compendium-v2.3:ice-weapon': kibblesProfile('Ice Weapon', {}),
  'kibblestasty-casting-compendium-v2.3:ichorous-blood': kibblesProfile('Ichorous Blood', {
    effect: boardEffect(
      'Ichorous Blood',
      [{ note: 'Physical damage −4; melee attacker takes 4 acid' }],
      {
        summary: 'Physical damage −4; melee attacker takes 4 acid',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:illusionary-dart': kibblesProfile('Illusionary Dart', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '1d8', type: 'psychic' }], 0, [0]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:illusionary-fireball': kibblesProfile(
    'Illusionary Fireball',
    {
      mechanics: {
        save: { ability: 'wis', onSave: 'negates' },
        ...kibblesDamage([{ formula: '6d6', type: 'psychic' }], 3, [1]),
      },
    },
  ),
  'kibblestasty-casting-compendium-v2.3:illusory-pit': kibblesProfile('Illusory Pit', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Illusory Pit',
      [
        { condition: 'Prone', duration: { type: 'manual' }, concentration: false },
        { note: 'Cannot stand or see outside pit' },
      ],
      { summary: 'Prone; Cannot stand or see outside pit', targeting: 'enemy', multi: false },
    ),
    persistsAfterSave: true,
  }),
}
