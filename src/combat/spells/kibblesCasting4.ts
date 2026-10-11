// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { condition } from '../effects.ts'
import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { kibblesDamage, kibblesProfile } from './kibblesProfile.ts'
import { boardEffect } from './reviewedProfile.ts'

export const KIBBLES_CASTING_4: Record<string, ReviewedSpellCasting> = {
  'kibblestasty-casting-compendium-v2.3:electric-arc': kibblesProfile('Electric Arc', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '1d8', type: 'lightning' }], 0, [1]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:electrify': kibblesProfile('Electrify', {
    effect: boardEffect(
      'Electrify',
      [
        {
          note: 'Next melee hit: +1d12 lightning; can stun',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      { summary: 'Next melee hit: +1d12 lightning; can stun', targeting: 'self', multi: false },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:electrocute': kibblesProfile('Electrocute', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d12', type: 'lightning' }], 3, [1]),
    },
    effect: {
      summary: 'Stunned',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        condition('Stunned', {
          source: source,
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        }),
      ],
    },
  }),
  'kibblestasty-casting-compendium-v2.3:elemental-barrage': kibblesProfile('Elemental Barrage', {}),
  'kibblestasty-casting-compendium-v2.3:elemental-exhalation': kibblesProfile(
    'Elemental Exhalation',
    {
      mechanics: { save: { ability: 'dex', onSave: 'half' } },
    },
  ),
  'kibblestasty-casting-compendium-v2.3:elemental-orb': kibblesProfile('Elemental Orb', {
    attackKind: 'ranged',
    mechanics: { attackRoll: true },
  }),
  'kibblestasty-casting-compendium-v2.3:entomb': kibblesProfile('Entomb', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    effect: boardEffect(
      'Entomb',
      [
        { condition: 'Restrained', duration: 'escape' },
        { note: 'Turn end: 1d8 cold', duration: 'escape' },
      ],
      { summary: 'Restrained; Turn end: 1d8 cold', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:erode': kibblesProfile('Erode', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '8d4', type: 'acid' }], 3, [1]),
    },
    effect: boardEffect(
      'Erode',
      [
        {
          note: 'Turn end: acid until wiped off',
          duration: { type: 'manual' },
          durationNote: 'Until acid is cleared',
        },
      ],
      { summary: 'Turn end: acid until wiped off', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:ethereal-immolation': kibblesProfile(
    'Ethereal Immolation',
    {
      effect: boardEffect(
        'Ethereal Immolation',
        [{ note: 'Casting: 2d4 + 1d4/spell level force' }],
        { summary: 'Casting: 2d4 + 1d4/spell level force', targeting: 'enemy', multi: true },
      ),
    },
  ),
  'kibblestasty-casting-compendium-v2.3:explode-heart': kibblesProfile('Explode Heart', {}),
  'kibblestasty-casting-compendium-v2.3:explosive-deflection': kibblesProfile(
    'Explosive Deflection',
    {},
  ),
  'kibblestasty-casting-compendium-v2.3:expunge-poison': kibblesProfile('Expunge Poison', {}),
  'kibblestasty-casting-compendium-v2.3:exsanguinate': kibblesProfile('Exsanguinate', {}),
  'kibblestasty-casting-compendium-v2.3:eyes-of-immolation': kibblesProfile('Eyes of Immolation', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '3d6', type: 'fire' }], 1, [1]),
    },
    effect: boardEffect(
      'Eyes of Immolation',
      [
        {
          note: 'Turn end: 1d6 fire until doused',
          duration: { type: 'manual' },
          durationNote: 'Until flames are doused',
        },
      ],
      { summary: 'Turn end: 1d6 fire until doused', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:fall': kibblesProfile('Fall', {}),
  'kibblestasty-casting-compendium-v2.3:field-of-stars': kibblesProfile('Field of Stars', {}),
  'kibblestasty-casting-compendium-v2.3:final-flame': kibblesProfile('Final Flame', {
    effect: boardEffect('Final Flame', [{ note: 'At 0 HP or bonus action: ember detonates' }], {
      summary: 'At 0 HP or bonus action: ember detonates',
      targeting: 'ally',
      multi: false,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:fire-cyclone': kibblesProfile('Fire Cyclone', {
    mechanics: {
      save: { ability: 'str', onSave: 'half' },
      ...kibblesDamage([{ formula: '3d6', type: 'fire' }], 3, [1]),
    },

    persistsAfterSave: true,
  }),
  'kibblestasty-casting-compendium-v2.3:fireburst-mine': kibblesProfile('Fireburst Mine', {}),
  'kibblestasty-casting-compendium-v2.3:fissure': kibblesProfile('Fissure', {
    mechanics: {
      save: { ability: 'dex', onSave: 'negates' },
      ...kibblesDamage([{ formula: '6d10', type: 'bludgeoning' }], 5, [0]),
    },
    effect: boardEffect(
      'Fissure',
      [{ note: 'Buried: 1d10 bludgeoning at turn end', duration: { type: 'manual' } }],
      { summary: 'Buried: 1d10 bludgeoning at turn end', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:fists-of-fire': kibblesProfile('Fists of Fire', {
    effect: boardEffect('Fists of Fire', [{ note: 'Fists: 1d6 fire; grappling deals fire/turn' }], {
      summary: 'Fists: 1d6 fire; grappling deals fire/turn',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:flamethrower': kibblesProfile('Flamethrower', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d6', type: 'fire' }], 3, [1]),
    },

    persistsAfterSave: true,
  }),
  'kibblestasty-casting-compendium-v2.3:flash-freeze': kibblesProfile('Flash Freeze', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d8', type: 'cold' }], 3, [1]),
    },
    effect: {
      summary: 'Restrained',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        condition('Restrained', {
          source: source,
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        }),
      ],
    },
  }),
  'kibblestasty-casting-compendium-v2.3:flicker': kibblesProfile('Flicker', {
    effect: boardEffect(
      'Flicker',
      [
        {
          note: 'Per hit: d4 determines resistance or immunity',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      { summary: 'Per hit: d4 determines resistance or immunity', targeting: 'self', multi: false },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:flickering-strikes': kibblesProfile(
    'Flickering Strikes',
    {},
  ),
  'kibblestasty-casting-compendium-v2.3:fling': kibblesProfile('Fling', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
  }),
  'kibblestasty-casting-compendium-v2.3:force-blade': kibblesProfile('Force Blade', {
    effect: boardEffect('Force Blade', [{ note: 'Action: 2d12 + casting modifier force' }], {
      summary: 'Action: 2d12 + casting modifier force',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:force-bolt': kibblesProfile('Force Bolt', {
    attackKind: 'ranged',
    mechanics: { attackRoll: true, ...kibblesDamage([{ formula: '2d4', type: 'force' }], 0, [2]) },
  }),
  'kibblestasty-casting-compendium-v2.3:form-of-familiar': kibblesProfile('Form of Familiar', {
    effect: boardEffect('Form of Familiar', [{ note: 'Familiar form (familiar HP)' }], {
      summary: 'Familiar form (familiar HP)',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:form-of-fire': kibblesProfile('Form of Fire', {
    effect: boardEffect(
      'Form of Fire',
      [{ note: 'Fire immune; entry/melee retaliation 2d6 fire' }],
      { summary: 'Fire immune; entry/melee retaliation 2d6 fire', targeting: 'self', multi: false },
    ),
  }),
}
