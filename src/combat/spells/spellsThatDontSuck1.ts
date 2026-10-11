// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { boardEffect, sourceProfile } from './reviewedProfile.ts'

export const SPELLS_THAT_DONT_SUCK_1: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-spells-that-dont-suck:adaptation': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Adaptation',
    {
      effect: boardEffect('Adaptation', [{ note: 'Adapted to chosen environment' }], {
        summary: 'Adapted to chosen environment',
        targeting: 'ally',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:alter-weather': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Alter Weather',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:animal-ally': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Animal Ally',
    {
      effect: boardEffect(
        'Animal Ally',
        [{ note: 'Beast ally: +1d6 damage; conditional advantage' }],
        {
          summary: 'Beast ally: +1d6 damage; conditional advantage',
          targeting: 'ally',
          multi: false,
        },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:animal-transformation': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Animal Transformation',
    {
      mechanics: { save: { ability: 'cha', onSave: 'negates' } },
      effect: boardEffect('Animal Transformation', [{ note: 'Beast form (beast HP)' }], {
        summary: 'Beast form (beast HP)',
        targeting: 'enemy',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:arcane-shelter': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Arcane Shelter',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:arcane-wall': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Arcane Wall',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:arcanist-s-sword': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    "Arcanist's Sword",
    {},
  ),
  'somanyrobots-spells-that-dont-suck:arctic-breath': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Arctic Breath',
    {
      mechanics: {
        save: { ability: 'dex', onSave: 'half' },
        damage: [{ formula: '2d8', type: 'cold' }],
        scaling: [
          { by: 'slot', level: 2, damage: [{ formula: '3d8', type: 'cold' }] },
          { by: 'slot', level: 3, damage: [{ formula: '4d8', type: 'cold' }] },
          { by: 'slot', level: 4, damage: [{ formula: '5d8', type: 'cold' }] },
          { by: 'slot', level: 5, damage: [{ formula: '6d8', type: 'cold' }] },
          { by: 'slot', level: 6, damage: [{ formula: '7d8', type: 'cold' }] },
          { by: 'slot', level: 7, damage: [{ formula: '8d8', type: 'cold' }] },
          { by: 'slot', level: 8, damage: [{ formula: '9d8', type: 'cold' }] },
          { by: 'slot', level: 9, damage: [{ formula: '10d8', type: 'cold' }] },
        ],
      },
      effect: boardEffect(
        'Arctic Breath',
        [
          {
            modifier: { applies: 'speed', mode: 'flatBonus', value: -10, direction: 'outgoing' },
            duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
            turnOwner: 'target',
          },
        ],
        { summary: 'Speed: -10', targeting: 'enemy', multi: true },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:assemble': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Assemble',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:aura-of-concealment': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Aura of Concealment',
    {
      effect: boardEffect('Aura of Concealment', [{ note: 'Aura: +5 Stealth; no tracks' }], {
        summary: 'Aura: +5 Stealth; no tracks',
        targeting: 'self',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:aura-of-truth': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Aura of Truth',
    {
      effect: boardEffect('Aura of Truth', [{ note: 'Cannot lie while affected by aura' }], {
        summary: 'Cannot lie while affected by aura',
        targeting: 'self',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:beast-perception': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Beast Perception',
    {
      effect: boardEffect('Beast Perception', [{ note: 'Enhanced chosen sense' }], {
        summary: 'Enhanced chosen sense',
        targeting: 'self',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:befriend': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Befriend',
    {
      effect: boardEffect('Befriend', [{ note: 'Chosen target: Persuasion/Deception advantage' }], {
        summary: 'Chosen target: Persuasion/Deception advantage',
        targeting: 'enemy',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:befriend-beast': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Befriend Beast',
    {
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
      effect: boardEffect('Befriend Beast', [{ condition: 'Charmed' }], {
        summary: 'Charmed',
        targeting: 'enemy',
        multi: true,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:benediction': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Benediction',
    {
      effect: boardEffect('Benediction', [{ note: 'Chosen check: +1d4 once' }], {
        summary: 'Chosen check: +1d4 once',
        targeting: 'ally',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:bewilder': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Bewilder',
    {
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
      effect: boardEffect(
        'Bewilder',
        [{ note: 'No reactions; d8 movement, d4 behavior', duration: 'escape' }],
        { summary: 'No reactions; d8 movement, d4 behavior', targeting: 'enemy', multi: true },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:black-ice': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Black Ice',
    {
      persistsAfterSave: true,
      mechanics: {
        save: { ability: 'dex', onSave: 'negates' },
        damage: [{ formula: '1d6', type: 'cold' }],
        scaling: [
          { by: 'character', level: 5, damage: [{ formula: '2d6', type: 'cold' }] },
          { by: 'character', level: 11, damage: [{ formula: '3d6', type: 'cold' }] },
          { by: 'character', level: 17, damage: [{ formula: '4d6', type: 'cold' }] },
        ],
      },
    },
  ),
  'somanyrobots-spells-that-dont-suck:blade-burst': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Blade Burst',
    {
      mechanics: {
        save: { ability: 'dex', onSave: 'negates' },
        damage: [{ formula: '1d6', type: 'slashing' }],
        scaling: [
          { by: 'character', level: 5, damage: [{ formula: '2d6', type: 'slashing' }] },
          { by: 'character', level: 11, damage: [{ formula: '3d6', type: 'slashing' }] },
          { by: 'character', level: 17, damage: [{ formula: '4d6', type: 'slashing' }] },
        ],
      },
    },
  ),
  'somanyrobots-spells-that-dont-suck:blazing-blade': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Blazing Blade',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:brilliance': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Brilliance',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:burst-of-flame': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Burst of Flame',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:call-for-aid': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Call for Aid',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:captivate': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Captivate',
    {
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
      effect: boardEffect(
        'Captivate',
        [
          { condition: 'Charmed', duration: { type: 'rounds', rounds: 10 } },
          {
            note: 'Initiative/other-creature Perception disadvantage',
            duration: { type: 'rounds', rounds: 10 },
          },
        ],
        {
          summary: 'Charmed; Initiative/other-creature Perception disadvantage',
          targeting: 'enemy',
          multi: true,
        },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:caustic-quarrel': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Caustic Quarrel',
    {
      mechanics: {
        attackRoll: true,
        damage: [{ formula: '6d4', type: 'acid' }],
        scaling: [
          { by: 'slot', level: 3, damage: [{ formula: '7d4', type: 'acid' }] },
          { by: 'slot', level: 4, damage: [{ formula: '8d4', type: 'acid' }] },
          { by: 'slot', level: 5, damage: [{ formula: '9d4', type: 'acid' }] },
          { by: 'slot', level: 6, damage: [{ formula: '10d4', type: 'acid' }] },
          { by: 'slot', level: 7, damage: [{ formula: '11d4', type: 'acid' }] },
          { by: 'slot', level: 8, damage: [{ formula: '12d4', type: 'acid' }] },
          { by: 'slot', level: 9, damage: [{ formula: '13d4', type: 'acid' }] },
        ],
      },
      effect: boardEffect(
        'Caustic Quarrel',
        [
          {
            note: 'Next turn end: 4d4 acid unless removed',
            duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
            turnOwner: 'target',
          },
        ],
        { summary: 'Next turn end: 4d4 acid unless removed', targeting: 'enemy', multi: false },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:circle-of-protection': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Circle of Protection',
    {
      effect: boardEffect('Circle of Protection', [{ note: 'Warded from chosen creature type' }], {
        summary: 'Warded from chosen creature type',
        targeting: 'self',
        multi: false,
      }),
    },
  ),
  'somanyrobots-spells-that-dont-suck:cold-snap': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Cold Snap',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'half' },
        damage: [{ formula: '3d8', type: 'cold' }],
        scaling: [
          { by: 'slot', level: 3, damage: [{ formula: '4d8', type: 'cold' }] },
          { by: 'slot', level: 4, damage: [{ formula: '5d8', type: 'cold' }] },
          { by: 'slot', level: 5, damage: [{ formula: '6d8', type: 'cold' }] },
          { by: 'slot', level: 6, damage: [{ formula: '7d8', type: 'cold' }] },
          { by: 'slot', level: 7, damage: [{ formula: '8d8', type: 'cold' }] },
          { by: 'slot', level: 8, damage: [{ formula: '9d8', type: 'cold' }] },
          { by: 'slot', level: 9, damage: [{ formula: '10d8', type: 'cold' }] },
        ],
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
    },
  ),
  'somanyrobots-spells-that-dont-suck:command-beast': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Command Beast',
    {
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
      effect: boardEffect(
        'Command Beast',
        [
          { condition: 'Charmed', duration: { type: 'rounds', rounds: 10 } },
          { note: 'Caster commands it', duration: { type: 'rounds', rounds: 10 } },
        ],
        { summary: 'Charmed; Caster commands it', targeting: 'enemy', multi: false },
      ),
    },
  ),
  'somanyrobots-spells-that-dont-suck:command-objects': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Command Objects',
    {},
  ),
  'somanyrobots-spells-that-dont-suck:cone-of-flame': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Cone of Flame',
    {
      mechanics: {
        save: { ability: 'dex', onSave: 'half' },
        damage: [{ formula: '3d6', type: 'fire' }],
        scaling: [
          { by: 'slot', level: 2, damage: [{ formula: '4d6', type: 'fire' }] },
          { by: 'slot', level: 3, damage: [{ formula: '5d6', type: 'fire' }] },
          { by: 'slot', level: 4, damage: [{ formula: '6d6', type: 'fire' }] },
          { by: 'slot', level: 5, damage: [{ formula: '7d6', type: 'fire' }] },
          { by: 'slot', level: 6, damage: [{ formula: '8d6', type: 'fire' }] },
          { by: 'slot', level: 7, damage: [{ formula: '9d6', type: 'fire' }] },
          { by: 'slot', level: 8, damage: [{ formula: '10d6', type: 'fire' }] },
          { by: 'slot', level: 9, damage: [{ formula: '11d6', type: 'fire' }] },
        ],
      },
    },
  ),
  'somanyrobots-spells-that-dont-suck:confinement': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Confinement',
    {},
  ),
}
