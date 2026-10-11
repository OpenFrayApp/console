// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { boardEffect, sourceProfile } from './reviewedProfile.ts'

export const SPELLS_THAT_DONT_SUCK_3: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-spells-that-dont-suck:false-foes': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'False Foes',
    {
      mechanics: { save: { ability: 'int', onSave: 'negates' } },
      effect: boardEffect('False Foes', [{ note: 'Treats everyone as enemy' }], {
        summary: 'Treats everyone as enemy',
        targeting: 'enemy',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:fated-strike': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Fated Strike',
    {
      effect: boardEffect(
        'Fated Strike',
        [{ note: 'Next attack automatically hits', duration: { type: 'manual' } }],
        { summary: 'Next attack automatically hits', targeting: 'ally', multi: false },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:fearsome-visage': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Fearsome Visage',
    {
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
      effect: boardEffect(
        'Fearsome Visage',
        [
          { condition: 'Frightened', duration: { type: 'rounds', rounds: 10 } },
          { duration: 'escape', condition: 'Frightened' },
        ],
        { summary: 'Frightened; Frightened', targeting: 'enemy', multi: true },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:fiery-blade': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Fiery Blade',
    {
      effect: boardEffect('Fiery Blade', [{ note: 'Fiery blade: 2d6 fire; can ignite target' }], {
        summary: 'Fiery blade: 2d6 fire; can ignite target',
        targeting: 'self',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:fiery-quiver': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Fiery Quiver',
    {
      effect: boardEffect('Fiery Quiver', [{ note: '6 ammunition hits: +2d6 fire' }], {
        summary: '6 ammunition hits: +2d6 fire',
        targeting: 'ally',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:find-in-nature': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Find in Nature',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:fireblast': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Fireblast',
    {
      mechanics: {
        save: { ability: 'dex', onSave: 'half' },
        damage: [{ formula: '7d6', type: 'fire' }],
        scaling: [
          { by: 'slot', level: 4, damage: [{ formula: '8d6', type: 'fire' }] },
          { by: 'slot', level: 5, damage: [{ formula: '9d6', type: 'fire' }] },
          { by: 'slot', level: 6, damage: [{ formula: '10d6', type: 'fire' }] },
          { by: 'slot', level: 7, damage: [{ formula: '11d6', type: 'fire' }] },
          { by: 'slot', level: 8, damage: [{ formula: '12d6', type: 'fire' }] },
          { by: 'slot', level: 9, damage: [{ formula: '13d6', type: 'fire' }] },
        ],
      },
    },
  ),
  'somanyrobots-spells-that-dont-suck:fleeting-portals': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Fleeting Portals',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:flickering-strikes': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Flickering Strikes',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:force-weapon': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Force Weapon',
    {
      effect: boardEffect('Force Weapon', [{ note: 'Chosen weapon: +1 attack, +1d4 force' }], {
        summary: 'Chosen weapon: +1 attack, +1d4 force',
        targeting: 'ally',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:form-of-fire': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Form of Fire',
    {
      effect: boardEffect(
        'Form of Fire',
        [{ note: 'Fire immune; entry/melee retaliation 2d6 fire' }],
        {
          summary: 'Fire immune; entry/melee retaliation 2d6 fire',
          targeting: 'self',
          multi: false,
        },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:form-of-ice': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Form of Ice',
    {
      effect: boardEffect('Form of Ice', [{ note: 'Cold immune; icy aura' }], {
        summary: 'Cold immune; icy aura',
        targeting: 'self',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:form-of-stone': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Form of Stone',
    {
      effect: boardEffect(
        'Form of Stone',
        [{ note: 'Resist nonmagic B/P/S; moves through stone' }],
        { summary: 'Resist nonmagic B/P/S; moves through stone', targeting: 'self', multi: false },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:form-of-water': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Form of Water',
    {
      effect: boardEffect(
        'Form of Water',
        [{ note: 'Resist nonmagic B/P/S; squeezes through gaps' }],
        {
          summary: 'Resist nonmagic B/P/S; squeezes through gaps',
          targeting: 'self',
          multi: false,
        },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:form-of-wind': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Form of Wind',
    {
      effect: boardEffect(
        'Form of Wind',
        [
          { condition: 'Invisible', duration: { type: 'rounds', rounds: 100 } },
          { note: 'Fly 60 ft; squeezes through gaps', duration: { type: 'rounds', rounds: 100 } },
        ],
        { summary: 'Invisible; Fly 60 ft; squeezes through gaps', targeting: 'self', multi: false },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:fortune': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Fortune',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:frost-shuriken': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Frost Shuriken',
    {
      mechanics: {
        attackRoll: true,
        damage: [
          { formula: '1d4', type: 'piercing' },
          { formula: '2d8', type: 'cold' },
        ],
        scaling: [
          {
            by: 'slot',
            level: 2,
            damage: [
              { formula: '1d4', type: 'piercing' },
              { formula: '3d8', type: 'cold' },
            ],
          },
          {
            by: 'slot',
            level: 3,
            damage: [
              { formula: '1d4', type: 'piercing' },
              { formula: '4d8', type: 'cold' },
            ],
          },
          {
            by: 'slot',
            level: 4,
            damage: [
              { formula: '1d4', type: 'piercing' },
              { formula: '5d8', type: 'cold' },
            ],
          },
          {
            by: 'slot',
            level: 5,
            damage: [
              { formula: '1d4', type: 'piercing' },
              { formula: '6d8', type: 'cold' },
            ],
          },
          {
            by: 'slot',
            level: 6,
            damage: [
              { formula: '1d4', type: 'piercing' },
              { formula: '7d8', type: 'cold' },
            ],
          },
          {
            by: 'slot',
            level: 7,
            damage: [
              { formula: '1d4', type: 'piercing' },
              { formula: '8d8', type: 'cold' },
            ],
          },
          {
            by: 'slot',
            level: 8,
            damage: [
              { formula: '1d4', type: 'piercing' },
              { formula: '9d8', type: 'cold' },
            ],
          },
          {
            by: 'slot',
            level: 9,
            damage: [
              { formula: '1d4', type: 'piercing' },
              { formula: '10d8', type: 'cold' },
            ],
          },
        ],
      },
    },
  ),
  'somanyrobots-spells-that-dont-suck:ghost-lights': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Ghost Lights',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:ghost-touch': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Ghost Touch',
    {
      mechanics: {
        attackRoll: true,
        damage: [{ formula: '1d8', type: 'necrotic' }],
        scaling: [
          { by: 'character', level: 5, damage: [{ formula: '2d8', type: 'necrotic' }] },
          { by: 'character', level: 11, damage: [{ formula: '3d8', type: 'necrotic' }] },
          { by: 'character', level: 17, damage: [{ formula: '4d8', type: 'necrotic' }] },
        ],
      },
      effect: boardEffect(
        'Ghost Touch',
        [{ note: 'No healing', duration: { type: 'untilSourceTurn', when: 'endOfTurn' } }],
        { summary: 'No healing', targeting: 'enemy', multi: false },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:glacial-orbs': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Glacial Orbs',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:glyph-of-power': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Glyph of Power',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:grave-call': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Grave Call',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:great-wave': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Great Wave',
    {
      persistsAfterSave: true,
      mechanics: {
        save: { ability: 'str', onSave: 'half' },
        damage: [{ formula: '6d10', type: 'bludgeoning' }],
      },
    },
  ),
  'somanyrobots-spells-that-dont-suck:hailstorm': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Hailstorm',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:hallucination': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Hallucination',
    {
      effect: boardEffect('Hallucination', [{ note: 'Believes the illusion' }], {
        summary: 'Believes the illusion',
        targeting: 'enemy',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:holy-fire': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Holy Fire',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:imbue-element': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Imbue Element',
    {
      effect: boardEffect(
        'Imbue Element',
        [{ note: 'Weapon: +1d6 chosen element; elemental rider' }],
        {
          summary: 'Weapon: +1d6 chosen element; elemental rider',
          targeting: 'ally',
          multi: false,
        },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:impaling-spires': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Impaling Spires',
    {
      mechanics: {
        save: { ability: 'dex', onSave: 'half' },
        damage: [{ formula: '5d10', type: 'piercing' }],
      },
    },
  ),
  'somanyrobots-spells-that-dont-suck:incinerate': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Incinerate',
    {
      effect: boardEffect(
        'Incinerate',
        [{ note: 'Turn start: Dex save, 10d6 fire; half and ends' }],
        {
          summary: 'Turn start: Dex save, 10d6 fire; half and ends',
          targeting: 'enemy',
          multi: false,
        },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:inflict-disease': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Inflict Disease',
    {
      attackKind: 'melee',
      mechanics: { attackRoll: true },
      effect: boardEffect(
        'Inflict Disease',
        [
          {
            note: 'Chosen disease; 3 saves cure, 3 failures lock in',
            duration: { type: 'manual' },
            durationNote: 'Until cured; may set for 7 days',
          },
        ],
        {
          summary: 'Chosen disease; 3 saves cure, 3 failures lock in',
          targeting: 'enemy',
          multi: false,
        },
      ),
    },
  ),
}
