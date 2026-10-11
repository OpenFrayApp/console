// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { ruleReminder, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_14: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:snow-boulder': deepMagicProfile('Snow Boulder', {
    effect: ruleReminder(
      'Snow Boulder',
      'Create moving/growing boulder; later ranged spell hit then Dexterity failure causes round-indexed bludgeoning/prone. Hit does not stop growth; staged attacks and movement manual.',
      { type: 'rounds', rounds: 4 },
      'self',
      false,
      'up to 4 rounds',
    ),
    manual:
      'Create moving/growing boulder; later ranged spell hit then Dexterity failure causes round-indexed bludgeoning/prone. Hit does not stop growth; staged attacks and movement manual.',
  }),
  'kobold-press-deepm:snow-fort': deepMagicProfile('Snow Fort', {
    manual:
      'Permanent snow fort grants directional half cover, printed wall defenses/cold repairs; creates twelve mixed-damage snowballs. Fort/item attacks manual, no Instantaneous expiry.',
  }),
  'kobold-press-deepm:snowy-coat': deepMagicProfile('Snowy Coat', {
    effect: ruleReminder(
      'Snowy Coat',
      'Snow-only Stealth advantage; later bonus-action snow invisibility lasts minute then entire spell ends, attacks/casting end early. Higher slots add targets; conditional state manual.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Snow-only Stealth advantage; later bonus-action snow invisibility lasts minute then entire spell ends, attacks/casting end early. Higher slots add targets; conditional state manual.',
  }),
  'kobold-press-deepm:speak-with-inanimate-object': deepMagicProfile(
    'Speak with Inanimate Object',
    {
      manual:
        'Ask awakened object spirit up to three yes/no questions within 10 minutes; attitude and limited senses govern answers. No combat roll.',
    },
  ),
  'kobold-press-deepm:spin': deepMagicProfile('Spin', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Spin',
      'Failure spins in place, end-turn repeat saves; after full round attack/check disadvantage persists one round beyond spinning. Behavior and separate residual timer manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure spins in place, end-turn repeat saves; after full round attack/check disadvantage persists one round beyond spinning. Behavior and separate residual timer manual.',
  }),
  'kobold-press-deepm:spinning-axes': deepMagicProfile('Spinning Axes', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '5d8', type: 'force' }], 4, [1]),
    },
    manual:
      'Any damaged living nonconstruct starts bleeding even on save success: later end-turn 2d6 necrotic, minute/Medicine/healing endpoints. Bleeding manual; +1d8 initial force per higher slot.',
  }),
  'kobold-press-deepm:spiteful-weapon': deepMagicProfile('Spiteful Weapon', {
    effect: ruleReminder(
      'Spiteful Weapon',
      'Requires victim, attacker, injuring weapon from past day; later attacker damage while holding weapon triggers Charisma half-save matching damage. Healing attacker ends, slot 5+ save disadvantage; triggers/manual.',
      { type: 'rounds', rounds: 5 },
      'enemy',
      true,
      'up to 5 rounds',
    ),
    manual:
      'Requires victim, attacker, injuring weapon from past day; later attacker damage while holding weapon triggers Charisma half-save matching damage. Healing attacker ends, slot 5+ save disadvantage; triggers/manual.',
  }),
  'kobold-press-deepm:spur-mount': deepMagicProfile('Spur Mount', {
    effect: ruleReminder(
      'Spur Mount',
      'Only current ridden mount gets bonus-action Dash/Disengage until caster next turn end; action economy/expiry manual.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Only current ridden mount gets bonus-action Dash/Disengage until caster next turn end; action economy/expiry manual.',
  }),
  'kobold-press-deepm:staff-of-violet-fire': deepMagicProfile('Staff of Violet Fire', {
    effect: ruleReminder(
      'Staff of Violet Fire',
      'Create 10-charge staff; later charge-spending melee/ranged attacks have different damage and higher-slot scaling. Card says three effects but lists two; do not invent third. Charges/recovery manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Create 10-charge staff; later charge-spending melee/ranged attacks have different damage and higher-slot scaling. Card says three effects but lists two; do not invent third. Charges/recovery manual.',
  }),
  'kobold-press-deepm:stanch': deepMagicProfile('Stanch', {
    manual:
      'Stabilize dying target/end ongoing bleeding immediately and prevent blood sourcing for hour. State/removal manual.',
  }),
  'kobold-press-deepm:stars-heart': deepMagicProfile("Star's Heart", {
    manual:
      'Initial drop/prone/incapacity automatic, not saved; later Strength outcomes control damage/recovery. Triple falling damage, short projectile ranges, movement-magic exception, ongoing area manual.',
  }),
  'kobold-press-deepm:starburst': deepMagicProfile('Starburst', {
    mechanics: {
      save: { ability: 'cha', onSave: 'negates' },
      ...reviewedDamage([{ formula: '1d8', type: 'radiant' }], 0, [1]),
    },
    manual: 'Select creatures in chosen 5-foot cube; cantrip scales at 5/11/17.',
  }),
  'kobold-press-deepm:starfall': deepMagicProfile('Starfall', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '6d6', type: 'radiant' }], 5, [0]),
    },
    manual:
      'Up to five distinct targets; failure prone/blind until caster next turn start. No multiple bolts into same creature; higher slots add bolts, riders manual.',
  }),
  'kobold-press-deepm:starry-vision': deepMagicProfile('Starry Vision', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: ruleReminder(
      'Starry Vision',
      'Use source-specific Compelling Fate relational attacks/movement/warning benefits; end-turn repeat saves end. Higher slots increase armor warning bonus; no same-name Core fallback, benefits manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Use source-specific Compelling Fate relational attacks/movement/warning benefits; end-turn repeat saves end. Higher slots increase armor warning bonus; no same-name Core fallback, benefits manual.',
  }),
  'kobold-press-deepm:steal-warmth': deepMagicProfile('Steal Warmth', {
    manual:
      'Reaction after cold damage transfers it to living target with Constitution half-save, healing caster by actual target damage. Variable damage and higher-slot range manual.',
  }),
  'kobold-press-deepm:steam-blast': deepMagicProfile('Steam Blast', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '5d8', type: 'fire' }], 4, [1]),
    },
    manual:
      'Exclude caster within 15 feet; extinguish small mundane fires and wet objects manually. +1d8 per higher slot.',
  }),
  'kobold-press-deepm:steam-whistle': deepMagicProfile('Steam Whistle', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '10d10', type: 'thunder' }], 8, [0]),
    },
    manual:
      'Other creatures within 30 feet deafened on both outcomes: failure 1d8 hours, success 1 round. Rolled/conditional deafness duration manual.',
  }),
  'kobold-press-deepm:stench-of-rot': deepMagicProfile('Stench of Rot', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: ruleReminder(
      'Stench of Rot',
      'Exclude constructs/undead. Failure curses with Charisma/concentration-save disadvantage and smell-track bonus using caster modifier. Remove Curse/higher-slot hours and modifiers manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Exclude constructs/undead. Failure curses with Charisma/concentration-save disadvantage and smell-track bonus using caster modifier. Remove Curse/higher-slot hours and modifiers manual.',
  }),
  'kobold-press-deepm:storm-of-wings': deepMagicProfile('Storm of Wings', {
    effect: ruleReminder(
      'Storm of Wings',
      'Choose bats/birds/insects for immediate and later 4d6 differently typed damage and mode-specific restrictions. Bonus-action movement/action mode change; chosen damage/later saves manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Choose bats/birds/insects for immediate and later 4d6 differently typed damage and mode-specific restrictions. Bonus-action movement/action mode change; chosen damage/later saves manual.',
  }),
  'kobold-press-deepm:sudden-dawn': deepMagicProfile('Sudden Dawn', {
    effect: ruleReminder(
      'Sudden Dawn',
      '30-foot-radius/100-foot-high bright-light cylinder limited by obstruction; light/visibility manual.',
      { type: 'rounds', rounds: 100 },
      'self',
      false,
      'up to 10 minutes',
    ),
    manual:
      '30-foot-radius/100-foot-high bright-light cylinder limited by obstruction; light/visibility manual.',
  }),
  'kobold-press-deepm:summon-eldritch-servitor': deepMagicProfile('Summon Eldritch Servitor', {
    manual:
      'Create chosen summons; initial caster Charisma determines friendliness, recurring Wisdom checks cause psychic/taint/madness. Concentration loss delays hostile disappearance 1d6 rounds; summons/control/slot choices manual.',
  }),
  'kobold-press-deepm:summon-star': deepMagicProfile('Summon Star', {
    effect: ruleReminder(
      'Summon Star',
      'Command deva-equivalent star with separate initiative; viewers except caster Wisdom save against charm, end-turn repeat saves grant immunity. Summon/charm manual, no premature attack.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Command deva-equivalent star with separate initiative; viewers except caster Wisdom save against charm, end-turn repeat saves grant immunity. Summon/charm manual, no premature attack.',
  }),
  'kobold-press-deepm:surge-dampener': deepMagicProfile('Surge Dampener', {
    effect: ruleReminder(
      'Surge Dampener',
      'One other touched creature gets DC 13 Charisma save against otherwise-unsaveable surge or advantage on ordinary surge save; success expends protection. Conditional saves manual.',
      { type: 'rounds', rounds: 10 },
      'ally',
      true,
      '1 minute, until expended',
    ),
    manual:
      'One other touched creature gets DC 13 Charisma save against otherwise-unsaveable surge or advantage on ordinary surge save; success expends protection. Conditional saves manual.',
  }),
  'kobold-press-deepm:surprise-blessing': deepMagicProfile('Surprise Blessing', {
    manual:
      'Suspend one existing listed condition and substitute its printed benefit; on early expiry caster inherits remaining original condition. Chosen replacements, healing/auras, and retained timers manual.',
  }),
  'kobold-press-deepm:symbol-of-sorcery': deepMagicProfile('Symbol of Sorcery', {
    manual:
      'Create dormant symbol; later nearby noncaster triggers Wisdom-save stun cone, end-turn release saves. No initial save; single-trigger trap/conditions manual.',
  }),
  'kobold-press-deepm:talons-of-a-hungry-land': deepMagicProfile('Talons of a Hungry Land', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '8d8', type: 'slashing' }], 7, [1]),
    },
    persistsAfterSave: true,
    manual:
      'Initial spikes damage; cover, quadruple movement cost, later entry/end saves, and optional concentration-ending 5d8 blast manual. All damage components scale +1d8 higher slots.',
  }),
  'kobold-press-deepm:targeting-foreknowledge': deepMagicProfile('Targeting Foreknowledge', {
    manual:
      'After successful melee weapon hit add noncritical 2d6 weapon-typed damage; original natural 19+ becomes critical with original dice. Weapon damage and critical adjustment manual.',
  }),
  'kobold-press-deepm:thin-the-ice': deepMagicProfile('Thin the Ice', {
    manual:
      'Create concealed ice-water pit; eligible weight collapses, Dexterity failure falls/takes 2d6 cold plus environment effects. Initial/later occupants, detection, and refreezing manual.',
  }),
  'kobold-press-deepm:thousand-darts': deepMagicProfile('Thousand Darts', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '6d6', type: 'piercing' }], 3, [1]),
    },
    manual:
      '120-by-5-foot line; first creature’s save has disadvantage only, apply manually. +1d6 per higher slot.',
  }),
  'kobold-press-deepm:throes-of-ecstasy': deepMagicProfile('Throes of Ecstasy', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: ruleReminder(
      'Throes of Ecstasy',
      'Humanoid failure incapacitates, auto-fails Wisdom saves and grants incoming advantage. End-turn success ends with one exhaustion; full duration ends with three. Conditions/ending manual; higher slots add targets.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Humanoid failure incapacitates, auto-fails Wisdom saves and grants incoming advantage. End-turn success ends with one exhaustion; full duration ends with three. Conditions/ending manual; higher slots add targets.',
  }),
}
