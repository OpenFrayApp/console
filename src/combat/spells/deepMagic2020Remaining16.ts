// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile, deepMagicTurnConditions } from './deepMagic2020Profile.ts'
import { ruleReminder, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_16: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:undermine-armor': deepMagicProfile('Undermine Armor', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: ruleReminder(
      'Undermine Armor',
      'Only worn armor eligible; failure decreases AC by 2. Armor change/removal on ending manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Only worn armor eligible; failure decreases AC by 2. Armor change/removal on ending manual.',
  }),
  'kobold-press-deepm:unholy-defiance': deepMagicProfile('Unholy Defiance', {
    effect: ruleReminder(
      'Unholy Defiance',
      'Undead in area advantage only against turning; existing Turning Defiance adds d4 instead of blanket bonuses. Conditional saves/eligibility manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Undead in area advantage only against turning; existing Turning Defiance adds d4 instead of blanket bonuses. Conditional saves/eligibility manual.',
  }),
  'kobold-press-deepm:unleash-effigy': deepMagicProfile('Unleash Effigy', {
    effect: ruleReminder(
      'Unleash Effigy',
      'Statue becomes commanded stone golem acting after caster; bonus-action orders within 60 feet. Low HP/distance start-turn casting check may cause permanent berserk; summon/state manual.',
      { type: 'rounds', rounds: 100 },
      'self',
      false,
      'up to 10 minutes',
    ),
    manual:
      'Statue becomes commanded stone golem acting after caster; bonus-action orders within 60 feet. Low HP/distance start-turn casting check may cause permanent berserk; summon/state manual.',
  }),
  'kobold-press-deepm:unluck-on-that': deepMagicProfile('Unluck On That', {
    manual:
      'Impose disadvantage on triggering roll only; higher slots extend range. Resolve roll manually, no lasting penalty.',
  }),
  'kobold-press-deepm:unseen-strangler': deepMagicProfile('Unseen Strangler', {
    effect: ruleReminder(
      'Unseen Strangler',
      'Stationary invulnerable guardian warns; later caster-start melee weapon hit grapples/restrains, critical suffocates. Uses casting modifier plus proficiency, not normal weapon attack. Password/distance/escape manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Stationary invulnerable guardian warns; later caster-start melee weapon hit grapples/restrains, critical suffocates. Uses casting modifier plus proficiency, not normal weapon attack. Password/distance/escape manual.',
  }),
  'kobold-press-deepm:visage-of-madness': deepMagicProfile('Visage of Madness', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    manual:
      'Seeing foe failure deals self 1d6 plus its Strength piercing, stun until target next turn end, blind 1d4 rounds or permanently on natural 6. Target-dependent damage/rolled conditions manual.',
  }),
  'kobold-press-deepm:vital-mark': deepMagicProfile('Vital Mark', {
    manual:
      'Mark unattended magic item, abilities function only for caster; slot 4+ daily 28 casts makes permanent. Item ownership/abilities manual.',
  }),
  'kobold-press-deepm:void-rift': deepMagicProfile('Void Rift', {
    effect: ruleReminder(
      'Void Rift',
      'No initial damage. Entry/start Strength pull and automatic 8d10 necrotic rift contact; inside blinded/deafened. Caster end-turn 2d6 necrotic, object movement and terrain manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'No initial damage. Entry/start Strength pull and automatic 8d10 necrotic rift contact; inside blinded/deafened. Caster end-turn 2d6 necrotic, object movement and terrain manual.',
  }),
  'kobold-press-deepm:void-strike': deepMagicProfile('Void Strike', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '5d8', type: 'necrotic' }], 3, [1]),
    },
    attackKind: 'ranged',
    persistsAfterSave: true,
    effect: deepMagicTurnConditions(['Frightened'], 'caster', 'startOfTurn'),
    manual:
      'Optional initial/later action bolt; advantage only if target dim/dark, hit frightens until caster next turn start. Conditional advantage/rider manual; +1d8 higher slots.',
  }),
  'kobold-press-deepm:volley-shield': deepMagicProfile('Volley Shield', {
    effect: ruleReminder(
      'Volley Shield',
      'Willing target +5 armor, nonmagical physical resistance; successful hostile-spell save reflects to caster with new save and caster-level effects. Defenses/reflection manual.',
      { type: 'rounds', rounds: 10 },
      'ally',
      true,
      'up to 1 minute',
    ),
    manual:
      'Willing target +5 armor, nonmagical physical resistance; successful hostile-spell save reflects to caster with new save and caster-level effects. Defenses/reflection manual.',
  }),
  'kobold-press-deepm:vomit-tentacles': deepMagicProfile('Vomit Tentacles', {
    manual:
      '15-foot melee spell hit deals 2d6 plus caster Strength, grapples/restrains and later caster-start same damage. Tentacle sever threshold uses Constitution; speech/verbal casting prohibited, attacks/escape manual.',
  }),
  'kobold-press-deepm:voorish-sign': deepMagicProfile('Voorish Sign', {
    effect: ruleReminder(
      'Voorish Sign',
      'Only caster sees invisible creatures/objects within moving radius; fear-save advantage. Higher slots enlarge every two levels; conditional senses/saves manual.',
      { type: 'rounds', rounds: 100 },
      'self',
      false,
      'up to 10 minutes',
    ),
    manual:
      'Only caster sees invisible creatures/objects within moving radius; fear-save advantage. Higher slots enlarge every two levels; conditional senses/saves manual.',
  }),
  'kobold-press-deepm:waft': deepMagicProfile('Waft', {
    effect: ruleReminder(
      'Waft',
      '60-foot flight until next turn start then gentle descent onto solid surface below. Movement/landing manual.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'self',
      false,
      'Until caster next turn start',
    ),
    manual:
      '60-foot flight until next turn start then gentle descent onto solid surface below. Movement/landing manual.',
  }),
  'kobold-press-deepm:walk-the-twisted-path': deepMagicProfile('Walk the Twisted Path', {
    manual:
      'Caster/up to five enter travel maze; repeated DC 20 Intelligence check fails for 4d6 psychic each, eligible retracing auto-success. Higher slots choose passengers/range; navigation/damage manual.',
  }),
  'kobold-press-deepm:walking-wall': deepMagicProfile('Walking Wall', {
    effect: ruleReminder(
      'Walking Wall',
      'Create printed AC/HP wall; bonus-action orders movement/up to four later spell-bonus attacks, retains command without action, no reactions. Summon attacks/defenses manual.',
      { type: 'rounds', rounds: 100 },
      'self',
      false,
      'up to 10 minutes',
    ),
    manual:
      'Create printed AC/HP wall; bonus-action orders movement/up to four later spell-bonus attacks, retains command without action, no reactions. Summon attacks/defenses manual.',
  }),
  'kobold-press-deepm:wall-of-time': deepMagicProfile('Wall of Time', {
    effect: ruleReminder(
      'Wall of Time',
      'Wall deletes crossing mundane projectiles, disadvantages magical ranged attacks and applies Slow on voluntary entry without initial save. Barrier/conditional rolls/later Slow manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Wall deletes crossing mundane projectiles, disadvantages magical ranged attacks and applies Slow on voluntary entry without initial save. Barrier/conditional rolls/later Slow manual.',
  }),
  'kobold-press-deepm:warning-shout': deepMagicProfile('Warning Shout', {
    manual:
      'Visible hearing ally gets initiative advantage on triggering roll only; no Instantaneous expiry before initiative. Resolve initiative manually.',
  }),
  'kobold-press-deepm:warp-mind-and-matter': deepMagicProfile('Warp Mind and Matter', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    manual:
      'Failure causes selected flesh warp and indefinite madness until cure/dispel; GM table outcomes and permanent state manual.',
  }),
  'kobold-press-deepm:weapon-of-blood': deepMagicProfile('Weapon of Blood', {
    effect: ruleReminder(
      'Weapon of Blood',
      'Pay unhealable slashing to create tier-specific magic dagger; healing restriction ends with blade/spell. Printed higher-slot costs/bonuses/wounding and weapon attacks manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Pay unhealable slashing to create tier-specific magic dagger; healing restriction ends with blade/spell. Printed higher-slot costs/bonuses/wounding and weapon attacks manual.',
  }),
  'kobold-press-deepm:weilers-ward': deepMagicProfile('Weiler’s Ward', {
    effect: ruleReminder(
      'Weiler’s Ward',
      'Four orbs; later eligible enemy entry/start allows reaction selecting orbs, Charisma failure pushes/deals 1d6 force each. Orb count, targeting/consumption and higher slots manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Four orbs; later eligible enemy entry/start allows reaction selecting orbs, Charisma failure pushes/deals 1d6 force each. Orb count, targeting/consumption and higher slots manual.',
  }),
  'kobold-press-deepm:wild-shield': deepMagicProfile('Wild Shield', {
    effect: ruleReminder(
      'Wild Shield',
      'Stealth impossible; reaction repel eligible spells consumes level pool and may chaos surge. Over-budget ability check and higher-slot capacity/manual outcomes.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      '1 minute',
    ),
    manual:
      'Stealth impossible; reaction repel eligible spells consumes level pool and may chaos surge. Over-budget ability check and higher-slot capacity/manual outcomes.',
  }),
  'kobold-press-deepm:wind-lash': deepMagicProfile('Wind Lash', {
    mechanics: {
      attackRoll: true,
      ...reviewedDamage([{ formula: '1d8', type: 'slashing' }], 0, [1]),
    },
    attackKind: 'melee',
    manual: 'Hit pushes 5 feet manually; cantrip scales at 5/11/17.',
  }),
  'kobold-press-deepm:wind-of-the-hereafter': deepMagicProfile('Wind of the Hereafter', {
    effect: ruleReminder(
      'Wind of the Hereafter',
      'No initial damage; turn-start Constitution half-save 8d8 necrotic, nonbreathers still affected. Sphere drifts 10 feet caster starts and randomly turns at barriers; later hazards manual.',
      { type: 'rounds', rounds: 100 },
      'self',
      false,
      'up to 10 minutes',
    ),
    manual:
      'No initial damage; turn-start Constitution half-save 8d8 necrotic, nonbreathers still affected. Sphere drifts 10 feet caster starts and randomly turns at barriers; later hazards manual.',
  }),
  'kobold-press-deepm:wind-tunnel': deepMagicProfile('Wind Tunnel', {
    effect: ruleReminder(
      'Wind Tunnel',
      'Stationary directional wind alters movement/ranged attacks depending direction; clears vapor, extinguishes flames with protected-flame 50% chance. Conditional terrain/attacks manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Stationary directional wind alters movement/ranged attacks depending direction; clears vapor, extinguishes flames with protected-flame 50% chance. Conditional terrain/attacks manual.',
  }),
  'kobold-press-deepm:winters-radiance': deepMagicProfile("Winter's Radiance", {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: ruleReminder(
      "Winter's Radiance",
      'Failure disadvantages ranged attacks/Perception and grants targets three-quarters cover. Conditional cover/modifiers manual, not blinded.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure disadvantages ranged attacks/Perception and grants targets three-quarters cover. Conditional cover/modifiers manual, not blinded.',
  }),
  'kobold-press-deepm:winterdark': deepMagicProfile('Winterdark', {
    mechanics: {
      save: { ability: 'con', onSave: 'negates' },
      ...reviewedDamage([{ formula: '1d6', type: 'cold' }], 6, [0]),
    },
    persistsAfterSave: true,
    manual:
      'Dark/cold cylinder initial and later turn-start saves; failure exhaustion except cold-immune/cold-adapted/geared targets. Bonus-action area movement, exhaustion/eligibility manual.',
  }),
  'kobold-press-deepm:wintry-glide': deepMagicProfile('Wintry Glide', {
    effect: ruleReminder(
      'Wintry Glide',
      'Requires available 10-foot movement and adjacent contiguous ice/snow; transit up to 500 feet. Destroyed mass Constitution save or 4d6/prone midpoint; movement/later save manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Requires available 10-foot movement and adjacent contiguous ice/snow; transit up to 500 feet. Destroyed mass Constitution save or 4d6/prone midpoint; movement/later save manual.',
  }),
  'kobold-press-deepm:withered-sight': deepMagicProfile('Withered Sight', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: ruleReminder(
      'Withered Sight',
      'Exclude blind/non-eye sight targets; failure attack/Perception disadvantage with end-turn repeat saves. Higher slots add targets; modifiers manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Exclude blind/non-eye sight targets; failure attack/Perception disadvantage with end-turn repeat saves. Higher slots add targets; modifiers manual.',
  }),
  'kobold-press-deepm:wolfsong': deepMagicProfile('Wolfsong', {
    manual:
      'Convey ≤9-word howl to dogs/wolves plus named recipient, range varies outdoors/indoors/underground. Higher-slot recipient threshold printed above 2nd; communication manual.',
  }),
  'kobold-press-deepm:word-of-misfortune': deepMagicProfile('Word of Misfortune', {
    effect: ruleReminder(
      'Word of Misfortune',
      'Next save subtracts d4 then ends spell; apply result, spend reminder and clear concentration manually.',
      { type: 'rounds', rounds: 10 },
      'enemy',
      true,
      'up to 1 minute',
    ),
    manual:
      'Next save subtracts d4 then ends spell; apply result, spend reminder and clear concentration manually.',
  }),
}
