// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile, deepMagicTurnConditions } from './deepMagic2020Profile.ts'
import { reviewedDamage, ruleReminder } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_11: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:memento-mori': deepMagicProfile('Memento Mori', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: deepMagicTurnConditions(['Stunned'], 'target', 'endOfTurn', true),
    manual:
      'Seeing creatures fail into stunned until target next turn end; success grants 24-hour immunity. Condition/expiry/immunity manual.',
  }),
  'kobold-press-deepm:mephitic-croak': deepMagicProfile('Mephitic Croak', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage(
        [
          { formula: '2d6', type: 'acid' },
          { formula: '2d6', type: 'thunder' },
        ],
        2,
        [1, 1],
      ),
    },
    manual:
      'Failed Dexterity then separate Constitution save against stunned/poisoned until caster next turn start; secondary save/riders manual. Both components +1d6 higher slots.',
  }),
  'kobold-press-deepm:mind-exchange': deepMagicProfile('Mind Exchange', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    manual:
      'Humanoid failure swaps minds/body statistics but retains own knowledge/features/proficiencies. Ends on either 0 HP, bonus action, or printed dispels; 24-hour immunity/state restoration manual.',
  }),
  'kobold-press-deepm:mire': deepMagicProfile('Mire', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    persistsAfterSave: true,
    manual:
      'Initial failure restrained in quicksand; later entries also save. Strength escape uses caster DC, outside helper +5. Track sinking, area, and later checks manually.',
  }),
  'kobold-press-deepm:misstep': deepMagicProfile('Misstep', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    manual:
      'Failure consumes available reaction to move 5 feet chosen safe direction without opportunity attacks; already-spent reaction/unsafe direction invalid. Movement/reaction manual.',
  }),
  'kobold-press-deepm:mist-of-wonders': deepMagicProfile('Mist of Wonders', {
    effect: ruleReminder(
      'Mist of Wonders',
      'Other casters’ first-level spells in/through mist Constitution save or transform to known same-level spell; unchanged target/slot or fail if unsuitable. Higher-slot affected levels/build choices manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      '1 minute',
    ),
    manual:
      'Other casters’ first-level spells in/through mist Constitution save or transform to known same-level spell; unchanged target/slot or fail if unsuitable. Higher-slot affected levels/build choices manual.',
  }),
  'kobold-press-deepm:monstrous-empathy': deepMagicProfile('Monstrous Empathy', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Monstrous Empathy',
      'Only seeing/hearing Intelligence ≤3 monstrosities; failure charms until friendly harm or 24-hour expiry. Conditions/eligibility manual; higher slots add targets.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Only seeing/hearing Intelligence ≤3 monstrosities; failure charms until friendly harm or 24-hour expiry. Conditions/eligibility manual; higher slots add targets.',
  }),
  'kobold-press-deepm:moon-trap': deepMagicProfile('Moon Trap', {
    manual:
      'Moonlight glyph triggers later Wisdom save against inescapable maze; no initial roll. Designated creatures exempt; sunrise releases safely and destroys glyph manually.',
  }),
  'kobold-press-deepm:mosquito-bane': deepMagicProfile('Mosquito Bane', {
    manual:
      'Kill eligible insects/swarms within combined 25-HP budget; printed +15 HP higher-slot threshold capped at 85, despite slot-6 wording inconsistency. Selection/threshold adjudication manual.',
  }),
  'kobold-press-deepm:mud-pack': deepMagicProfile('Mud Pack', {
    effect: ruleReminder(
      'Mud Pack',
      'Automatic environmental-temperature Constitution saves; slow-pace terrain-matching Stealth advantage. Heavy rain ends after minute; slot 3+ gives 8 hours/up to ten targets, manually.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Automatic environmental-temperature Constitution saves; slow-pace terrain-matching Stealth advantage. Heavy rain ends after minute; slot 3+ gives 8 hours/up to ten targets, manually.',
  }),
  'kobold-press-deepm:negative-image': deepMagicProfile('Negative Image', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    manual:
      'Swap caster/target positions instantly; willing target automatic. Unwilling successful save prevents swap; position changes manual.',
  }),
  'kobold-press-deepm:nether-weapon': deepMagicProfile('Nether Weapon', {
    effect: ruleReminder(
      'Nether Weapon',
      'Enchant weapon magical with +2d6 necrotic; later damaged target cannot heal until caster next turn start. +1d6 higher slots; weapon hits/healing lock manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Enchant weapon magical with +2d6 necrotic; later damaged target cannot heal until caster next turn start. +1d6 higher slots; weapon hits/healing lock manual.',
  }),
  'kobold-press-deepm:night-terrors': deepMagicProfile('Night Terrors', {
    manual:
      'All eligible initial targets frightened until caster next turn start regardless of Wisdom save; failed saves also paralyze with end-turn repeat saves. Fear-immune excluded; mixed riders manual.',
  }),
  'kobold-press-deepm:nightfall': deepMagicProfile('Nightfall', {
    effect: ruleReminder(
      'Nightfall',
      '30-foot-radius/100-foot-high normal-darkness cylinder, obstruction-limited; illuminated exterior remains visible from within. Light/obscuration manual, not blindness.',
      { type: 'rounds', rounds: 100 },
      'self',
      false,
      'up to 10 minutes',
    ),
    manual:
      '30-foot-radius/100-foot-high normal-darkness cylinder, obstruction-limited; illuminated exterior remains visible from within. Light/obscuration manual, not blindness.',
  }),
  'kobold-press-deepm:nip-at-the-heels': deepMagicProfile('Nip at the Heels', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Nip at the Heels',
      'Failure disadvantages attacks/checks; target ≥10 feet above ground gets save advantage. End-turn repeat saves, conditional modifiers and higher-slot targets manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure disadvantages attacks/checks; target ≥10 feet above ground gets save advantage. End-turn repeat saves, conditional modifiers and higher-slot targets manual.',
  }),
  'kobold-press-deepm:not-dead-yet': deepMagicProfile('Not Dead Yet', {
    effect: ruleReminder(
      'Not Dead Yet',
      'Eligible recent intact humanoid corpse reanimates as unconscious caster’s senses/movement proxy, no attacks/speech/features. Damage to either body instantly ends; state edits manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Eligible recent intact humanoid corpse reanimates as unconscious caster’s senses/movement proxy, no attacks/speech/features. Damage to either body instantly ends; state edits manual.',
  }),
  'kobold-press-deepm:not-this-day': deepMagicProfile('Not This Day!', {
    effect: ruleReminder(
      'Not This Day!',
      'Choose damage type or creature category; saves including qualifying death saves gain advantage only for chosen source. Nonstacking 24-hour protection/eligibility manual.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Choose damage type or creature category; saves including qualifying death saves gain advantage only for chosen source. Nonstacking 24-hour protection/eligibility manual.',
  }),
  'kobold-press-deepm:orb-of-light': deepMagicProfile('Orb of Light', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '3d8', type: 'radiant' }], 2, [1]),
    },
    manual:
      'Failure blinds for 1 round, success prevents blindness. Condition manual; +1d8 per higher slot.',
  }),
  'kobold-press-deepm:outflanking-boon': deepMagicProfile('Outflanking Boon', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Outflanking Boon',
      'Failure lets caster’s allies gain melee attack advantage only against target; target end-turn repeat save ends. Relational modifier manual; higher slots add enemies.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure lets caster’s allies gain melee attack advantage only against target; target end-turn repeat save ends. Relational modifier manual; higher slots add enemies.',
  }),
  'kobold-press-deepm:paragon-of-chaos': deepMagicProfile('Paragon of Chaos', {
    effect: ruleReminder(
      'Paragon of Chaos',
      'Apply printed physical resistances, poison/psychic immunities, condition immunities, truesight and movement teleport manually. Later bonus-action chosen-target chaos surges use caster DC; no initial surge.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Apply printed physical resistances, poison/psychic immunities, condition immunities, truesight and movement teleport manually. Later bonus-action chosen-target chaos surges use caster DC; no initial surge.',
  }),
  'kobold-press-deepm:pendulum': deepMagicProfile('Pendulum', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Pendulum',
      'Failure replaces all d20 attack/check/save rolls with ordered 20,1,19,2 sequence. Track sequence manually without altering RNG.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure replaces all d20 attack/check/save rolls with ordered 20,1,19,2 sequence. Track sequence manually without altering RNG.',
  }),
  'kobold-press-deepm:phantom-dragon': deepMagicProfile('Phantom Dragon', {
    effect: ruleReminder(
      'Phantom Dragon',
      'Ally appears dragon; observers Wisdom save reveals. Later action frightens chosen nearby observer on Wisdom failure, action repeat save frees. Appearance/later saves and higher-slot targets manual.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Ally appears dragon; observers Wisdom save reveals. Later action frightens chosen nearby observer on Wisdom failure, action repeat save frees. Appearance/later saves and higher-slot targets manual.',
  }),
  'kobold-press-deepm:pitfall': deepMagicProfile('Pitfall', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    manual:
      'Huge-or-smaller without flying speed failure enters pit; delayed caster next turn end exits prone for 6d6 bludgeoning. Initial success permits later bonus-action retrigger; movement/damage manual.',
  }),
  'kobold-press-deepm:poisoned-volley': deepMagicProfile('Poisoned Volley', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '3d8', type: 'poison' }], 2, [1]),
    },
    manual:
      'Failure poisons but card supplies no poison endpoint beyond Instantaneous header; resolve/remove condition manually without invented expiry. +1d8 per higher slot.',
  }),
  'kobold-press-deepm:potency-of-the-pack': deepMagicProfile('Potency of the Pack', {
    effect: ruleReminder(
      'Potency of the Pack',
      'Choose group benefit: +2 armor, smell/hearing Perception advantage, or conditional pack attack advantage. Apply chosen benefit manually; higher slots add minutes.',
      { type: 'rounds', rounds: 10 },
      'ally',
      true,
      '1 minute',
    ),
    manual:
      'Choose group benefit: +2 armor, smell/hearing Perception advantage, or conditional pack attack advantage. Apply chosen benefit manually; higher slots add minutes.',
  }),
  'kobold-press-deepm:power-word-kneel': deepMagicProfile('Power Word Kneel', {
    manual:
      'Select lowest-HP creatures within 55-HP combined budget, no initial save. Kneel as prone; end-turn Wisdom saves or damage release manually.',
  }),
  'kobold-press-deepm:power-word-pain': deepMagicProfile('Power Word Pain', {
    manual:
      'Automatic initial 4d10 force; later turn-start Constitution success ends or failure deals 4d10. No initial save/attack; later damage manual.',
  }),
  'kobold-press-deepm:primal-infusion': deepMagicProfile('Primal Infusion', {
    effect: ruleReminder(
      'Primal Infusion',
      'Grant 30 temporary HP removed on ending, conditional pack advantage, weapon-typed +1d10, +2 armor and Constitution-save proficiency. Apply/remove benefits manually.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Grant 30 temporary HP removed on ending, conditional pack advantage, weapon-typed +1d10, +2 armor and Constitution-save proficiency. Apply/remove benefits manually.',
  }),
  'kobold-press-deepm:prismatic-ray': deepMagicProfile('Prismatic Ray', {
    manual:
      'Ranged spell hit rolls d8 color; critical chooses color without extra damage. Color determines damage type/save or five-round condition; staged attack/save/random outcomes manual.',
  }),
  'kobold-press-deepm:protection-from-the-void': deepMagicProfile('Protection from the Void', {
    effect: ruleReminder(
      'Protection from the Void',
      'Willing touch gains necrotic/psychic resistance and save advantage only against Void spells. Defenses/conditional saves manual.',
      { type: 'rounds', rounds: 100 },
      'ally',
      true,
      'up to 10 minutes',
    ),
    manual:
      'Willing touch gains necrotic/psychic resistance and save advantage only against Void spells. Defenses/conditional saves manual.',
  }),
}
