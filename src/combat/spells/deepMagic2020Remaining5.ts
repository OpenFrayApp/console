// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { ruleReminder, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_5: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:dark-dementing': deepMagicProfile('Dark Dementing', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: ruleReminder(
      'Dark Dementing',
      'Failure frightens of caster for 10 minutes with lighting movement/attack limits; damage permits repeat save. Condition, lighting, and early release manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure frightens of caster for 10 minutes with lighting movement/attack limits; damage permits repeat save. Condition, lighting, and early release manual.',
  }),
  'kobold-press-deepm:dark-heraldry': deepMagicProfile('Dark Heraldry', {
    mechanics: {
      save: { ability: 'wis', onSave: 'half' },
      ...reviewedDamage([{ formula: '5d8', type: 'psychic' }], 3, [0]),
    },
    effect: ruleReminder(
      'Dark Heraldry',
      'Targets must differ in alignment, count up to casting modifier minimum 1. Failure frightens; end-turn repeat saves disadvantaged while caster sees target. Higher slots add targets; riders manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Targets must differ in alignment, count up to casting modifier minimum 1. Failure frightens; end-turn repeat saves disadvantaged while caster sees target. Higher slots add targets; riders manual.',
  }),
  'kobold-press-deepm:dark-maw': deepMagicProfile('Dark Maw', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '1d8', type: 'necrotic' }], 0, [1]),
    },
    attackKind: 'melee',
    manual:
      'Existing bite permits casting modifier damage addition manually. Humanoid hit grants separate 1d4 temporary HP until caster next turn start; cantrip scaling at 5/11/17.',
  }),
  'kobold-press-deepm:dark-path': deepMagicProfile('Dark Path', {
    effect: ruleReminder(
      'Dark Path',
      'Create 10-foot-wide path up to 50 feet long; capacity 500 pounds, overload sinks through. Track bridge/terrain manually.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Create 10-foot-wide path up to 50 feet long; capacity 500 pounds, overload sinks through. Track bridge/terrain manually.',
  }),
  'kobold-press-deepm:darkbolt': deepMagicProfile('Darkbolt', {
    manual:
      'Distribute three cold rays but one attack per target, not ray. Aggregate 1d10 per assigned ray on hit; separate Constitution save prevents reactions until target next turn start. Higher slots add rays.',
  }),
  'kobold-press-deepm:dead-walking': deepMagicProfile('Dead Walking', {
    effect: ruleReminder(
      'Dead Walking',
      'Up to six willing creatures invisible only to undead; any target attack/cast ends for all. Slot 3 removes concentration, higher slots extend hours; adjust concentration and duration manually.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Up to six willing creatures invisible only to undead; any target attack/cast ends for all. Slot 3 removes concentration, higher slots extend hours; adjust concentration and duration manually.',
  }),
  'kobold-press-deepm:deadly-sting': deepMagicProfile('Deadly Sting', {
    effect: ruleReminder(
      'Deadly Sting',
      'Create 10-foot tail; later melee spell hits deal 1d4 piercing plus 4d10 poison, then Constitution save against poison vulnerability. No initial attack; attacks and defense change manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Create 10-foot tail; later melee spell hits deal 1d4 piercing plus 4d10 poison, then Constitution save against poison vulnerability. No initial attack; attacks and defense change manual.',
  }),
  'kobold-press-deepm:death-gods-touch': deepMagicProfile('Death God’s Touch', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '10d10', type: 'necrotic' }], 7, [2]),
    },
    attackKind: 'melee',
    manual:
      'Caster becomes invisible before attack and remains so until next turn start even on miss; apply/remove manually. Target at 0 HP dies; +2d10 per higher slot.',
  }),
  'kobold-press-deepm:decay': deepMagicProfile('Decay', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '1d10', type: 'necrotic' }], 0, [1]),
    },
    attackKind: 'melee',
    manual:
      'Eligible Tiny/Small uncarried nonmagical objects instead take automatic maximum damage manually. Cantrip creature damage scales at 5/11/17.',
  }),
  'kobold-press-deepm:decelerate': deepMagicProfile('Decelerate', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Decelerate',
      'Failure halves walking speed rounded up to 5 feet, further failed saves halve at caster turn starts, minimum 5 feet. Target end-turn repeat saves and higher-slot targets manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure halves walking speed rounded up to 5 feet, further failed saves halve at caster turn starts, minimum 5 feet. Target end-turn repeat saves and higher-slot targets manual.',
  }),
  'kobold-press-deepm:deep-breath': deepMagicProfile('Deep Breath', {
    effect: ruleReminder(
      'Deep Breath',
      'Protect against thin atmosphere up to 20,000 feet; divide duration among touched recipients. +2 hours per higher slot; no general suffocation immunity.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Protect against thin atmosphere up to 20,000 feet; divide duration among touched recipients. +2 hours per higher slot; no general suffocation immunity.',
  }),
  'kobold-press-deepm:defile-healing': deepMagicProfile('Defile Healing', {
    manual:
      'Reverse eligible healing into necrotic damage equal to healing with Constitution half save; slot thresholds 5/6/7 depend on casting slot 7/8/9. Resolve variable damage manually.',
  }),
  'kobold-press-deepm:delay-potion': deepMagicProfile('Delay Potion', {
    effect: ruleReminder(
      'Delay Potion',
      'Drink within 1 round then activate delayed potion by bonus action within hour. Only one delayed potion; second attempt cancels first and works normally.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Drink within 1 round then activate delayed potion by bonus action within hour. Only one delayed potion; second attempt cancels first and works normally.',
  }),
  'kobold-press-deepm:delayed-healing': deepMagicProfile('Delayed Healing', {
    manual:
      'Eligible living target heals only upon next damage for 1d4 plus casting modifier minimum 1; +1d4 per higher slot. Track trigger manually, no Instantaneous expiry.',
  }),
  'kobold-press-deepm:demon-within': deepMagicProfile('Demon Within', {
    mechanics: {
      save: { ability: 'wis', onSave: 'negates' },
      ...reviewedDamage([{ formula: '4d6', type: 'force' }], 3, [0]),
    },
    effect: ruleReminder(
      'Demon Within',
      'Humanoid failure hosts CR 4-or-less demon; later bonus actions deal separate 2d6 force. At 0 HP uncontrolled demon emerges for 24 hours; summon/commands manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Humanoid failure hosts CR 4-or-less demon; later bonus actions deal separate 2d6 force. At 0 HP uncontrolled demon emerges for 24 hours; summon/commands manual.',
  }),
  'kobold-press-deepm:desiccating-breath': deepMagicProfile('Desiccating Breath', {
    manual:
      'Constitution half save in cone; animals take 4d10 necrotic, plants take 6d10. Select eligible types and variable damage manually.',
  }),
  'kobold-press-deepm:destructive-resonance': deepMagicProfile('Destructive Resonance', {
    mechanics: {
      save: { ability: 'wis', onSave: 'half' },
      ...reviewedDamage([{ formula: '4d6', type: 'psychic' }], 2, [1]),
    },
    manual:
      'Hearing creatures in 15-foot cone; any damaged target loses reactions until its next turn start, including successful saves. Rider manual; +1d6 per higher slot.',
  }),
  'kobold-press-deepm:detect-dragons': deepMagicProfile('Detect Dragons', {
    effect: ruleReminder(
      'Detect Dragons',
      'No cast-turn information without second action. Successive study actions reveal presence/count then DC 15 Arcana age/type/location; sight and 120-foot limits manual.',
      { type: 'rounds', rounds: 100 },
      'self',
      false,
      'up to 10 minutes',
    ),
    manual:
      'No cast-turn information without second action. Successive study actions reveal presence/count then DC 15 Arcana age/type/location; sight and 120-foot limits manual.',
  }),
  'kobold-press-deepm:devas-wings': deepMagicProfile('Deva’s Wings', {
    effect: ruleReminder(
      'Deva’s Wings',
      'Willing touch grants 60-foot hover flight. Attack action permits later bonus-action weapon wing attack, casting-modifier damage and Strength-save prone; ending can cause fall. Higher slots add targets.',
      { type: 'rounds', rounds: 100 },
      'ally',
      true,
      'up to 10 minutes',
    ),
    manual:
      'Willing touch grants 60-foot hover flight. Attack action permits later bonus-action weapon wing attack, casting-modifier damage and Strength-save prone; ending can cause fall. Higher slots add targets.',
  }),
  'kobold-press-deepm:dimensional-shove': deepMagicProfile('Dimensional Shove', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    manual:
      'Failure teleports touched creature 30 feet away to nearest safe unoccupied grounded space along path. +30 feet per higher slot; movement manual.',
  }),
  'kobold-press-deepm:disquieting-gaze': deepMagicProfile('Disquieting Gaze', {
    effect: ruleReminder(
      'Disquieting Gaze',
      'Advantage only on Intimidation against creatures seeing caster and necrotic spell attacks against creatures seeing eyes; modifiers manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      '1 minute',
    ),
    manual:
      'Advantage only on Intimidation against creatures seeing caster and necrotic spell attacks against creatures seeing eyes; modifiers manual.',
  }),
  'kobold-press-deepm:disruptive-aura': deepMagicProfile('Disruptive Aura', {
    effect: ruleReminder(
      'Disruptive Aura',
      'Outline cube creatures and shed light. Only later casting/item use triggers Wisdom save to suppress effect while duration still elapses. Slot 9 doubles cube; suppression manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Outline cube creatures and shed light. Only later casting/item use triggers Wisdom save to suppress effect while duration still elapses. Slot 9 doubles cube; suppression manual.',
  }),
  'kobold-press-deepm:distracting-divination': deepMagicProfile('Distracting Divination', {
    mechanics: { attackRoll: true },
    attackKind: 'melee',
    manual:
      'Reaction against adjacent enemy casting: hit cancels spell/action but does not expend enemy spell slot. Resolve cancellation manually; no damage.',
  }),
  'kobold-press-deepm:distraction-cascade': deepMagicProfile('Distraction Cascade', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    manual:
      'Reaction after ally declares target: failure gives incoming attack advantage only until current turn end. Apply and expire relational modifier manually.',
  }),
  'kobold-press-deepm:doom-of-blue-crystal': deepMagicProfile('Doom of Blue Crystal', {
    manual:
      'Initial and caster-start Constitution saves include caster; failures progress restrained/paralyzed/permanent petrified. State-dependent saves, caster petrification ending, restoration, and Shatter lethality manual.',
  }),
  'kobold-press-deepm:doom-of-consuming-fire': deepMagicProfile('Doom of Consuming Fire', {
    effect: ruleReminder(
      'Doom of Consuming Fire',
      'Automatic initial nearby 1d8 cold, later caster-start damage and caster 1d6 each round; no save. Slot tiers change radius and dice; apply all damage manually.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Automatic initial nearby 1d8 cold, later caster-start damage and caster 1d6 each round; no save. Slot tiers change radius and dice; apply all damage manually.',
  }),
  'kobold-press-deepm:doom-of-dancing-blades': deepMagicProfile('Doom of Dancing Blades', {
    effect: ruleReminder(
      'Doom of Dancing Blades',
      'Roll 1d4 weapon images; eligible visible melee hits consume one, blocking or halving based on margin. Caster melee critical expends remaining images for chosen physical damage; restrictions/manual counts.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Roll 1d4 weapon images; eligible visible melee hits consume one, blocking or halving based on margin. Caster melee critical expends remaining images for chosen physical damage; restrictions/manual counts.',
  }),
  'kobold-press-deepm:doom-of-disenchantment': deepMagicProfile('Doom of Disenchantment', {
    effect: ruleReminder(
      'Doom of Disenchantment',
      'Suppress magical attack bonuses/properties against caster; non-Instantaneous spells face Charisma Counterspell rules. Preserve magical weapon status; resolve conditional suppression manually.',
      { type: 'rounds', rounds: 5 },
      'self',
      false,
      'up to 5 rounds',
    ),
    manual:
      'Suppress magical attack bonuses/properties against caster; non-Instantaneous spells face Charisma Counterspell rules. Preserve magical weapon status; resolve conditional suppression manually.',
  }),
  'kobold-press-deepm:doom-of-serpent-coils': deepMagicProfile('Doom of Serpent Coils', {
    mechanics: {
      save: { ability: 'con', onSave: 'negates' },
      ...reviewedDamage([{ formula: '4d6', type: 'poison' }], 4, [0]),
    },
    effect: ruleReminder(
      'Doom of Serpent Coils',
      'Caster drinks poison with automatic failure manually. Nearby living failures poisoned with later repeat-save damage; success grants 24-hour recast immunity. Existing poison unaffected, no automatic Instantaneous expiry.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Caster drinks poison with automatic failure manually. Nearby living failures poisoned with later repeat-save damage; success grants 24-hour recast immunity. Existing poison unaffected, no automatic Instantaneous expiry.',
  }),
  'kobold-press-deepm:doom-of-the-cracked-shield': deepMagicProfile('Doom of the Cracked Shield', {
    manual:
      'Enchant weapon; next use destroys nonmagical shield or reduces nonmagical armor AC by 2. Unarmored target spends effect without benefit; weapon trigger/manual equipment edits.',
  }),
}
