// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { ruleReminder, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_1: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:animated-scroll': deepMagicProfile('Animated Scroll', {
    manual:
      'Create one folded-paper CR 0 beast manually; recasting changes its form. Duration 24/48/72/96 hours at caster levels 1/5/11/17.',
  }),
  'kobold-press-deepm:anticipate-arcana': deepMagicProfile('Anticipate Arcana', {
    effect: ruleReminder(
      'Anticipate Arcana',
      'Advantage only on saves against spells or magical effects until caster next turn start; apply manually.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'self',
      false,
      'Until caster next turn start',
    ),
    manual:
      'Advantage only on saves against spells or magical effects until caster next turn start; apply manually.',
  }),
  'kobold-press-deepm:anticipate-attack': deepMagicProfile('Anticipate Attack', {
    manual:
      'Move up to half speed without opportunity attacks; reassess incoming attack range, targeting, and cover after movement manually.',
  }),
  'kobold-press-deepm:anticipate-weakness': deepMagicProfile('Anticipate Weakness', {
    effect: ruleReminder(
      'Anticipate Weakness',
      'Attack advantage until current turn end; apply and expire manually, not next turn end.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Attack advantage until current turn end; apply and expire manually, not next turn end.',
  }),
  'kobold-press-deepm:arcane-sight': deepMagicProfile('Arcane Sight', {
    effect: ruleReminder(
      'Arcane Sight',
      'Track True Seeing, Detect Magic, and witnessed spell identification for up to 1 hour; perception benefits manual.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Track True Seeing, Detect Magic, and witnessed spell identification for up to 1 hour; perception benefits manual.',
  }),
  'kobold-press-deepm:as-you-were': deepMagicProfile('As You Were', {
    manual:
      'Corpse preservation or undead appearance restoration lasts caster-level hours despite Instantaneous header. Hostile uncontrolled undead get Charisma save; radiant/necrotic damage or Constitution reduction ends disguise.',
  }),
  'kobold-press-deepm:ashen-memories': deepMagicProfile('Ashen Memories', {
    manual:
      'Touch fire remains for a GM-selected vision of a significant event; no combat roll or guaranteed information.',
  }),
  'kobold-press-deepm:aspect-of-the-dragon': deepMagicProfile('Aspect of the Dragon', {
    effect: ruleReminder(
      'Aspect of the Dragon',
      'Choose dragon CR 10 or less; copy form statistics and handle separate HP, excess damage, retained features, speech, and equipment manually.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Choose dragon CR 10 or less; copy form statistics and handle separate HP, excess damage, retained features, speech, and equipment manually.',
  }),
  'kobold-press-deepm:aspect-of-the-serpent': deepMagicProfile('Aspect of the Serpent', {
    effect: ruleReminder(
      'Aspect of the Serpent',
      'Grant 60-foot darkvision/30-foot blindsight manually. Optional bonus-action ranged weapon attack and later bite use weapon statistics, secondary DC 14 Constitution paralysis saves; +1d6 damage per higher slot.',
      { type: 'rounds', rounds: 10 },
      'ally',
      true,
      'up to 1 minute',
    ),
    manual:
      'Grant 60-foot darkvision/30-foot blindsight manually. Optional bonus-action ranged weapon attack and later bite use weapon statistics, secondary DC 14 Constitution paralysis saves; +1d6 damage per higher slot.',
  }),
  'kobold-press-deepm:aura-of-protection-or-destruction': deepMagicProfile(
    'Aura of Protection or Destruction',
    {
      effect: ruleReminder(
        'Aura of Protection or Destruction',
        'Choose 30-foot aura making all attacks by/against creatures inside natural 1 or natural 20 until caster next turn start; higher slots extend rounds. Resolve rolls manually.',
        { type: 'manual' },
        'self',
        false,
        'Track printed duration and any early endpoint manually',
      ),
      manual:
        'Choose 30-foot aura making all attacks by/against creatures inside natural 1 or natural 20 until caster next turn start; higher slots extend rounds. Resolve rolls manually.',
    },
  ),
  'kobold-press-deepm:auspicious-warning': deepMagicProfile('Auspicious Warning', {
    manual:
      'Add rolled d4 to just-made attack, check, or save and recalculate success manually; no persistent bonus.',
  }),
  'kobold-press-deepm:avoid-grievous-injury': deepMagicProfile('Avoid Grievous Injury', {
    manual:
      'Reaction before critical damage roll converts triggering critical hit to normal hit manually.',
  }),
  'kobold-press-deepm:avronins-astral-assembly': deepMagicProfile('Avronin’s Astral Assembly', {
    effect: ruleReminder(
      'Avronin’s Astral Assembly',
      'Invite up to casting modifier creatures (minimum 1). Track astral projections, unconscious bodies, voluntary departure, and broken-gem two-level exhaustion manually.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Invite up to casting modifier creatures (minimum 1). Track astral projections, unconscious bodies, voluntary departure, and broken-gem two-level exhaustion manually.',
  }),
  'kobold-press-deepm:awaken-object': deepMagicProfile('Awaken Object', {
    manual:
      'Create independent sentient construct from eligible object using printed size table, rolled mental abilities, and 30-foot movement; no initial attack or invented damage type.',
  }),
  'kobold-press-deepm:bad-timing': deepMagicProfile('Bad Timing', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: ruleReminder(
      'Bad Timing',
      'Failure imposes disadvantage on next attack or ability check within 10 minutes; apply, spend, and expire manually despite Instantaneous header.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure imposes disadvantage on next attack or ability check within 10 minutes; apply, spend, and expire manually despite Instantaneous header.',
  }),
  'kobold-press-deepm:batsense': deepMagicProfile('Batsense', {
    effect: ruleReminder(
      'Batsense',
      '60-foot echolocation blindsight fails while deafened or in magical silence; hearing Perception advantage and silence-dependent Stealth disadvantage remain conditional/manual.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      '60-foot echolocation blindsight fails while deafened or in magical silence; hearing Perception advantage and silence-dependent Stealth disadvantage remain conditional/manual.',
  }),
  'kobold-press-deepm:become-nightwing': deepMagicProfile('Become Nightwing', {
    effect: ruleReminder(
      'Become Nightwing',
      'Grant 60-foot flight; later Recharge 4–6 breath uses Dexterity save for 5d6 necrotic, half on success. No breath on casting.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Grant 60-foot flight; later Recharge 4–6 breath uses Dexterity save for 5d6 necrotic, half on success. No breath on casting.',
  }),
  'kobold-press-deepm:beguiling-bet': deepMagicProfile('Beguiling Bet', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Beguiling Bet',
      'Failure charms and compels next-action skill contest. Casting modifier substitution, continued contests, early ending, and additional targets at slots 4/6/8 remain manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure charms and compels next-action skill contest. Casting modifier substitution, continued contests, early ending, and additional targets at slots 4/6/8 remain manual.',
  }),
  'kobold-press-deepm:benediction': deepMagicProfile('Benediction', {
    effect: ruleReminder(
      'Benediction',
      'Next damage reduced by d4, then spell ends; roll reduction and clear reminder/concentration manually.',
      { type: 'rounds', rounds: 10 },
      'ally',
      true,
      'up to 1 minute',
    ),
    manual:
      'Next damage reduced by d4, then spell ends; roll reduction and clear reminder/concentration manually.',
  }),
  'kobold-press-deepm:bestial-fury': deepMagicProfile('Bestial Fury', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: ruleReminder(
      'Bestial Fury',
      'Exclude undead/constructs; willing failure allowed. Compelled nearest-enemy natural/unarmed attacks, extra 1d6 matching weapon type, charm/fear immunity, and no-enemy action repeat save manual; higher slots add targets.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Exclude undead/constructs; willing failure allowed. Compelled nearest-enemy natural/unarmed attacks, extra 1d6 matching weapon type, charm/fear immunity, and no-enemy action repeat save manual; higher slots add targets.',
  }),
  'kobold-press-deepm:binding-oath': deepMagicProfile('Binding Oath', {
    manual:
      'Seal willing oath; choose Bestow Curse consequence only upon breach. Track notification, remaining oath, and printed removal/slot restrictions manually.',
  }),
  'kobold-press-deepm:biting-arrow': deepMagicProfile('Biting Arrow', {
    manual:
      'Requires ranged weapon attack and weapon damage, not spell attack. On hit frost triggers later reaction cold damage until caster next turn start; caster-level weapon/cold scaling manual.',
  }),
  'kobold-press-deepm:bitter-chains': deepMagicProfile('Bitter Chains', {
    mechanics: { attackRoll: true },
    attackKind: 'melee',
    manual:
      'Hit binds without initial damage: half speed and disadvantage on attacks, saves, Dexterity checks. Moving over 5 feet triggers 3d6 piercing; action Strength/Dexterity check or AC 18/20 HP chains ends binding manually.',
  }),
  'kobold-press-deepm:black-goats-blessing': deepMagicProfile('Black Goat’s Blessing', {
    effect: ruleReminder(
      'Black Goat’s Blessing',
      'Disadvantage only on saves against this caster’s spells until caster next turn end; apply relational modifier manually.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Disadvantage only on saves against this caster’s spells until caster next turn end; apply relational modifier manually.',
  }),
  'kobold-press-deepm:black-hand': deepMagicProfile('Black Hand', {
    mechanics: { attackRoll: true },
    attackKind: 'ranged',
    manual:
      'Hit applies target physical-ability attack/check/save disadvantage and caster advantage manually. Target turn-end Constitution save at disadvantage ends effect; no initial damage.',
  }),
  'kobold-press-deepm:black-ribbons': deepMagicProfile('Black Ribbons', {
    effect: ruleReminder(
      'Black Ribbons',
      '20-foot cube difficult terrain. Only turn-end Dexterity failures restrain until target next turn end; successful save grants immunity to later restraint. Track later saves and immunity manually.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      '20-foot cube difficult terrain. Only turn-end Dexterity failures restrain until target next turn end; successful save grants immunity to later restraint. Track later saves and immunity manually.',
  }),
  'kobold-press-deepm:black-sunshine': deepMagicProfile('Black Sunshine', {
    effect: ruleReminder(
      'Black Sunshine',
      'Designated allies invisible only within 60 feet and reachable orb light. Later thrown-weapon hit ends spell and triggers Dexterity blindness saves in burst; repeat end-turn saves manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Designated allies invisible only within 60 feet and reachable orb light. Later thrown-weapon hit ends spell and triggers Dexterity blindness saves in burst; repeat end-turn saves manual.',
  }),
  'kobold-press-deepm:black-swan-storm': deepMagicProfile('Black Swan Storm', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '2d8', type: 'force' }], 2, [1]),
    },
    persistsAfterSave: true,
    manual:
      'Select creatures in 5-foot cube for initial force damage; area lowers illumination within 20 feet even on successful saves. +1d8 per slot above 2nd; lighting manual.',
  }),
  'kobold-press-deepm:black-well': deepMagicProfile('Black Well', {
    effect: ruleReminder(
      'Black Well',
      'No initial damage. Turn-start Strength pull; entry Constitution save for 6d8 necrotic and stunned/failure or incapacitated/success. Later occupancy, exit recovery, capacity, ending prone, and higher-slot damage/pull manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'No initial damage. Turn-start Strength pull; entry Constitution save for 6d8 necrotic and stunned/failure or incapacitated/success. Later occupancy, exit recovery, capacity, ending prone, and higher-slot damage/pull manual.',
  }),
  'kobold-press-deepm:blade-of-my-brother': deepMagicProfile('Blade of my Brother', {
    effect: ruleReminder(
      'Blade of my Brother',
      'Animate deceased ally’s weapon near chosen ally; attacks use printed spellcasting-level plus weapon bonus, not spell attack bonus. Separation ends spell; later weapon attacks manual.',
      { type: 'rounds', rounds: 4 },
      'self',
      false,
      'up to 4 rounds',
    ),
    manual:
      'Animate deceased ally’s weapon near chosen ally; attacks use printed spellcasting-level plus weapon bonus, not spell attack bonus. Separation ends spell; later weapon attacks manual.',
  }),
}
