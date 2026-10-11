// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { boardEffect, reviewedDamage, sourceProfile } from './reviewedProfile.ts'

/** Bind a Warlock verdict to its exact source, edition, and printed spell name. */
function warlock(name: string, rules: Omit<ReviewedSpellCasting, 'source' | 'edition' | 'name'>) {
  return sourceProfile('kobold-press-wz', '5.0', name, rules)
}

export const WARLOCK_GRIMOIRE_CASTING: Record<string, ReviewedSpellCasting> = {
  'kobold-press-wz:abrupt-hug': warlock('Abrupt Hug', {}),
  'kobold-press-wz:avert-evil-eye': warlock('Avert Evil Eye', {
    effect: boardEffect(
      'Avert Evil Eye',
      [{ note: 'Conditional save advantage; cancel one d20 disadvantage to end the ward' }],
      {
        summary: 'Evil-eye ward',
        targeting: 'ally',
        multi: false,
      },
    ),
  }),
  'kobold-press-wz:bardo': warlock('Bardo', {
    mechanics: { save: { ability: 'int', onSave: 'half' } },
  }),
  'kobold-press-wz:battle-chant': warlock('Battle Chant', {
    effect: boardEffect(
      'Battle Chant',
      [{ note: 'Successful hits: +1 damage; multiple casters chanting in unison: +2' }],
      {
        summary: 'Battle chant damage bonus',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-wz:bombardment-of-stings': warlock('Bombardment of Stings', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '4d6', type: 'piercing' }], 2, [1]),
    },
    effect: boardEffect(
      'Bombardment of Stings',
      [{ condition: 'Poisoned', duration: { type: 'rounds', rounds: 10 } }],
      {
        summary: 'Poisoned for 1 minute',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kobold-press-wz:charming-aesthetics': warlock('Charming Aesthetics', {}),
  'kobold-press-wz:commanders-pavilion': warlock("Commander's Pavilion", {}),
  'kobold-press-wz:devouring-darkness': warlock('Devouring Darkness', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      damage: [
        { formula: '6d10', type: 'piercing' },
        { formula: '5d6', type: 'psychic' },
      ],
    },
    persistsAfterSave: true,
    effect: boardEffect(
      'Devouring Darkness',
      [{ condition: 'Grappled' }, { condition: 'Restrained' }],
      {
        summary: 'Grappled and Restrained; escape at spell save DC',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kobold-press-wz:door-of-the-far-traveler': warlock('Door of the Far Traveler', {}),
  'kobold-press-wz:eternal-echo': warlock('Eternal Echo', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: boardEffect(
      'Eternal Echo',
      [{ note: 'Undead commanded; overrides prior loyalty and Turn Undead' }],
      {
        summary: 'Undead commanded',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kobold-press-wz:ethereal-stairs': warlock('Ethereal Stairs', {}),
  'kobold-press-wz:exchanged-knowledge': warlock('Exchanged Knowledge', {
    effect: boardEffect(
      'Exchanged Knowledge',
      [
        {
          note: 'Recall information: double proficiency; conditional advantage and later penalty remain in the spell',
        },
      ],
      {
        summary: 'Information conduit',
        targeting: 'self',
        multi: false,
      },
    ),
  }),
  'kobold-press-wz:hedgehog-dozen': warlock('Hedgehog Dozen', {
    effect: boardEffect(
      'Hedgehog Dozen',
      [
        {
          note: 'Eleven duplicates; conditional advantage; d8 redirects attacks; ends at five duplicates',
        },
      ],
      {
        summary: 'Illusory duplicates',
        targeting: 'ally',
        multi: false,
      },
    ),
  }),
  'kobold-press-wz:hypnagogia': warlock('Hypnagogia', {
    mechanics: { save: { ability: 'int', onSave: 'negates' } },
    effect: boardEffect(
      'Hypnagogia',
      [
        {
          note: 'Chosen mode: Sleep Paralysis, Phantasmata, or False Awakening; only that mode applies',
          duration: 'escape',
        },
      ],
      {
        summary: 'Chosen Hypnagogia mode',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kobold-press-wz:hypnic-jerk': warlock('Hypnic Jerk', {
    mechanics: {
      save: { ability: 'wis', onSave: 'none' },
      damage: [{ formula: '2d6', type: 'force' }],
    },
  }),
  'kobold-press-wz:inconspicuous-facade': warlock('Inconspicuous Facade', {}),
  'kobold-press-wz:march-of-the-dead': warlock('March of the Dead', {}),
  'kobold-press-wz:mind-maze': warlock('Mind Maze', {
    mechanics: { save: { ability: 'int', onSave: 'negates' } },
    effect: boardEffect(
      'Mind Maze',
      [
        { condition: 'Incapacitated' },
        { note: 'Repeat Intelligence save whenever damaged, not at turn end' },
      ],
      {
        summary: 'Incapacitated; damage can end the maze',
        targeting: 'enemy',
        multi: false,
      },
    ),
  }),
  'kobold-press-wz:mirror-realm': warlock('Mirror Realm', {}),
  'kobold-press-wz:order-of-revenge': warlock('Order of Revenge', {}),
  'kobold-press-wz:pierce-the-veil': warlock('Pierce the Veil', {}),
  'kobold-press-wz:reciprocating-portal': warlock('Reciprocating Portal', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: boardEffect(
      'Reciprocating Portal',
      [
        {
          note: 'Absent until caster next turn start; then falls 60 feet and lands Prone',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        },
      ],
      {
        summary: 'Portal return next caster turn',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
  'kobold-press-wz:remove-insulation': warlock('Remove Insulation', {
    effect: boardEffect(
      'Remove Insulation',
      [
        {
          note: 'After failed printed Fortitude save: lightning immunity becomes resistance, resistance is lost, or damage doubles',
        },
      ],
      {
        summary: 'Lightning protection reduced',
        targeting: 'enemy',
        multi: false,
      },
    ),
  }),
  'kobold-press-wz:revenges-eye': warlock("Revenge's Eye", {
    effect: boardEffect(
      'Revenge’s Eye',
      [{ note: 'Sees trails left by this caster’s Order of Revenge' }],
      {
        summary: 'Revenge trails visible',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-wz:rise-of-the-green': warlock('Rise of the Green', {}),
  'kobold-press-wz:rive': warlock('Rive', {
    mechanics: { attackRoll: true, damage: [{ formula: '5d8', type: 'cold' }] },
    attackKind: 'ranged',
    effect: boardEffect(
      'Rive',
      [
        {
          note: 'Only non-native targets: +3d6 psychic and Constitution save against Stunned until caster next turn end',
          duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
        },
      ],
      {
        summary: 'Conditional planar rider',
        targeting: 'enemy',
        multi: false,
      },
    ),
  }),
  'kobold-press-wz:storm-of-axes': warlock('Storm of Axes', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      damage: [{ formula: '6d8', type: 'slashing' }],
    },
    persistsAfterSave: true,
  }),
  'kobold-press-wz:subliminal-aversion': warlock('Subliminal Aversion', {
    effect: boardEffect(
      'Subliminal Aversion',
      [
        {
          modifier: {
            applies: 'attackRolls',
            mode: 'disadvantage',
            value: null,
            direction: 'incoming',
          },
        },
        { note: 'A melee attacker that hits takes 1d4 psychic damage' },
      ],
      {
        summary: 'Incoming attacks: disadvantage; melee-hit retaliation',
        targeting: 'ally',
        multi: false,
      },
    ),
  }),
  'kobold-press-wz:suppress-regeneration': warlock('Suppress Regeneration', {
    effect: boardEffect(
      'Suppress Regeneration',
      [
        {
          note: 'After failed printed Fortitude save: no Regeneration; magical healing still works',
        },
      ],
      {
        summary: 'Regeneration suppressed',
        targeting: 'enemy',
        multi: false,
      },
    ),
  }),
  'kobold-press-wz:threshold-slip': warlock('Threshold Slip', {}),
  'kobold-press-wz:toxic-pollen': warlock('Toxic Pollen', {}),
  'kobold-press-wz:vagrants-nondescript-cloak': warlock("Vagrant's Nondescript Cloak", {
    effect: boardEffect(
      'Vagrant’s Nondescript Cloak',
      [
        {
          note: 'Ward against Faerie Fire, Hold Person, and Order of Revenge; conditional saves and Locate Creature interference',
        },
      ],
      {
        summary: 'Nondescript ward',
        targeting: 'ally',
        multi: true,
      },
    ),
  }),
  'kobold-press-wz:vengeful-panopy-of-the-ley-line-ignited': warlock(
    'Vengeful Panoply of the Ley Line Ignited',
    {
      effect: boardEffect(
        'Vengeful Panoply of the Ley Line Ignited',
        [
          {
            note: 'Cloak; later ranged attacks and melee-hit retaliation; ley-line bond requirements stay in the spell',
          },
        ],
        {
          summary: 'Ley-line cloak',
          targeting: 'self',
          multi: false,
        },
      ),
    },
  ),
  'kobold-press-wz:who-goes-there': warlock('Who Goes There?', {}),
  'kobold-press-wz:zymurgic-aura': warlock('Zymurgic Aura', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      damage: [{ formula: '10d6', type: 'necrotic' }],
    },
    effect: boardEffect(
      'Zymurgic Aura',
      [
        {
          note: 'Hit point maximum reduced by damage taken until a long rest',
          duration: { type: 'manual' },
        },
      ],
      {
        summary: 'Damage also reduces hit point maximum',
        targeting: 'enemy',
        multi: true,
      },
    ),
  }),
}
