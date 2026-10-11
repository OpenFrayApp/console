// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { condition } from '../effects.ts'
import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { kibblesDamage, kibblesProfile } from './kibblesProfile.ts'
import { boardEffect } from './reviewedProfile.ts'

export const KIBBLES_CASTING_2: Record<string, ReviewedSpellCasting> = {
  'kibblestasty-casting-compendium-v2.3:blade-mirage': kibblesProfile('Blade Mirage', {
    effect: boardEffect('Blade Mirage', [{ note: 'Feint: next weapon attack advantage' }], {
      summary: 'Feint: next weapon attack advantage',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:blade-vortex': kibblesProfile('Blade Vortex', {
    effect: boardEffect(
      'Blade Vortex',
      [
        {
          note: 'Within 10 ft: 4d4 slashing on entry/turn start',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      {
        summary: 'Within 10 ft: 4d4 slashing on entry/turn start',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:blastwave': kibblesProfile('Blastwave', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage(
        [
          { formula: '4d8', type: 'thunder' },
          { formula: '4d8', type: 'fire' },
        ],
        5,
        [0, 0],
      ),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:blazing-beacon': kibblesProfile('Blazing Beacon', {
    effect: boardEffect('Blazing Beacon', [{ note: 'Targeting caster: Con save or Blinded' }], {
      summary: 'Targeting caster: Con save or Blinded',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:blizzard': kibblesProfile('Blizzard', {}),
  'kibblestasty-casting-compendium-v2.3:blood-bolt': kibblesProfile('Blood Bolt', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage(
        [
          { formula: '1d6', type: 'piercing' },
          { formula: '1d6', type: 'necrotic' },
        ],
        0,
        [1, 1],
      ),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:blood-diagnosis': kibblesProfile('Blood Diagnosis', {}),
  'kibblestasty-casting-compendium-v2.3:blood-divination': kibblesProfile('Blood Divination', {}),
  'kibblestasty-casting-compendium-v2.3:blood-frenzy': kibblesProfile('Blood Frenzy', {
    effect: boardEffect(
      'Blood Frenzy',
      [{ note: 'Melee advantage; charm/fear immune; survival save' }],
      {
        summary: 'Melee advantage; charm/fear immune; survival save',
        targeting: 'ally',
        multi: false,
      },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:blood-slash': kibblesProfile('Blood Slash', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage(
        [
          { formula: '2d6', type: 'slashing' },
          { formula: '2d6', type: 'necrotic' },
        ],
        1,
        [1, 0],
      ),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:blood-storm': kibblesProfile('Blood Storm', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '3d8', type: 'slashing' }], 2, [1]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:blood-transfusion': kibblesProfile('Blood Transfusion', {}),
  'kibblestasty-casting-compendium-v2.3:blood-wave': kibblesProfile('Blood Wave', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...kibblesDamage(
        [
          { formula: '2d6', type: 'bludgeoning' },
          { formula: '2d6', type: 'necrotic' },
        ],
        2,
        [0, 1],
      ),
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
  'kibblestasty-casting-compendium-v2.3:bloody-burst': kibblesProfile('Bloody Burst', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d6', type: 'necrotic' }], 2, [2]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:boil-blood': kibblesProfile('Boil Blood', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect(
      'Boil Blood',
      [{ note: 'Turn start: 3d4 fire; difficult terrain', duration: 'escape' }],
      { summary: 'Turn start: 3d4 fire; difficult terrain', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:bond-item': kibblesProfile('Bond Item', {}),
  'kibblestasty-casting-compendium-v2.3:bramble-barrier': kibblesProfile('Bramble Barrier', {}),
  'kibblestasty-casting-compendium-v2.3:bramble-binding': kibblesProfile('Bramble Binding', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d4', type: 'piercing' }], 1, [1]),
    },
    effect: boardEffect(
      'Bramble Binding',
      [
        {
          note: 'Cannot move until freed',
          duration: { type: 'manual' },
          durationNote: 'Until freed',
        },
      ],
      { summary: 'Cannot move until freed', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:brilliant-blade': kibblesProfile('Brilliant Blade', {}),
  'kibblestasty-casting-compendium-v2.3:burial-barrage': kibblesProfile('Burial Barrage', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '1d12+1', type: 'bludgeoning' }], 5, [0]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:burn': kibblesProfile('Burn', {
    attackKind: 'melee',
    mechanics: { attackRoll: true, ...kibblesDamage([{ formula: '1d12', type: 'fire' }], 0, [1]) },
  }),
  'kibblestasty-casting-compendium-v2.3:burning-strike': kibblesProfile('Burning Strike', {}),
  'kibblestasty-casting-compendium-v2.3:carnivorous-garden': kibblesProfile('Carnivorous Garden', {
    attackKind: 'melee',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '2d8', type: 'piercing' }], 4, [0]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:chromatic-breath': kibblesProfile('Chromatic Breath', {
    effect: boardEffect('Chromatic Breath', [{ note: 'Action: chosen 3d6 breath weapon' }], {
      summary: 'Action: chosen 3d6 breath weapon',
      targeting: 'ally',
      multi: false,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:chrono-conjunction': kibblesProfile('Chrono Conjunction', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
  }),
  'kibblestasty-casting-compendium-v2.3:clay-touch': kibblesProfile('Clay Touch', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: boardEffect('Clay Touch', [{ note: 'Armor AC becomes 10 + Dex' }], {
      summary: 'Armor AC becomes 10 + Dex',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:cold-snap': kibblesProfile('Cold Snap', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '3d8', type: 'cold' }], 2, [1]),
    },
    effect: boardEffect(
      'Cold Snap',
      [
        {
          modifier: { applies: 'speed', mode: 'flatBonus', value: -10, direction: 'outgoing' },
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      { summary: 'Speed: -10', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:commandment': kibblesProfile('Commandment', {
    effect: boardEffect('Commandment', [{ note: 'Violating order: 4d6 radiant once per round' }], {
      summary: 'Violating order: 4d6 radiant once per round',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:compelled-convulsion': kibblesProfile(
    'Compelled Convulsion',
    {
      mechanics: { save: { ability: 'con', onSave: 'negates' } },
    },
  ),
  'kibblestasty-casting-compendium-v2.3:compelled-query': kibblesProfile('Compelled Query', {
    mechanics: { save: { ability: 'int', onSave: 'negates' } },
  }),
}
