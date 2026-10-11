// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { condition, flatBonus, reminder } from '../effects.ts'
import { sourceProfile, ruleReminder, nextTurnCondition } from './reviewedProfile.ts'

/** Bind a reviewed Tome of Heroes profile to its printed source and edition. */
export function reviewed(
  name: string,
  profile: Omit<ReviewedSpellCasting, 'source' | 'edition' | 'name'>,
): ReviewedSpellCasting {
  return sourceProfile('kobold-press-toh', '5.0', name, profile)
}

export const TOME_OF_HEROES_CASTING: Record<string, ReviewedSpellCasting> = {
  'kobold-press-toh:clear-the-board': reviewed('Clear the Board', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    manual:
      'Select up to six hostile creatures within range for Wisdom saves. Teleport failed targets up to 90 feet in the opposite cardinal direction from yourself and up to five willing friendly creatures. Destinations must be visible, unoccupied, on a floor or ground, and not dangerous terrain. Resolve all movement manually.',
  }),
  'kobold-press-toh:forced-reposition': reviewed('Forced Reposition', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    manual:
      'Only unwilling targets make the Constitution save. Teleport the target to a visible unoccupied space up to 60 feet above you; never into a solid object. Resolve falling, flight, and falling damage manually. One additional target per slot above 4th, within 30 feet of each other.',
  }),
  'kobold-press-toh:power-word-rend': reviewed('Power Word Rend', {
    mechanics: {
      damage: [{ formula: '4d6+20', type: 'force' }],
      save: { ability: 'con', onSave: 'half' },
    },
    manual:
      'Choose one visible creature within range that has vital internal organs. Constructs, oozes, undead, and other creatures without vital internal organs are unaffected. If the target is below half its hit point maximum, set its save to disadvantage manually. One additional target per slot above 4th, within 30 feet of each other.',
  }),
  'kobold-press-toh:sudden-slue': reviewed('Sudden Slue', {
    mechanics: {
      damage: [{ formula: '6d6', type: 'bludgeoning' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: {
      summary: 'Knocked prone',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [condition('Prone', { source })],
    },
    manual:
      'Select creatures in the chosen 20-foot cube within range. Apply Prone only to failed saves. The bears disappear after their charge; no summoned creatures remain.',
  }),
  'kobold-press-toh:damaging-intel': reviewed('Damaging Intel', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: ruleReminder(
      'Damaging Intel',
      'Caster learns damage vulnerabilities, resistances, and immunities. The next attack by one of the caster’s allies in range has advantage before the end of the caster’s next turn.',
      { type: 'untilSourceTurn', when: 'endOfTurn' },
    ),
    manual:
      'Choose one visible creature within range. On a failed save, inspect its damage defenses manually and grant advantage only to the next qualifying ally attack, then remove the reminder. Do not grant advantage to all attackers or to the caster.',
  }),
  'kobold-press-toh:stone-aegis': reviewed('Stone Aegis', {
    effect: {
      summary: '+2 AC until the start of your next turn; 5 temporary hit points',
      targeting: 'self',
      build: ({ source }) => [
        flatBonus('Stone Aegis', 2, {
          source,
          applies: 'ac',
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        }),
        reminder(
          'Stone Aegis',
          'Set 5 temporary hit points manually. They last until the start of your next turn. May spend a bonus action at the start of later turns to extend only the AC bonus, up to 1 minute.',
          { source, duration: { type: 'untilSourceTurn', when: 'startOfTurn' } },
        ),
      ],
    },
    manual:
      'Apply before resolving the triggering attack. Set 5 temporary hit points manually; do not add them to existing temporary hit points. The AC bonus is tracked until the start of your next turn. Later bonus-action extensions apply only to AC, never grant new temporary hit points, and stop after 1 minute.',
  }),
  'kobold-press-toh:burst-stone': reviewed('Burst Stone', {
    mechanics: {
      damage: [{ formula: '4d8', type: 'bludgeoning' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: {
      summary: 'Knocked prone',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [condition('Prone', { source })],
    },
    manual:
      'Base slot: 4d8. Select creatures within 10 feet of the chosen ground point. Ground must be sand, earth, or unworked rock. Mark the difficult terrain and 5-foot pit manually. Add 1d8 per slot above 3rd.',
  }),
  'kobold-press-toh:furious-wail': reviewed('Furious Wail', {
    mechanics: {
      damage: [{ formula: '10d10+30', type: 'psychic' }],
      save: { ability: 'cha', onSave: 'half' },
    },
    effect: nextTurnCondition('Stunned', true),
    manual: 'Select up to five creatures within 120 feet. Apply Stunned only to failed saves.',
  }),
  'kobold-press-toh:lance': reviewed('Lance', {
    mechanics: { attackRoll: true, damage: [{ formula: '5d6', type: 'force' }] },
    effect: nextTurnCondition('Restrained'),
    manual: 'Choose one visible creature within 30 feet. Apply Restrained only on a hit.',
  }),
  'kobold-press-toh:shocking-volley': reviewed('Shocking Volley', {
    mechanics: {
      damage: [{ formula: '2d8', type: 'lightning' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: nextTurnCondition('Incapacitated', true),
    manual:
      'Base slot: 2d8. Select creatures within 20 feet of the chosen point (within 60 feet). Apply Incapacitated only to failed saves. Add 1d8 per slot above 2nd.',
  }),
  'kobold-press-toh:pincer': reviewed('Pincer', {
    mechanics: {
      damage: [{ formula: '5d10', type: 'thunder' }],
      save: { ability: 'con', onSave: 'half' },
    },
    manual:
      'Base slot: 5d10. Choose two points at least 30 feet apart and select creatures in their opposing 30-foot cones. On a failed save, move the target up to 10 feet away from the emitting point. Unattended objects are pushed automatically. Add 1d10 per slot above 6th.',
  }),
  'kobold-press-toh:babble': reviewed('Babble', {
    mechanics: { save: { ability: 'int', onSave: 'negates' } },
    effect: ruleReminder(
      'Babble',
      'Spoken languages become gibberish; cannot cast verbal spells. May use an action for an Intelligence save to end the spell. Telepathy and nonverbal communication are unaffected.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'Select creatures in the 30-foot-radius sphere. An escape save costs an action, not an automatic end-of-turn save. Track the one-hour limit manually; a successful escape save ends the spell.',
  }),
  'kobold-press-toh:blunted-edge': reviewed('Blunted Edge', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Blunted Edge',
      'Disadvantage on weapon attacks only; roll weapon damage twice and use the lower total. Wisdom save at end of each turn ends the spell on this target.',
      { type: 'rounds', rounds: 10 },
    ),
    manual:
      'Choose one visible creature within 60 feet. Weapon-only disadvantage and lower damage are manual, not modifiers to all attacks. One additional target per slot above 3rd, within 30 feet of each other. Resolve escape saves manually using the caster’s DC.',
  }),
  'kobold-press-toh:bound-haze': reviewed('Bound Haze', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: ruleReminder(
      'Bound Haze',
      'Disadvantage on attacks and Wisdom (Perception) checks. Dexterity save at end of each turn ends the spell. In a cloud or gas, disadvantage on this spell’s saves and associated cloud/gas saves.',
      { type: 'rounds', rounds: 10 },
    ),
    manual:
      'Base slot only: one visible creature within 120 feet, concentration up to 1 minute. Conditional saves and Perception checks remain manual. At slot 4+, remove concentration and use a 1-minute duration. Resolve escape saves manually using the caster’s DC.',
  }),
  'kobold-press-toh:toothless-beast': reviewed('Toothless Beast', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Toothless Beast',
      'Roll natural-weapon damage dice twice and use the lower total. Wisdom save at end of each turn ends the spell on this target.',
      { type: 'rounds', rounds: 10 },
    ),
    manual:
      'Constructs are unaffected. Select one visible creature within 60 feet. Only natural weapons are affected. One additional target per slot above 2nd, within 30 feet of each other. Resolve escape saves manually using the caster’s DC.',
  }),
  'kobold-press-toh:crown-of-thorns': reviewed('Crown of Thorns', {
    effect: ruleReminder(
      'Crown of Thorns',
      'Each time this creature casts a spell, make a Charisma save. On failure: 2d6 psychic damage, spell fails, no spell slot spent.',
      { type: 'rounds', rounds: 10 },
    ),
    manual:
      'Choose a creature within 30 feet. No save or damage occurs on the initial cast. Resolve Charisma saves and 2d6 psychic damage only when the target later casts a spell.',
  }),
  'kobold-press-toh:iron-gut': reviewed('Iron Gut', {
    effect: ruleReminder(
      'Iron Gut',
      'Poison resistance; advantage on saves against poison. May choose to pass a Constitution save against poison damage or becoming Poisoned, ending the spell. No magical-food benefit; ignores harmful nonmagical food.',
      { type: 'manual' },
      'ally',
    ),
    manual:
      'Touch one willing creature. Poison resistance and conditional saves remain manual. Track the one-hour limit manually. One additional target per slot above 3rd.',
  }),
  'kobold-press-toh:misdirection': reviewed('Misdirection', {
    effect: ruleReminder('Misdirection', 'Impose disadvantage on the triggering attack only.', {
      type: 'manual',
    }),
    manual:
      'Use as a reaction when a visible creature within range makes an attack. Apply disadvantage to that attack manually and remove the reminder immediately afterward.',
  }),
}
