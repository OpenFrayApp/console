// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile, deepMagicTurnConditions } from './deepMagic2020Profile.ts'
import { ruleReminder, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_12: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:protective-ice': deepMagicProfile('Protective Ice', {
    effect: ruleReminder(
      'Protective Ice',
      'Willing target gets breastplate-equivalent armor, not additive AC; melee retaliation 1d6 cold. Fire harms armor, cold repairs. Higher slots change proficiency/AC/HP/retaliation; equipment/defenses manual.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Willing target gets breastplate-equivalent armor, not additive AC; melee retaliation 1d6 cold. Fire harms armor, cold repairs. Higher slots change proficiency/AC/HP/retaliation; equipment/defenses manual.',
  }),
  'kobold-press-deepm:puff-of-smoke': deepMagicProfile('Puff of Smoke', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: deepMagicTurnConditions(['Blinded'], 'caster', 'startOfTurn'),
    manual:
      'Exclude tremorsense/blindsight creatures; failure blinds until caster next turn start despite Instantaneous header. Rider/expiry manual.',
  }),
  'kobold-press-deepm:pummelstone': deepMagicProfile('Pummelstone', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '1d6', type: 'bludgeoning' }], 0, [1]),
    },
    attackKind: 'ranged',
    manual:
      'Hit subtracts d4 from target attacks/checks only during its next turn; apply/spend window manually. Cantrip scales at 5/11/17.',
  }),
  'kobold-press-deepm:pyroclasm': deepMagicProfile('Pyroclasm', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '10d8', type: 'fire' }], 9, [0]),
    },
    persistsAfterSave: true,
    manual:
      'Initial geyser damage only; later caster-start geyser saves and expanding pool automatic 5d8. Exiting penalties and minute-concentration permanent stone/restraint manual.',
  }),
  'kobold-press-deepm:quick-time': deepMagicProfile('Quick Time', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    manual:
      'Intelligence ≥3 may resist, may willingly fail; other eligible living creatures/plants age automatically. +1 year per higher slot; age/stat changes manual.',
  }),
  'kobold-press-deepm:quicken': deepMagicProfile('Quicken', {
    effect: ruleReminder(
      'Quicken',
      'Willing target may add d4 once to just-made initiative or Dexterity save, then spell ends. Roll/update and clear reminder/concentration manually.',
      { type: 'rounds', rounds: 10 },
      'ally',
      true,
      'up to 1 minute',
    ),
    manual:
      'Willing target may add d4 once to just-made initiative or Dexterity save, then spell ends. Roll/update and clear reminder/concentration manually.',
  }),
  'kobold-press-deepm:quicksilver-mantle': deepMagicProfile('Quicksilver Mantle', {
    effect: ruleReminder(
      'Quicksilver Mantle',
      '+2 armor and gaze-save advantage. First striking ray each round has d4=4 random nearby reflection; defenses, probability, recipient and per-round use manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      '+2 armor and gaze-save advantage. First striking ray each round has d4=4 random nearby reflection; defenses, probability, recipient and per-round use manual.',
  }),
  'kobold-press-deepm:quintessence': deepMagicProfile('Quintessence', {
    effect: ruleReminder(
      'Quintessence',
      'Armor minimum 20, fear immunity, necrotic immunity. Later hostile entry/start Wisdom failures frighten/restrain for minute; repeat saves and immunity manual, no initial save.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Armor minimum 20, fear immunity, necrotic immunity. Later hostile entry/start Wisdom failures frighten/restrain for minute; repeat saves and immunity manual, no initial save.',
  }),
  'kobold-press-deepm:raid-the-lair': deepMagicProfile('Raid the Lair', {
    effect: ruleReminder(
      'Raid the Lair',
      'Moving 10-foot ally aura: dragon-lair incoming attack disadvantage, save advantage/half damage, lair initiative −10; caster concentration-save advantage. Conditional defenses/order manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Moving 10-foot ally aura: dragon-lair incoming attack disadvantage, save advantage/half damage, lair initiative −10; caster concentration-save advantage. Conditional defenses/order manual.',
  }),
  'kobold-press-deepm:rain-of-blades': deepMagicProfile('Rain of Blades', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '6d6', type: 'slashing' }], 5, [0]),
    },
    manual:
      'Contiguous area initial damage; injured intelligent undead separately Charisma save against 1d4-round fright. Salvaged weapon lasts four rounds, higher slots +1; secondary outcomes manual.',
  }),
  'kobold-press-deepm:ray-of-alchemical-negation': deepMagicProfile('Ray of Alchemical Negation', {
    manual:
      'Ranged spell hit destroys eligible reagents/trap without creature damage; eligible alchemical creature takes 6d6 force then Constitution save against halved special attacks. Mode/secondary save manual.',
  }),
  'kobold-press-deepm:ray-of-life-suppression': deepMagicProfile('Ray of Life Suppression', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '6d8', type: 'necrotic' }], 4, [0]),
    },
    attackKind: 'ranged',
    manual:
      'Exclude constructs/undead. Hit reduces maximum HP by actual damage until short/long rest or Greater Restoration; reduction/removal manual.',
  }),
  'kobold-press-deepm:reaver-spirit': deepMagicProfile('Reaver Spirit', {
    effect: ruleReminder(
      'Reaver Spirit',
      'Caster/allies: Strength check/save advantage, nonmagical physical resistance, melee weapon +2 damage. Ending Constitution failure adds 1d4 exhaustion; printed above-2nd upcast threshold and penalties manual.',
      { type: 'rounds', rounds: 10 },
      'ally',
      true,
      'up to 1 minute',
    ),
    manual:
      'Caster/allies: Strength check/save advantage, nonmagical physical resistance, melee weapon +2 damage. Ending Constitution failure adds 1d4 exhaustion; printed above-2nd upcast threshold and penalties manual.',
  }),
  'kobold-press-deepm:reposition': deepMagicProfile('Reposition', {
    manual:
      'Up to three friendlies choose visible unoccupied positions within 30 feet of themselves; +1 target per higher slot. Teleports manual.',
  }),
  'kobold-press-deepm:reset': deepMagicProfile('Reset', {
    manual:
      'Up to four: allies freely reroll initiative and choose, enemies Wisdom failure reroll with caster choice. Order changes next round, not immediately; higher-slot targets/manual.',
  }),
  'kobold-press-deepm:reverberate': deepMagicProfile('Reverberate', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '4d6', type: 'thunder' }], 2, [1]),
    },
    manual:
      'Only grounded creatures/unattended objects in cone; creature failure prone. Object damage/standing manual; +1d6 per higher slot.',
  }),
  'kobold-press-deepm:revive-beast': deepMagicProfile('Revive Beast', {
    manual:
      'Touch beast dead ≤1 minute to restore 1 HP; no old-age revival or missing-part restoration. Death state/healing manual.',
  }),
  'kobold-press-deepm:right-the-stars': deepMagicProfile('Right the Stars', {
    effect: ruleReminder(
      'Right the Stars',
      'Double maximum duration of later concentration conjurations; new conjured creatures get 30 temporary HP, caster Charisma check/save advantage. Apply later timing/HP manually.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Double maximum duration of later concentration conjurations; new conjured creatures get 30 temporary HP, caster Charisma check/save advantage. Apply later timing/HP manually.',
  }),
  'kobold-press-deepm:ring-strike': deepMagicProfile('Ring Strike', {
    effect: ruleReminder(
      'Ring Strike',
      'Two rings; later attack hit within 60 feet may spend ring for 1d10 bludgeoning and Strength-save 5-foot push. Higher slots add two rings; damage/saves/counters manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Two rings; later attack hit within 60 feet may spend ring for 1d10 bludgeoning and Strength-save 5-foot push. Higher slots add two rings; damage/saves/counters manual.',
  }),
  'kobold-press-deepm:ring-ward': deepMagicProfile('Ring Ward', {
    effect: ruleReminder(
      'Ring Ward',
      '15-foot moving ally area grants spell-save advantage and resistance to one chosen damage type. Conditional saves/chosen defenses/area exit manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      '15-foot moving ally area grants spell-save advantage and resistance to one chosen damage type. Conditional saves/chosen defenses/area exit manual.',
  }),
  'kobold-press-deepm:riptide': deepMagicProfile('Riptide', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    manual:
      'Failure restrains/suspends, success moves outside. Next caster start chooses 3d8/push/prone or center/prone with secondary Constitution stun save. Initial movement/later choice manual.',
  }),
  'kobold-press-deepm:rolling-thunder': deepMagicProfile('Rolling Thunder', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: ruleReminder(
      'Rolling Thunder',
      'Stone/crystal/metal disadvantage; failure deafens 1 minute, halves speed and later turn-start 2d8 thunder. End-turn saves and +1d8 higher-slot later damage manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Stone/crystal/metal disadvantage; failure deafens 1 minute, halves speed and later turn-start 2d8 thunder. End-turn saves and +1d8 higher-slot later damage manual.',
  }),
  'kobold-press-deepm:rotting-corpse': deepMagicProfile('Rotting Corpse', {
    manual:
      'Corpse dead ≤24 hours becomes ineligible Raise Dead, after 3 days only True Resurrection. Higher slots add corpses; decomposition/resurrection restrictions manual.',
  }),
  'kobold-press-deepm:rune-of-imprisonment': deepMagicProfile('Rune of Imprisonment', {
    mechanics: { attackRoll: true },
    attackKind: 'ranged',
    manual:
      'Hit isolates target and pauses existing durations/death state; nearby move-action disruption permits Wisdom release save once/round. Imprisonment/paused timers manual.',
  }),
  'kobold-press-deepm:salt-lash': deepMagicProfile('Salt Lash', {
    effect: ruleReminder(
      'Salt Lash',
      'Create casting-ability weapon blade 2d8 slashing; later secondary Constitution failure stuns, with plant/water extra necrotic and undead/construct exception. Release ends; weapon/save outcomes manual.',
      { type: 'rounds', rounds: 100 },
      'self',
      false,
      'up to 10 minutes',
    ),
    manual:
      'Create casting-ability weapon blade 2d8 slashing; later secondary Constitution failure stuns, with plant/water extra necrotic and undead/construct exception. Release ends; weapon/save outcomes manual.',
  }),
  'kobold-press-deepm:sand-ship': deepMagicProfile('Sand Ship', {
    manual:
      'Convert eligible beached vessel to sand sailing at normal speed; cannot traverse soil/rock or float. Crew/propulsion/terrain manual.',
  }),
  'kobold-press-deepm:sanguine-horror': deepMagicProfile('Sanguine Horror', {
    effect: ruleReminder(
      'Sanguine Horror',
      'Pay unprevented 1 piercing to summon blood elemental; commands/initiative manual. Concentration loss makes hostile until hour expiry, not dismissed automatically; adjust summon reminder manually.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Pay unprevented 1 piercing to summon blood elemental; commands/initiative manual. Concentration loss makes hostile until hour expiry, not dismissed automatically; adjust summon reminder manually.',
  }),
  'kobold-press-deepm:scale-rot': deepMagicProfile('Scale Rot', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: ruleReminder(
      'Scale Rot',
      'Natural armor required; failure gives incoming advantage and blocks healing. Repeat Constitution success ends and grants 24-hour immunity; frequency unspecified, resolve manually. Higher slots add targets.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Natural armor required; failure gives incoming advantage and blocks healing. Repeat Constitution success ends and grants 24-hour immunity; frequency unspecified, resolve manually. Higher slots add targets.',
  }),
  'kobold-press-deepm:scentless': deepMagicProfile('Scentless', {
    effect: ruleReminder(
      'Scentless',
      'Willing creature/unworn object loses odor unless unusually strong scent; smell-only observers treat invisible, smell checks disadvantaged. Conditional perception manual.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Willing creature/unworn object loses odor unless unusually strong scent; smell-only observers treat invisible, smell checks disadvantaged. Conditional perception manual.',
  }),
  'kobold-press-deepm:screaming-ray': deepMagicProfile('Screaming Ray', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '1d4', type: 'psychic' }], 1, [0]),
    },
    attackKind: 'ranged',
    manual:
      'Hit separately Constitution save against deafness until caster next turn end. Higher slots add independently aimed rays, not damage dice; secondary saves/allocation manual.',
  }),
}
