// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { kibblesDamage, kibblesProfile } from './kibblesProfile.ts'
import { boardEffect } from './reviewedProfile.ts'

export const KIBBLES_CASTING_9: Record<string, ReviewedSpellCasting> = {
  'kibblestasty-casting-compendium-v2.3:stone-forming': kibblesProfile('Stone Forming', {}),
  'kibblestasty-casting-compendium-v2.3:stone-pillar': kibblesProfile('Stone Pillar', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
  }),
  'kibblestasty-casting-compendium-v2.3:storm-shot': kibblesProfile('Storm Shot', {}),
  'kibblestasty-casting-compendium-v2.3:sudden-hazards': kibblesProfile('Sudden Hazards', {}),
  'kibblestasty-casting-compendium-v2.3:suffocate': kibblesProfile('Suffocate', {}),
  'kibblestasty-casting-compendium-v2.3:summon-archon': kibblesProfile('Summon Archon', {}),
  'kibblestasty-casting-compendium-v2.3:summon-dragon': kibblesProfile('Summon Dragon', {}),
  'kibblestasty-casting-compendium-v2.3:summon-monstrosity': kibblesProfile(
    'Summon Monstrosity',
    {},
  ),
  'kibblestasty-casting-compendium-v2.3:summon-ooze': kibblesProfile('Summon Ooze', {}),
  'kibblestasty-casting-compendium-v2.3:summon-plant': kibblesProfile('Summon Plant', {}),
  'kibblestasty-casting-compendium-v2.3:summon-swarm': kibblesProfile('Summon Swarm', {}),
  'kibblestasty-casting-compendium-v2.3:supernova': kibblesProfile('Supernova', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '30d8', type: 'radiant' }], 9, [0]),
    },
    effect: boardEffect('Supernova', [{ condition: 'Blinded', duration: 'escape' }], {
      summary: 'Blinded',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:swapping-curse': kibblesProfile('Swapping Curse', {
    effect: boardEffect('Swapping Curse', [{ note: 'Souls swapped; body statistics' }], {
      summary: 'Souls swapped; body statistics',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:thunder-note': kibblesProfile('Thunder Note', {
    mechanics: {
      save: { ability: 'con', onSave: 'negates' },
      ...kibblesDamage([{ formula: '1d8', type: 'thunder' }], 0, [1]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:thunder-pulse': kibblesProfile('Thunder Pulse', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '3d8', type: 'thunder' }], 3, [1]),
    },

    persistsAfterSave: true,
  }),
  'kibblestasty-casting-compendium-v2.3:thunder-punch': kibblesProfile('Thunder Punch', {
    attackKind: 'melee',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '3d8', type: 'thunder' }], 1, [1]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:thunderburst-mine': kibblesProfile('Thunderburst Mine', {}),
  'kibblestasty-casting-compendium-v2.3:time-anchor': kibblesProfile('Time Anchor', {}),
  'kibblestasty-casting-compendium-v2.3:time-bubble': kibblesProfile('Time Bubble', {}),
  'kibblestasty-casting-compendium-v2.3:time-loop': kibblesProfile('Time Loop', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Time Loop',
      [
        {
          note: 'Repeats previous turn',
          duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
          turnOwner: 'target',
          concentration: false,
        },
      ],
      { summary: 'Repeats previous turn', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:time-skip': kibblesProfile('Time Skip', {
    effect: boardEffect(
      'Time Skip',
      [
        {
          note: 'Vanished until next turn',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
          turnOwner: 'target',
          concentration: false,
        },
      ],
      { summary: 'Vanished until next turn', targeting: 'ally', multi: false },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:time-slip': kibblesProfile('Time Slip', {
    effect: boardEffect(
      'Time Slip',
      [
        { note: 'Reaction can negate eligible attack/spell; ends' },
        { modifier: { applies: 'ac', mode: 'flatBonus', value: 2, direction: 'outgoing' } },
      ],
      {
        summary: 'Reaction can negate eligible attack/spell; ends; AC: +2',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:time-trap': kibblesProfile('Time Trap', {}),
  'kibblestasty-casting-compendium-v2.3:tornado': kibblesProfile('Tornado', {}),
  'kibblestasty-casting-compendium-v2.3:tranquil-moment': kibblesProfile('Tranquil Moment', {}),
  'kibblestasty-casting-compendium-v2.3:twisting-eruption': kibblesProfile('Twisting Eruption', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: boardEffect(
      'Twisting Eruption',
      [{ condition: 'Restrained' }, { note: 'Turn start: 2d10 bludgeoning + 2d10 necrotic' }],
      {
        summary: 'Restrained; Turn start: 2d10 bludgeoning + 2d10 necrotic',
        targeting: 'enemy',
        multi: false,
      },
    ),
    persistsAfterSave: true,
  }),
  'kibblestasty-casting-compendium-v2.3:unburden': kibblesProfile('Unburden', {
    effect: boardEffect('Unburden', [{ note: 'Ignores armor Speed/Stealth penalties' }], {
      summary: 'Ignores armor Speed/Stealth penalties',
      targeting: 'ally',
      multi: false,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:unholy-wave': kibblesProfile('Unholy Wave', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...kibblesDamage([{ formula: '4d6', type: 'necrotic' }], 2, [1]),
    },
    effect: boardEffect('Unholy Wave', [{ note: 'First hit each turn: +1d6 necrotic' }], {
      summary: 'First hit each turn: +1d6 necrotic',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:unlocked-potential': kibblesProfile('Unlocked Potential', {
    effect: boardEffect(
      'Unlocked Potential',
      [{ note: 'Once/turn: +1d4 chosen roll, then 1 psychic' }],
      { summary: 'Once/turn: +1d4 chosen roll, then 1 psychic', targeting: 'ally', multi: false },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:unstable-explosion': kibblesProfile('Unstable Explosion', {
    mechanics: { save: { ability: 'dex', onSave: 'half' } },
  }),
}
