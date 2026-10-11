// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { ruleReminder, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_9: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:hide-in-ones-shadow': deepMagicProfile('Hide in One’s Shadow', {
    effect: ruleReminder(
      'Hide in One’s Shadow',
      'Willing creature becomes mobile surface shadow immune except psychic/radiant; leaving shadow or invalid lighting ends spell. Apply defenses/position manually.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Willing creature becomes mobile surface shadow immune except psychic/radiant; leaving shadow or invalid lighting ends spell. Apply defenses/position manually.',
  }),
  'kobold-press-deepm:hoarfrost': deepMagicProfile('Hoarfrost', {
    effect: ruleReminder(
      'Hoarfrost',
      'Held melee weapon becomes magical; next successful hit adds 1d4 cold then ends, releasing weapon also ends. Cantrip tier dice and attack trigger manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      '1 minute',
    ),
    manual:
      'Held melee weapon becomes magical; next successful hit adds 1d4 cold then ends, releasing weapon also ends. Cantrip tier dice and attack trigger manual.',
  }),
  'kobold-press-deepm:hobble': deepMagicProfile('Hobble', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    manual:
      'Failure halves speed until target next turn end despite Instantaneous header; apply and expire manually.',
  }),
  'kobold-press-deepm:hobble-mount': deepMagicProfile('Hobble Mount', {
    mechanics: { attackRoll: true },
    attackKind: 'melee',
    manual:
      'Only eligible ridden beasts; hit imposes later 2d6 bludgeoning if moving over half base speed in turn. No initial damage or automatic speed reduction.',
  }),
  'kobold-press-deepm:holy-ground': deepMagicProfile('Holy Ground', {
    effect: ruleReminder(
      'Holy Ground',
      'Corpses killed inside cannot rise undead; prevent summon/animate-undead spells through slot 4, higher-slot thresholds increase. Area/eligibility manual.',
      { type: 'rounds', rounds: 100 },
      'self',
      false,
      'up to 10 minutes',
    ),
    manual:
      'Corpses killed inside cannot rise undead; prevent summon/animate-undead spells through slot 4, higher-slot thresholds increase. Area/eligibility manual.',
  }),
  'kobold-press-deepm:hone-blade': deepMagicProfile('Hone Blade', {
    manual:
      'Touch blade to grant +1 damage only on next successful hit; no Instantaneous expiry or persistent attack bonus. Weapon tracking manual.',
  }),
  'kobold-press-deepm:hunger-of-leng': deepMagicProfile('Hunger of Leng', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Hunger of Leng',
      'Digestive-system failure compels nearest eligible creature bite/self-damage with size-dependent Strength-based damage. Wounded-target advantage and two-consecutive-failure lock-in/end-turn saves manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Digestive-system failure compels nearest eligible creature bite/self-damage with size-dependent Strength-based damage. Wounded-target advantage and two-consecutive-failure lock-in/end-turn saves manual.',
  }),
  'kobold-press-deepm:hunters-endurance': deepMagicProfile("Hunter's Endurance", {
    effect: ruleReminder(
      "Hunter's Endurance",
      'Named quarry pursuit grants conditional tracking advantages and suspends pursuit exhaustion, restored on ending. Geas-like pursuit and printed early endpoints manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Named quarry pursuit grants conditional tracking advantages and suspends pursuit exhaustion, restored on ending. Geas-like pursuit and printed early endpoints manual.',
  }),
  'kobold-press-deepm:hunting-stand': deepMagicProfile('Hunting Stand', {
    manual:
      'Create camouflaged 10-foot shelter for nine Medium-or-smaller; outsiders disadvantage only on checks locating inhabitants. Shelter/weather/concealment manual.',
  }),
  'kobold-press-deepm:ice-fortress': deepMagicProfile('Ice Fortress', {
    manual:
      'Permanent ice fort has printed wall/door defenses, collapse chance and cold-damage repairs. Sunlight-dependent incoming disadvantage and higher-slot dimensions manual.',
  }),
  'kobold-press-deepm:ice-hammer': deepMagicProfile('Ice Hammer', {
    effect: ruleReminder(
      'Ice Hammer',
      'Create transferable warhammer with 1d10 extra cold; cumulative 20 fire damage to weapon/user destroys it. Higher-slot additional/oversized weapons and attacks manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Create transferable warhammer with 1d10 extra cold; cumulative 20 fire damage to weapon/user destroys it. Higher-slot additional/oversized weapons and attacks manual.',
  }),
  'kobold-press-deepm:ice-soldiers': deepMagicProfile('Ice Soldiers', {
    effect: ruleReminder(
      'Ice Soldiers',
      'Summon two soldiers acting on caster turn; pursue commanded target until dead then melt, also melt beyond 30 feet. Higher slots add soldier; no initial attack.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      '1 minute',
    ),
    manual:
      'Summon two soldiers acting on caster turn; pursue commanded target until dead then melt, also melt beyond 30 feet. Higher slots add soldier; no initial attack.',
  }),
  'kobold-press-deepm:icicle-daggers': deepMagicProfile('Icicle Daggers', {
    manual:
      'Create three dagger weapons with extra 1d4 cold; caster-only/time/temperature/fire-damage melting rules. Higher slots add daggers and change post-throw expiry; attacks manual.',
  }),
  'kobold-press-deepm:icy-grasp-of-the-void': deepMagicProfile('Icy Grasp of the Void', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '10d10', type: 'cold' }], 7, [0]),
    },
    effect: ruleReminder(
      'Icy Grasp of the Void',
      'Failure restrains with end-turn repeat save to end. Later exhaustion except cold-immune nonbreathers; conditions, exceptions, and timing manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure restrains with end-turn repeat save to end. Later exhaustion except cold-immune nonbreathers; conditions, exceptions, and timing manual.',
  }),
  'kobold-press-deepm:icy-manipulation': deepMagicProfile('Icy Manipulation', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    manual:
      'Failure freezes/petrifies. Two later successes free; two failures or full-minute concentration makes permanent. Injury/restoration and reverse casting manual; no automatic removal of permanent state.',
  }),
  'kobold-press-deepm:ill-fated-word': deepMagicProfile('Ill-Fated Word', {
    manual:
      'Subtract d4 from just-made attack/check/save and recalculate outcome manually; no enduring penalty.',
  }),
  'kobold-press-deepm:illuminate-spoor': deepMagicProfile('Illuminate Spoor', {
    effect: ruleReminder(
      'Illuminate Spoor',
      'Caster and three viewers automatically track glowing uncovered tracks, advantage if covered; changed footprints stop glow. Action renews tracks, higher-slot duration manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Caster and three viewers automatically track glowing uncovered tracks, advantage if covered; changed footprints stop glow. Action renews tracks, higher-slot duration manual.',
  }),
  'kobold-press-deepm:impending-ally': deepMagicProfile('Impending Ally', {
    effect: ruleReminder(
      'Impending Ally',
      'Duplicate acts immediately after caster and shares resource expenditure; disappears on caster death/ending. Build/resource modeling and higher-slot rounds manual.',
      { type: 'rounds', rounds: 2 },
      'self',
      false,
      'up to 2 rounds',
    ),
    manual:
      'Duplicate acts immediately after caster and shares resource expenditure; disappears on caster death/ending. Build/resource modeling and higher-slot rounds manual.',
  }),
  'kobold-press-deepm:innocuous-aspect': deepMagicProfile('Innocuous Aspect', {
    effect: ruleReminder(
      'Innocuous Aspect',
      'Chosen nearby creatures share identical harmless appearance; only visuals change. Action Investigation versus spell DC reveals illusion; perception checks manual.',
      { type: 'rounds', rounds: 100 },
      'self',
      false,
      'up to 10 minutes',
    ),
    manual:
      'Chosen nearby creatures share identical harmless appearance; only visuals change. Action Investigation versus spell DC reveals illusion; perception checks manual.',
  }),
  'kobold-press-deepm:insightful-maneuver': deepMagicProfile('Insightful Maneuver', {
    manual:
      'Until current turn end only, target vulnerable to chosen type and other vulnerabilities revealed. Apply chosen defense and expire manually despite Instantaneous header.',
  }),
  'kobold-press-deepm:inspiring-speech': deepMagicProfile('Inspiring Speech', {
    effect: ruleReminder(
      'Inspiring Speech',
      'Listeners gain +1 attacks, charm/fear-save advantage, casting-modifier temporary HP; end beyond caster mile/death, no stacking. Apply HP/conditional benefits manually.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Listeners gain +1 attacks, charm/fear-save advantage, casting-modifier temporary HP; end beyond caster mile/death, no stacking. Apply HP/conditional benefits manually.',
  }),
  'kobold-press-deepm:instant-fortification': deepMagicProfile('Instant Fortification', {
    manual:
      'Create permanent fort with printed stone/door defenses and Arcane Lock permissions. Higher slots add chosen dimensions; no initial creature roll.',
  }),
  'kobold-press-deepm:instant-siege-weapon': deepMagicProfile('Instant Siege Weapon', {
    manual:
      'Transform eligible materials of sufficient value into siege engine and ammunition; higher slots alter engine size/ammo. Item creation and subsequent attacks manual.',
  }),
  'kobold-press-deepm:instant-snare': deepMagicProfile('Instant Snare', {
    manual:
      'Create traps, no initial save. Later trigger Dexterity failure restrains suspended target; repeat saves, Arcana release/reset/destruction, reaction trigger and ping manual. Higher slots add snares.',
  }),
  'kobold-press-deepm:ire-of-the-mountain': deepMagicProfile('Ire of the Mountain', {
    manual:
      'Metal-object Dexterity success deals 1d8 fire, failure holding/wearing deals 2d8/4d8 and destroys item; uncarried melts automatically. Variable outcomes/higher-slot objects manual.',
  }),
  'kobold-press-deepm:iron-hand': deepMagicProfile('Iron Hand', {
    effect: ruleReminder(
      'Iron Hand',
      'One arm fire-immune, not whole creature; Dodge grants general fire resistance until caster next turn start. Conditional defenses manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'One arm fire-immune, not whole creature; Dodge grants general fire resistance until caster next turn start. Conditional defenses manual.',
  }),
  'kobold-press-deepm:kareefs-entreaty': deepMagicProfile('Kareef’s Entreaty', {
    manual:
      'Reaction grants next death-save advantage; result 18+ heals 3d4. Higher-slot save bonus/healing and linked death-save outcome manual.',
  }),
  'kobold-press-deepm:keening-wail': deepMagicProfile('Keening Wail', {
    manual:
      'Exclude undead/constructs. Constitution half-save 6d6 necrotic, but HP ≤50 and failure margin ≥5 instead drops to 0. +1d6 higher-slot dice; replacement outcome manual.',
  }),
  'kobold-press-deepm:killing-fields': deepMagicProfile('Killing Fields', {
    manual:
      'Natural preserve tracks eligible beasts/monstrosities and blocks failed exit saves. Helped versus hindered conditional pack advantage, once-turn weapon bonus, tracking and permanence manual.',
  }),
  'kobold-press-deepm:kiss-of-the-succubus': deepMagicProfile('Kiss of the Succubus', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '5d10', type: 'psychic' }], 5, [1]),
    },
    manual:
      'Requires willing/charmed/controlled kiss recipient. Reduce maximum HP by actual damage until long rest; maximum 0 kills. Reduction manual; +1d10 per higher slot.',
  }),
}
