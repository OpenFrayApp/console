// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { boardEffect, sourceProfile } from './reviewedProfile.ts'

export const SPELLS_THAT_DONT_SUCK_5: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-spells-that-dont-suck:phantasm': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Phantasm',
    {
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
      effect: boardEffect(
        'Phantasm',
        [{ note: 'Chosen illusion: condition or 2d10 psychic/turn' }],
        {
          summary: 'Chosen illusion: condition or 2d10 psychic/turn',
          targeting: 'enemy',
          multi: false,
        },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:phantasmal-horror': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Phantasmal Horror',
    {
      effect: boardEffect(
        'Phantasmal Horror',
        [{ note: 'Turn start: Wis save or 4d10 psychic/Frightened' }],
        {
          summary: 'Turn start: Wis save or 4d10 psychic/Frightened',
          targeting: 'enemy',
          multi: false,
        },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:phantasmal-nightmares': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Phantasmal Nightmares',
    {
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
      effect: boardEffect(
        'Phantasmal Nightmares',
        [
          { condition: 'Frightened', duration: 'escape' },
          { note: 'Turn start: 6d10 psychic and d10 condition', duration: 'escape' },
        ],
        {
          summary: 'Frightened; Turn start: 6d10 psychic and d10 condition',
          targeting: 'enemy',
          multi: true,
        },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:poison-fang': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Poison Fang',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'negates' },
        damage: [{ formula: '1d12', type: 'poison' }],
        scaling: [
          { by: 'character', level: 5, damage: [{ formula: '2d12', type: 'poison' }] },
          { by: 'character', level: 11, damage: [{ formula: '3d12', type: 'poison' }] },
          { by: 'character', level: 17, damage: [{ formula: '4d12', type: 'poison' }] },
        ],
      },
      effect: boardEffect(
        'Poison Fang',
        [
          {
            condition: 'Poisoned',
            duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
            turnOwner: 'target',
          },
        ],
        { summary: 'Poisoned', targeting: 'enemy', multi: false },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:power-word-nap': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Power Word Nap',
    {
      effect: boardEffect('Power Word Nap', [{ condition: 'Unconscious' }], {
        summary: 'Unconscious',
        targeting: 'ally',
        multi: true,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:prismatic-bolt': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Prismatic Bolt',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:psychic-skewer': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Psychic Skewer',
    {
      mechanics: {
        save: { ability: 'int', onSave: 'half' },
        damage: [{ formula: '3d8', type: 'psychic' }],
        scaling: [
          { by: 'slot', level: 3, damage: [{ formula: '4d8', type: 'psychic' }] },
          { by: 'slot', level: 4, damage: [{ formula: '5d8', type: 'psychic' }] },
          { by: 'slot', level: 5, damage: [{ formula: '6d8', type: 'psychic' }] },
          { by: 'slot', level: 6, damage: [{ formula: '7d8', type: 'psychic' }] },
          { by: 'slot', level: 7, damage: [{ formula: '8d8', type: 'psychic' }] },
          { by: 'slot', level: 8, damage: [{ formula: '9d8', type: 'psychic' }] },
          { by: 'slot', level: 9, damage: [{ formula: '10d8', type: 'psychic' }] },
        ],
      },
      effect: boardEffect('Psychic Skewer', [{ note: 'Location known to caster' }], {
        summary: 'Location known to caster',
        targeting: 'enemy',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:psychokinesis': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Psychokinesis',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:rain-of-fire': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Rain of Fire',
    {
      persistsAfterSave: true,
      mechanics: {
        save: { ability: 'dex', onSave: 'half' },
        damage: [{ formula: '8d6', type: 'fire' }],
      },
    },
  ),
  'somanyrobots-spells-that-dont-suck:reanimation': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Reanimation',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:reanimation-greater': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Reanimation, Greater',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:rejuvenation': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Rejuvenation',
    {
      effect: boardEffect('Rejuvenation', [{ note: 'Turn start: heal 10 HP' }], {
        summary: 'Turn start: heal 10 HP',
        targeting: 'ally',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:riptide': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Riptide',
    {
      mechanics: {
        save: { ability: 'str', onSave: 'half' },
        damage: [{ formula: '4d8', type: 'bludgeoning' }],
        scaling: [
          { by: 'slot', level: 4, damage: [{ formula: '5d8', type: 'bludgeoning' }] },
          { by: 'slot', level: 5, damage: [{ formula: '6d8', type: 'bludgeoning' }] },
          { by: 'slot', level: 6, damage: [{ formula: '7d8', type: 'bludgeoning' }] },
          { by: 'slot', level: 7, damage: [{ formula: '8d8', type: 'bludgeoning' }] },
          { by: 'slot', level: 8, damage: [{ formula: '9d8', type: 'bludgeoning' }] },
          { by: 'slot', level: 9, damage: [{ formula: '10d8', type: 'bludgeoning' }] },
        ],
      },
    },
  ),
  'somanyrobots-spells-that-dont-suck:rot': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Rot',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'half' },
        damage: [{ formula: '9d8', type: 'necrotic' }],
        scaling: [
          { by: 'slot', level: 5, damage: [{ formula: '10d8', type: 'necrotic' }] },
          { by: 'slot', level: 6, damage: [{ formula: '11d8', type: 'necrotic' }] },
          { by: 'slot', level: 7, damage: [{ formula: '12d8', type: 'necrotic' }] },
          { by: 'slot', level: 8, damage: [{ formula: '13d8', type: 'necrotic' }] },
          { by: 'slot', level: 9, damage: [{ formula: '14d8', type: 'necrotic' }] },
        ],
      },
      effect: boardEffect(
        'Rot',
        [
          {
            modifier: {
              applies: 'attackRolls',
              mode: 'disadvantage',
              value: null,
              direction: 'outgoing',
            },
            duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
          },
          {
            duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
            modifier: {
              applies: 'abilityChecks',
              mode: 'disadvantage',
              value: null,
              direction: 'outgoing',
            },
          },
        ],
        {
          summary: 'Attacks: disadvantage; Checks: disadvantage',
          targeting: 'enemy',
          multi: false,
        },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:sacred-circle': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Sacred Circle',
    {
      effect: boardEffect('Sacred Circle', [{ note: 'Warded from listed creature types' }], {
        summary: 'Warded from listed creature types',
        targeting: 'self',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:sacred-strikes': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Sacred Strikes',
    {
      effect: boardEffect('Sacred Strikes', [{ note: 'Weapon hits: +1d6 radiant' }], {
        summary: 'Weapon hits: +1d6 radiant',
        targeting: 'self',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:safekeeping': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Safekeeping',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:scintillant-blast': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Scintillant Blast',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:seal-away': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Seal Away',
    {
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    },
  ),
  'somanyrobots-spells-that-dont-suck:secret-missive': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Secret Missive',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:shape-winds': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Shape Winds',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:shatter-mind': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Shatter Mind',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:shooting-stars': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Shooting Stars',
    {
      effect: boardEffect(
        'Shooting Stars',
        [{ note: '6 stars; bonus action: 3d6 radiant burst' }],
        { summary: '6 stars; bonus action: 3d6 radiant burst', targeting: 'self', multi: false },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:siphon-life': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Siphon Life',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:sky-omen': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Sky Omen',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:sonic-rift': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Sonic Rift',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'half' },
        damage: [{ formula: '4d8', type: 'thunder' }],
        scaling: [
          { by: 'slot', level: 4, damage: [{ formula: '5d8', type: 'thunder' }] },
          { by: 'slot', level: 5, damage: [{ formula: '6d8', type: 'thunder' }] },
          { by: 'slot', level: 6, damage: [{ formula: '7d8', type: 'thunder' }] },
          { by: 'slot', level: 7, damage: [{ formula: '8d8', type: 'thunder' }] },
          { by: 'slot', level: 8, damage: [{ formula: '9d8', type: 'thunder' }] },
          { by: 'slot', level: 9, damage: [{ formula: '10d8', type: 'thunder' }] },
        ],
      },
    },
  ),
  'somanyrobots-spells-that-dont-suck:soul-transfer': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Soul Transfer',
    {
      effect: boardEffect('Soul Transfer', [{ note: 'Soul outside body' }], {
        summary: 'Soul outside body',
        targeting: 'self',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:sparking-shot': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Sparking Shot',
    {
      effect: boardEffect('Sparking Shot', [{ note: 'Next weapon attack: lightning burst' }], {
        summary: 'Next weapon attack: lightning burst',
        targeting: 'self',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:speak-with-nature': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Speak with Nature',
    {
      effect: boardEffect(
        'Speak with Nature',
        [{ note: 'Speaks with beasts (plants at higher slots)' }],
        { summary: 'Speaks with beasts (plants at higher slots)', targeting: 'self', multi: false },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:spectral-champion': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Spectral Champion',
    {
      effect: boardEffect(
        'Spectral Champion',
        [{ note: 'Weapon: +1d4 chosen damage; target cannot heal' }],
        {
          summary: 'Weapon: +1d4 chosen damage; target cannot heal',
          targeting: 'self',
          multi: false,
        },
      ),
    },
  ),
}
