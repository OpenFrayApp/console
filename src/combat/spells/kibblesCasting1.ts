// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { condition } from '../effects.ts'
import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { kibblesDamage, kibblesProfile } from './kibblesProfile.ts'
import { boardEffect } from './reviewedProfile.ts'

export const KIBBLES_CASTING_1: Record<string, ReviewedSpellCasting> = {
  'kibblestasty-casting-compendium-v2.3:acid-bubble': kibblesProfile('Acid Bubble', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '3d4', type: 'acid' }], 1, [2]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:acid-rain': kibblesProfile('Acid Rain', {}),
  'kibblestasty-casting-compendium-v2.3:acidic-pit': kibblesProfile('Acidic Pit', {}),
  'kibblestasty-casting-compendium-v2.3:aero-barrage': kibblesProfile('Aero Barrage', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '2d8', type: 'slashing' }], 4, [0]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:aether-lance': kibblesProfile('Aether Lance', {}),
  'kibblestasty-casting-compendium-v2.3:aether-storm': kibblesProfile('Aether Storm', {}),
  'kibblestasty-casting-compendium-v2.3:alacrity': kibblesProfile('Alacrity', {
    effect: boardEffect(
      'Alacrity',
      [
        {
          note: 'Restricted extra action; no benefit with Haste',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      {
        summary: 'Restricted extra action; no benefit with Haste',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:aldricor-s-elemental-rebuke': kibblesProfile(
    "Aldricor's Elemental Rebuke",
    {},
  ),
  'kibblestasty-casting-compendium-v2.3:angelic-slash': kibblesProfile('Angelic Slash', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '5d8', type: 'radiant' }], 3, [1]),
    },
  }),
  'kibblestasty-casting-compendium-v2.3:animate-shadow': kibblesProfile('Animate Shadow', {}),
  'kibblestasty-casting-compendium-v2.3:anvil-drop': kibblesProfile('Anvil Drop', {}),
  'kibblestasty-casting-compendium-v2.3:arcane-ablation': kibblesProfile('Arcane Ablation', {
    effect: boardEffect('Arcane Ablation', [{ note: 'Temp HP renew at turn start with 1 fewer' }], {
      summary: 'Temp HP renew at turn start with 1 fewer',
      targeting: 'ally',
      multi: false,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:arcane-conduit': kibblesProfile('Arcane Conduit', {
    effect: boardEffect(
      'Arcane Conduit',
      [{ note: 'Resist magic except force; escalating force/turn' }],
      {
        summary: 'Resist magic except force; escalating force/turn',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:arcane-weapon': kibblesProfile('Arcane Weapon', {}),
  'kibblestasty-casting-compendium-v2.3:arcanist-s-sword': kibblesProfile('Arcanist’s Sword', {}),
  'kibblestasty-casting-compendium-v2.3:arctic-aura': kibblesProfile('Arctic Aura', {
    effect: boardEffect('Arctic Aura', [{ note: 'Turn start in aura: Con save, 2d8 cold' }], {
      summary: 'Turn start in aura: Con save, 2d8 cold',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:arctic-breath': kibblesProfile('Arctic Breath', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '2d8', type: 'cold' }], 1, [1]),
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
  }),
  'kibblestasty-casting-compendium-v2.3:avalanche': kibblesProfile('Avalanche', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '6d10', type: 'bludgeoning' }], 6, [1]),
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
  'kibblestasty-casting-compendium-v2.3:awaken-rope': kibblesProfile('Awaken Rope', {}),
  'kibblestasty-casting-compendium-v2.3:baba-s-walking-hut': kibblesProfile(
    'Baba’s Walking Hut',
    {},
  ),
  'kibblestasty-casting-compendium-v2.3:bad-blood': kibblesProfile('Bad Blood', {
    mechanics: {
      save: { ability: 'con', onSave: 'negates' },
      ...kibblesDamage([{ formula: '1d12', type: 'poison' }], 1, [0]),
    },
    effect: boardEffect(
      'Bad Blood',
      [
        { condition: 'Poisoned', duration: 'escape' },
        { note: 'Failed escape: 1d4 poison', duration: 'escape' },
      ],
      { summary: 'Poisoned; Failed escape: 1d4 poison', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:beam-of-annihilation': kibblesProfile(
    'Beam of Annihilation',
    {},
  ),
  'kibblestasty-casting-compendium-v2.3:become-fire': kibblesProfile('Become Fire', {
    effect: boardEffect(
      'Become Fire',
      [
        {
          note: 'Entry/melee retaliation: 1d6 fire; fire form',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      { summary: 'Entry/melee retaliation: 1d6 fire; fire form', targeting: 'self', multi: false },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:become-stone': kibblesProfile('Become Stone', {
    effect: boardEffect(
      'Become Stone',
      [{ condition: 'Petrified', duration: { type: 'untilSourceTurn', when: 'startOfTurn' } }],
      { summary: 'Petrified', targeting: 'self', multi: false },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:become-water': kibblesProfile('Become Water', {
    effect: boardEffect(
      'Become Water',
      [
        {
          note: 'Water form; resist nonmagic B/P/S',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      { summary: 'Water form; resist nonmagic B/P/S', targeting: 'self', multi: false },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:become-wind': kibblesProfile('Become Wind', {
    effect: boardEffect(
      'Become Wind',
      [
        {
          note: 'Wind form; Fly 30 ft',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      { summary: 'Wind form; Fly 30 ft', targeting: 'self', multi: false },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:befuddling-curse': kibblesProfile('Befuddling Curse', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect('Befuddling Curse', [{ note: 'Believes chosen pair swapped places' }], {
      summary: 'Believes chosen pair swapped places',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:bile-beam': kibblesProfile('Bile Beam', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '12d4', type: 'acid' }], 4, [1]),
    },
    effect: boardEffect(
      'Bile Beam',
      [
        {
          note: 'Next turn end: 4d4 acid',
          duration: { type: 'manual' },
          durationNote:
            'Until acid damage is resolved at the end of the affected creature’s next turn',
        },
      ],
      { summary: 'Next turn end: 4d4 acid', targeting: 'enemy', multi: true },
    ),
  }),
  'kibblestasty-casting-compendium-v2.3:binding-curse': kibblesProfile('Binding Curse', {
    effect: boardEffect('Binding Curse', [{ note: 'Bound to anchor; saves limit movement' }], {
      summary: 'Bound to anchor; saves limit movement',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kibblestasty-casting-compendium-v2.3:blackhole': kibblesProfile('Blackhole', {}),
}
