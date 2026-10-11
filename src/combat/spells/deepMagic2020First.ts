// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { sourceProfile, ruleReminder } from './reviewedProfile.ts'
import { condition } from '../effects.ts'

/** Bind a verdict to the approved Deep Magic 2020 card. */
function profile(name: string, rules: Omit<ReviewedSpellCasting, 'source' | 'edition' | 'name'>) {
  return sourceProfile('kobold-press-deepm', '5.0', name, rules)
}

export const DEEP_MAGIC_2020_FIRST: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:abhorrent-apparition': profile('Abhorrent Apparition', {
    mechanics: {
      save: { ability: 'wis', onSave: 'half' },
      damage: [{ formula: '6d8', type: 'psychic' }],
      scaling: [5, 6, 7, 8, 9].map((level) => ({
        by: 'slot',
        level,
        damage: [{ formula: `${level + 2}d8`, type: 'psychic' }],
      })),
    },
    effect: {
      summary: 'Frightened for 1 minute; repeat Wisdom save at turn end',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        {
          ...condition('Frightened', { source, duration: { type: 'rounds', rounds: 10 } }),
          durationNote: '1 minute; repeat Wisdom save at the end of each affected turn manually',
        },
      ],
    },
    manual:
      'Select creatures within 15 feet of the chosen spot. Failed saves frighten them of the caster for 1 minute. Repeat Wisdom saves at each affected turn end manually; success ends fright. Psychic damage +1d8 per slot above 4th.',
  }),
  'kobold-press-deepm:accelerate': profile('Accelerate', {
    effect: ruleReminder(
      'Accelerate',
      'Up to 3 willing creatures: doubled walking speed, bonus-action Dash, and Dexterity save advantage. Apply benefits manually; +1 target per higher slot.',
      { type: 'rounds', rounds: 10 },
      'ally',
      true,
    ),
    manual:
      'Choose up to 3 willing creatures touched, including self. Apply doubled walking speed, bonus-action Dash, and Dexterity save advantage manually. +1 target per slot above 3rd.',
  }),
  'kobold-press-deepm:acid-gate': profile('Acid Gate', {
    effect: ruleReminder(
      'Acid Gate',
      'Track portal and familiar destination within 100 miles. Caster and 3 chosen creatures pass safely; other entrants take 10d6 acid and Intelligence failure teleports 1d100 × 10 feet horizontally at random. Success prevents teleportation, not acid. Later contact damage manual; +1 allowed creature per higher slot.',
      { type: 'rounds', rounds: 10 },
      'self',
    ),
    manual:
      'No initial damage or save. Check destination exists and is accessible. Resolve unauthorized entry, teleportation, and turn-end contact damage manually; successful Intelligence saves do not negate acid damage.',
  }),
  'kobold-press-deepm:acid-rain': profile('Acid Rain', {
    effect: ruleReminder(
      'Acid Rain',
      'Heavily obscured cylinder, 20 feet wide and 30 feet high. Turn start or first entry on its own turn: Dexterity save for 6d6 acid, half on success. First turn start after leaving: half damage. +1d6 per higher slot; later damage manual.',
      { type: 'rounds', rounds: 10 },
      'self',
    ),
    manual:
      'No creation damage. Track cylinder, obscuration, later Dexterity saves, and half damage at first turn start after leaving manually. +1d6 acid per slot above 5th.',
  }),
  'kobold-press-deepm:adjust-position': profile('Adjust Position', {
    manual:
      'Move one willing creature within 30 feet by 5 feet manually, through unobstructed intervening space without opportunity attacks. +1 willing target per slot above 1st.',
  }),
  'kobold-press-deepm:agonizing-mark': profile('Agonizing Mark', {
    effect: ruleReminder(
      'Agonizing Mark',
      'No initial save. Each time the caster damages this target, it makes a Charisma save or falls prone. Resolve later saves and standing manually.',
      { type: 'rounds', rounds: 10 },
    ),
    manual:
      'Mark one visible creature. No initial save or damage. Each later instance of caster damage triggers a Charisma save against prone; resolve manually.',
  }),
  'kobold-press-deepm:alchemical-form': profile('Alchemical Form', {
    effect: ruleReminder(
      'Alchemical Form',
      'Apply printed damage/condition immunities, conditional nonmagical resistances, 20-foot speed, squeezing, and equipment/action restrictions manually. Later melee weapon attack uses casting modifier plus proficiency for 4d6 acid or poison, then Constitution save against poisoned until caster next turn start.',
      { type: 'rounds', rounds: 10 },
      'self',
    ),
    manual:
      'Transformation only; no initial attack. Defenses, movement, restrictions, chosen damage type, and later weapon attack/secondary save remain manual. Not concentration.',
  }),
  'kobold-press-deepm:ale-dritch-blast': profile('Ale-dritch Blast', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      damage: [{ formula: '1d8', type: 'cold' }],
      scaling: [5, 11, 17].map((level, i) => ({
        by: 'character',
        level,
        damage: [{ formula: `${i + 2}d8`, type: 'cold' }],
      })),
    },
    manual:
      'On hit, resolve a separate Constitution save against poisoned until target next turn end manually. Save disadvantage only if target drank alcohol within the last hour. Objects are resolved manually. Cold damage scales at caster levels 5, 11, and 17.',
  }),
  'kobold-press-deepm:ally-aegis': profile('Ally Aegis', {
    effect: ruleReminder(
      'Ally Aegis',
      'Until caster next turn start: +5 armor class, force immunity, and against enemy damaging spells half damage on failed saves and none on success. Offers no protection against psychic damage. Apply defenses manually; +1 ally per higher slot.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'ally',
      true,
    ),
    manual:
      'Requires ally hit by attack or targeted by nonpsychic damaging spell. Apply conditional defenses manually, including triggering damage; psychic damage gets no protection. +1 ally per slot above 6th.',
  }),
  'kobold-press-deepm:alone': profile('Alone', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Alone',
      'Cannot perceive, target, or interact with its allies. An ally hitting it with a melee attack permits another Wisdom save; success ends the spell. No blanket blinded or deafened condition.',
      { type: 'rounds', rounds: 10 },
    ),
    manual:
      'Failed Wisdom save hides only the target’s allies from it. Apply relational perception restriction manually; an ally melee hit permits another Wisdom save to end the spell.',
  }),
  'kobold-press-deepm:alter-arrows-fortune': profile('Alter Arrow’s Fortune', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    manual:
      'Reaction to enemy ranged weapon/spell attack hitting an ally. On Charisma failure, reroll that attack and use the lower result manually; no lasting disadvantage effect.',
  }),
  'kobold-press-deepm:altheas-travel-tent': profile('Althea’s Travel Tent', {
    manual:
      'Touch a properly pitched canvas tent. Track shelter, occupants, higher-slot rooms/services, and expulsion to nearest unoccupied spaces on expiry manually. No combat roll.',
  }),
  'kobold-press-deepm:amplify-gravity': profile('Amplify Gravity', {
    persistsAfterSave: true,
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    effect: {
      summary: 'Prone; gravity area and later saves manual',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        {
          ...condition('Prone', { source, duration: { type: 'manual' } }),
          concentration: false,
          durationNote: 'Until it stands; Strength save required inside gravity area',
        },
      ],
    },
    manual:
      'Initial saves only for grounded creatures in 50-foot radius. Track area even after successful saves: later entry/turn end and standing require Strength saves. Grounded speed halved, Dexterity checks/ranged attacks disadvantaged. Falling damage 2d6 per 5 feet, maximum 40d6; resolve manually.',
  }),
  'kobold-press-deepm:analyze-device': profile('Analyze Device', {
    manual:
      'Identify mechanical properties, functions, and activation/deactivation of one touched construct or clockwork device manually after 1 hour. No combat roll.',
  }),
  'kobold-press-deepm:ancestors-strength': profile('Ancestor’s Strength', {
    effect: ruleReminder(
      'Ancestor’s Strength',
      'Willing touched creature: Strength check advantage and one size category larger for carrying, lifting, pushing, pulling, and breaking objects. Apply benefits manually.',
      { type: 'manual' },
      'ally',
    ),
    manual:
      'Track up to 8 hours of concentration. Apply Strength check advantage and effective size for the printed tasks manually; creature size itself does not change.',
  }),
  'kobold-press-deepm:anchoring-rope': profile('Anchoring Rope', {
    effect: ruleReminder(
      'Anchoring Rope',
      'Fixed anchor within 30 feet; choose 5–30-foot rope, capacity 800 pounds. Falling reaction stops fall without damage. Bonus action dismisses rope. Additional ropes every two slot levels above 1st, attached to different creatures.',
      { type: 'rounds', rounds: 50 },
      'self',
    ),
    manual:
      'Track anchor, rope length, load, fall interception, and bonus-action dismissal manually. Higher slots add ropes on different creatures; no initial attack or save.',
  }),
  'kobold-press-deepm:ancient-shade': profile('Ancient Shade', {
    manual:
      'Question eligible bone remains or unintelligent undead manually. Number of questions depends on time since death; no truthful-answer compulsion and no resurrection. Intelligent undead unaffected.',
  }),
  'kobold-press-deepm:angelic-guardian': profile('Angelic Guardian', {
    effect: ruleReminder(
      'Angelic Guardian',
      '+2 armor class. First failed Dexterity save may be rerolled using target reaction, then spell ends. Apply armor bonus and reroll manually; remove reminder and concentration when spent.',
      { type: 'rounds', rounds: 10 },
      'ally',
    ),
    manual:
      'Apply +2 armor class manually. First failed Dexterity save allows a reaction reroll and ends spell; clear effect and concentration manually when used.',
  }),
  'kobold-press-deepm:animate-ghoul': profile('Animate Ghoul', {
    manual:
      'Raise eligible Small/Medium humanoid corpse as controlled standard ghoul manually. 3rd slot permits Large humanoid/Large ghoul; 4th or higher creates ghast with more expensive component. No initial attack; creation has no printed expiry.',
  }),
  'kobold-press-deepm:animate-greater-undead': profile('Animate Greater Undead', {
    manual:
      'After 1 hour, create skeleton/zombie from bones or Large/Huge humanoid corpse using appropriate printed stat block manually. Control lasts 24 hours; recast while controlled renews up to four existing servants. +1 newly animated creature per slot above 6th. No initial attack.',
  }),
}
