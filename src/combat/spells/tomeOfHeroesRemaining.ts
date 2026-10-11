// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import { condition, flatBonus } from '../effects.ts'
import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { boardEffect } from './reviewedProfile.ts'
import type { SpellEffectDef } from './shared.ts'
import { reviewed } from './tomeOfHeroes.ts'

/** Mark a permanent-until-removed consequence of the initial save. */
function prone(): SpellEffectDef {
  return {
    summary: 'Knocked prone',
    targeting: 'enemy',
    multi: true,
    build: ({ source }) => [{ ...condition('Prone', { source }), concentration: false }],
  }
}

export const TOME_OF_HEROES_REMAINDER: Record<string, ReviewedSpellCasting> = {
  'kobold-press-toh:butterfly-effect': reviewed('Butterfly Effect', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: boardEffect(
      'Butterfly Effect',
      [
        { condition: 'Charmed', duration: 'escape' },
        { note: 'No reactions; d10 behavior each turn', duration: 'escape' },
      ],
      { summary: 'Charmed; No reactions; d10 behavior each turn', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-toh:calm-beasts': reviewed('Calm Beasts', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: boardEffect(
      'Calm Beasts',
      [
        {
          note: 'Calmed: charm/fear suppressed or indifferent',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Calmed: charm/fear suppressed or indifferent', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-toh:conjure-spectral-allies': reviewed('Conjure Spectral Allies', {
    mechanics: {
      damage: [{ formula: '6d10', type: 'necrotic' }],
      save: { ability: 'wis', onSave: 'half' },
    },
    effect: boardEffect(
      'Conjure Spectral Allies',
      [
        {
          condition: 'Frightened',
          duration: 'escape',
          fallbackDuration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Frightened', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-toh:divine-retribution': reviewed('Divine Retribution', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect(
      'Divine Retribution',
      [
        {
          condition: 'Stunned',
          duration: 'escape',
          fallbackDuration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Stunned', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-toh:emerald-eyes': reviewed('Emerald Eyes', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Emerald Eyes',
      [
        {
          note: 'Attacks nearest creature except caster',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Attacks nearest creature except caster', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-toh:eruption': reviewed('Eruption', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '8d6', type: 'bludgeoning' }],
      save: { ability: 'str', onSave: 'half' },
    },
    effect: prone(),
  }),
  'kobold-press-toh:glare': reviewed('Glare', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Glare',
      [{ note: 'No actions on next turn (2 if failed by 5)', duration: { type: 'manual' } }],
      { summary: 'No actions on next turn (2 if failed by 5)', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-toh:immolating-gibbet': reviewed('Immolating Gibbet', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: boardEffect(
      'Immolating Gibbet',
      [
        { condition: 'Restrained', duration: 'escape' },
        { note: 'Turn start: Con save, 7d6 fire (half on save)', duration: 'escape' },
      ],
      {
        summary: 'Restrained; Turn start: Con save, 7d6 fire (half on save)',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kobold-press-toh:inexorable-summons': reviewed('Inexorable Summons', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
  }),
  'kobold-press-toh:jarring-growl': reviewed('Jarring Growl', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Jarring Growl',
      [
        {
          note: 'Caster attacks: advantage',
          duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
        },
      ],
      { summary: 'Caster attacks: advantage', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-toh:lightless-torch': reviewed('Lightless Torch', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
  }),
  'kobold-press-toh:long-game': reviewed('Long Game', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: boardEffect('Long Game', [{ note: 'Latent psychic curse' }], {
      summary: 'Latent psychic curse',
      targeting: 'enemy',
      multi: false,
    }),
  }),
  'kobold-press-toh:magma-spray': reviewed('Magma Spray', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '3d8', type: 'fire' }],
      save: { ability: 'dex', onSave: 'half' },
    },
  }),
  'kobold-press-toh:mass-faerie-fire': reviewed('Mass Faerie Fire', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: boardEffect(
      'Mass Faerie Fire',
      [
        {
          note: 'Outlined; cannot benefit from invisibility',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Outlined; cannot benefit from invisibility', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-toh:oathbound-implement': reviewed('Oathbound Implement', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect('Oathbound Implement', [{ note: 'Bound to weapon task' }], {
      summary: 'Bound to weapon task',
      targeting: 'enemy',
      multi: false,
    }),
  }),
  'kobold-press-toh:outmaneuver': reviewed('Outmaneuver', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: {
      summary: 'Speed 0 until the end of its next turn',
      targeting: 'enemy',
      build: ({ source, target }) => [
        flatBonus('Outmaneuver', 'zero', {
          source: target?.combatantId ?? source,
          applies: 'speed',
          duration: target ? { type: 'untilSourceTurn', when: 'endOfTurn' } : { type: 'manual' },
        }),
      ],
    },
  }),
  'kobold-press-toh:power-word-fling': reviewed('Power Word Fling', {
    effect: boardEffect(
      'Power Word Fling',
      [{ condition: 'Prone', duration: { type: 'manual' }, concentration: false }],
      { summary: 'Knocked Prone', targeting: 'enemy', multi: false },
    ),
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
  }),
  'kobold-press-toh:reapers-knell': reviewed("Reaper's Knell", {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      "Reaper's Knell",
      [
        {
          note: 'On death: ally heals 2d8 + casting modifier',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'On death: ally heals 2d8 + casting modifier', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-toh:shared-frenzy': reviewed('Shared Frenzy', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: boardEffect(
      'Shared Frenzy',
      [{ note: 'Resist B/P/S; attack advantage', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Resist B/P/S; attack advantage', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-toh:silvershout': reviewed('Silvershout', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: boardEffect(
      'Silvershout',
      [{ note: 'Weapon attacks count as silvered', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Weapon attacks count as silvered', targeting: 'enemy', multi: true },
    ),
  }),
  'kobold-press-toh:smelting-blast': reviewed('Smelting Blast', {
    mechanics: { attackRoll: true, damage: [{ formula: '2d8', type: 'fire' }] },
  }),
  'kobold-press-toh:sneer': reviewed('Sneer', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
  }),
  'kobold-press-toh:steam-gout': reviewed('Steam Gout', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '2d8', type: 'fire' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: prone(),
  }),
  'kobold-press-toh:sudden-stampede': reviewed('Sudden Stampede', {
    mechanics: {
      damage: [{ formula: '6d10', type: 'bludgeoning' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: prone(),
  }),
  'kobold-press-toh:war-horn': reviewed('War Horn', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect('War Horn', [{ condition: 'Frightened', duration: 'escape' }], {
      summary: 'Frightened',
      targeting: 'enemy',
      multi: true,
    }),
  }),
  'kobold-press-toh:bloodlust': reviewed('Bloodlust', {
    effect: boardEffect(
      'Bloodlust',
      [
        {
          modifier: {
            applies: 'abilityChecks',
            mode: 'advantage',
            value: null,
            direction: 'outgoing',
            abilities: ['str'],
          },
          duration: { type: 'rounds', rounds: 10 },
        },
        { note: '+1d6 weapon damage', duration: { type: 'rounds', rounds: 10 } },
      ],
      { summary: 'Checks (str): advantage; +1d6 weapon damage', targeting: 'ally', multi: false },
    ),
  }),
  'kobold-press-toh:dreamwine': reviewed('Dreamwine', {
    effect: boardEffect(
      'Dreamwine',
      [
        {
          modifier: {
            applies: 'abilityChecks',
            mode: 'advantage',
            value: null,
            direction: 'outgoing',
            abilities: ['cha'],
          },
        },
        {
          modifier: {
            applies: 'savingThrows',
            mode: 'advantage',
            value: null,
            direction: 'outgoing',
            abilities: ['cha'],
          },
        },
        { note: 'Sees invisible and Ethereal' },
      ],
      {
        summary: 'Checks (cha): advantage; Saves (cha): advantage; Sees invisible and Ethereal',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-toh:wild-hunt': reviewed('Wild Hunt', {
    effect: boardEffect(
      'Wild Hunt',
      [
        {
          modifier: { applies: 'ac', mode: 'flatBonus', value: 1, direction: 'outgoing' },
          note: '1 to rolls',
        },
        { note: 'Charm/fear immune; first attack extra die' },
      ],
      {
        summary: '1 to rolls; Charm/fear immune; first attack extra die',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-toh:armored-formation': reviewed('Armored Formation', {
    effect: boardEffect(
      'Armored Formation',
      [
        {
          note: 'Formation: +2/+3 AC; +1d6/+2d6 weapon damage',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      { summary: 'Formation: +2/+3 AC; +1d6/+2d6 weapon damage', targeting: 'ally', multi: true },
    ),
  }),
  'kobold-press-toh:battle-mind': reviewed('Battle Mind', {
    effect: boardEffect(
      'Battle Mind',
      [
        {
          note: 'Bonus action: chosen tactical benefit',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      { summary: 'Bonus action: chosen tactical benefit', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-toh:beast-within': reviewed('Beast Within', {
    effect: boardEffect('Beast Within', [{ note: 'Resist nonsilvered B/P/S; claws and bite' }], {
      summary: 'Resist nonsilvered B/P/S; claws and bite',
      targeting: 'ally',
      multi: true,
    }),
  }),
  'kobold-press-toh:feint': reviewed('Feint', {
    effect: boardEffect(
      'Feint',
      [
        {
          note: 'Caster’s next attack: advantage',
          duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
        },
      ],
      { summary: 'Caster’s next attack: advantage', targeting: 'enemy', multi: false },
    ),
  }),
  'kobold-press-toh:fey-touched-blade': reviewed('Fey-Touched Blade', {
    effect: boardEffect('Fey-Touched Blade', [{ note: 'Weapon hits: +1d4 chosen damage' }], {
      summary: 'Weapon hits: +1d4 chosen damage',
      targeting: 'ally',
      multi: true,
    }),
  }),
  'kobold-press-toh:invested-champion': reviewed('Invested Champion', {
    effect: boardEffect('Invested Champion', [{ note: 'Champion/charge bond' }], {
      summary: 'Champion/charge bond',
      targeting: 'ally',
      multi: true,
    }),
  }),
  'kobold-press-toh:less-fool-i': reviewed('Less Fool, I', {
    effect: boardEffect(
      'Less Fool, I',
      [
        {
          note: 'Influence checks against it: disadvantage',
          duration: { type: 'rounds', rounds: 100 },
        },
      ],
      { summary: 'Influence checks against it: disadvantage', targeting: 'ally', multi: false },
    ),
  }),
  'kobold-press-toh:mantle-of-the-brave': reviewed('Mantle of the Brave', {
    effect: boardEffect('Mantle of the Brave', [{ note: 'Next fear save: advantage' }], {
      summary: 'Next fear save: advantage',
      targeting: 'ally',
      multi: true,
    }),
  }),
  'kobold-press-toh:martyrs-rally': reviewed("Martyr's Rally", {
    effect: boardEffect(
      "Martyr's Rally",
      [{ note: 'Caster at 0 HP: attack advantage', duration: { type: 'rounds', rounds: 10 } }],
      { summary: 'Caster at 0 HP: attack advantage', targeting: 'ally', multi: true },
    ),
  }),
  'kobold-press-toh:muted-foe': reviewed('Muted Foe', {
    effect: boardEffect(
      'Muted Foe',
      [
        {
          note: 'Next weapon hit: +1d6 thunder; can silence target',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      {
        summary: 'Next weapon hit: +1d6 thunder; can silence target',
        targeting: 'ally',
        multi: false,
      },
    ),
  }),
  'kobold-press-toh:never-surrender': reviewed('Never Surrender', {
    effect: boardEffect(
      'Never Surrender',
      [{ note: 'Conscious at 0 HP until healed', duration: { type: 'manual' } }],
      { summary: 'Conscious at 0 HP until healed', targeting: 'ally', multi: false },
    ),
  }),
  'kobold-press-toh:oversized-paws': reviewed('Oversized Paws', {
    effect: boardEffect(
      'Oversized Paws',
      [{ note: '+1d4 unarmed damage', duration: { type: 'rounds', rounds: 10 } }],
      { summary: '+1d4 unarmed damage', targeting: 'ally', multi: true },
    ),
  }),
  'kobold-press-toh:retribution': reviewed('Retribution', {
    effect: boardEffect('Retribution', [{ note: 'Next melee attacker: half damage reflected' }], {
      summary: 'Next melee attacker: half damage reflected',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kobold-press-toh:sightburst': reviewed('Sightburst', {
    effect: boardEffect(
      'Sightburst',
      [
        {
          note: 'Blindsight 100 ft; hazard save advantage',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      { summary: 'Blindsight 100 ft; hazard save advantage', targeting: 'self', multi: false },
    ),
  }),
  'kobold-press-toh:spite': reviewed('Spite', {
    effect: boardEffect('Spite', [{ note: 'First attacker takes 3d6 psychic' }], {
      summary: 'First attacker takes 3d6 psychic',
      targeting: 'self',
      multi: false,
    }),
  }),
  'kobold-press-toh:trollish-charge': reviewed('Trollish Charge', {
    effect: boardEffect(
      'Trollish Charge',
      [
        {
          note: 'Charge can frighten; higher damage vs target',
          duration: { type: 'rounds', rounds: 10 },
        },
      ],
      { summary: 'Charge can frighten; higher damage vs target', targeting: 'ally', multi: true },
    ),
  }),
  'kobold-press-toh:ambush-chute': reviewed('Ambush Chute', {}),
  'kobold-press-toh:betraying-bauble': reviewed('Betraying Bauble', {}),
  'kobold-press-toh:bolster-fortifications': reviewed('Bolster Fortifications', {}),
  'kobold-press-toh:conjure-construct': reviewed('Conjure Construct', {}),
  'kobold-press-toh:convey-inner-peace': reviewed('Convey Inner Peace', {}),
  'kobold-press-toh:enchanted-bloom': reviewed('Enchanted Bloom', {}),
  'kobold-press-toh:fey-food': reviewed('Fey Food', {}),
  'kobold-press-toh:fuse-armor': reviewed('Fuse Armor', {}),
  'kobold-press-toh:gale': reviewed('Gale', {}),
  'kobold-press-toh:high-ground': reviewed('High Ground', {}),
  'kobold-press-toh:instant-armored-vehicle': reviewed('Instant Armored Vehicle', {}),
  'kobold-press-toh:jagged-forcelance': reviewed('Jagged Forcelance', {}),
  'kobold-press-toh:life-burst': reviewed('Life Burst', {}),
  'kobold-press-toh:mud': reviewed('Mud', {}),
  'kobold-press-toh:pipers-lure': reviewed("Piper's Lure", {}),
  'kobold-press-toh:portal-jaunt': reviewed('Portal Jaunt', {}),
  'kobold-press-toh:portal-trap': reviewed('Portal Trap', {}),
  'kobold-press-toh:rebounding-bolt': reviewed('Rebounding Bolt', {}),
  'kobold-press-toh:repulsing-wall': reviewed('Repulsing Wall', {}),
  'kobold-press-toh:rockfall-ward': reviewed('Rockfall Ward', {}),
  'kobold-press-toh:sacrifice-pawn': reviewed('Sacrifice Pawn', {}),
  'kobold-press-toh:sacrificial-healing': reviewed('Sacrificial Healing', {}),
  'kobold-press-toh:safe-transposition': reviewed('Safe Transposition', {}),
  'kobold-press-toh:secret-blind': reviewed('Secret Blind', {}),
  'kobold-press-toh:spiked-barricade': reviewed('Spiked Barricade', {}),
  'kobold-press-toh:stone-fetch': reviewed('Stone Fetch', {}),
  'kobold-press-toh:toadstool-ring': reviewed('Toadstool Ring', {}),
  'kobold-press-toh:vine-carpet': reviewed('Vine Carpet', {}),
}
