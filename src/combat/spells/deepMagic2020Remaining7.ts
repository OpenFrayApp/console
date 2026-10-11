// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { reviewedDamage, ruleReminder } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_7: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:fault-line': deepMagicProfile('Fault Line', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '8d6', type: 'bludgeoning' }], 6, [0]),
    },
    manual:
      '5-by-60-foot line becomes permanent difficult terrain; failure prone, success prevents prone. Does not damage permanent structures; terrain/standing manual.',
  }),
  'kobold-press-deepm:feather-field': deepMagicProfile('Feather Field', {
    effect: ruleReminder(
      'Feather Field',
      '+5 armor class only against ranged magic-weapon attacks until caster next turn start; higher slots add rounds. Conditional defense and adjusted expiry manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      '+5 armor class only against ranged magic-weapon attacks until caster next turn start; higher slots add rounds. Conditional defense and adjusted expiry manual.',
  }),
  'kobold-press-deepm:feather-travel': deepMagicProfile('Feather Travel', {
    effect: ruleReminder(
      'Feather Travel',
      'Transform target/gear into wind-carried feather with 5-foot steering per round; restore gently on ending. Higher slots add two targets; movement/stat changes manual.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Transform target/gear into wind-carried feather with 5-foot steering per round; restore gently on ending. Higher slots add two targets; movement/stat changes manual.',
  }),
  'kobold-press-deepm:fey-crown': deepMagicProfile('Fey Crown', {
    effect: ruleReminder(
      'Fey Crown',
      'Five flowers give magic-save advantage/charm immunity; bonus-action selected creature gets invisibility/magic-save advantage until its next turn end. Spend flowers and delayed ending manually; higher slots add flowers.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Five flowers give magic-save advantage/charm immunity; bonus-action selected creature gets invisibility/magic-save advantage until its next turn end. Spend flowers and delayed ending manually; higher slots add flowers.',
  }),
  'kobold-press-deepm:find-kin': deepMagicProfile('Find Kin', {
    manual:
      'Willing touch automatic; unwilling requires melee spell hit then Wisdom failure. Learn random living relative’s identity/location; staged rolls and information manual.',
  }),
  'kobold-press-deepm:fire-darts': deepMagicProfile('Fire Darts', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '4d6', type: 'fire' }], 2, [1]),
    },
    manual:
      'Requires eligible existing fire; resolve three separately directed darts, not one combined burst. +1d6 per dart per higher slot; target allocation manual.',
  }),
  'kobold-press-deepm:fire-under-the-tongue': deepMagicProfile('Fire Under the Tongue', {
    effect: ruleReminder(
      'Fire Under the Tongue',
      'Store campfire-or-smaller flame for 24 hours; later action spits 5-foot ranged attack with size-dependent 1d6/2d6 fire. No initial attack or fixed damage.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Store campfire-or-smaller flame for 24 hours; later action spits 5-foot ranged attack with size-dependent 1d6/2d6 fire. No initial attack or fixed damage.',
  }),
  'kobold-press-deepm:firewalk': deepMagicProfile('Firewalk', {
    effect: ruleReminder(
      'Firewalk',
      'Grant fire immunity and walking on flames/burning surfaces manually. Higher slots add two targets each.',
      { type: 'rounds', rounds: 100 },
      'ally',
      true,
      'up to 10 minutes',
    ),
    manual:
      'Grant fire immunity and walking on flames/burning surfaces manually. Higher slots add two targets each.',
  }),
  'kobold-press-deepm:fist-of-iron': deepMagicProfile('Fist of Iron', {
    effect: ruleReminder(
      'Fist of Iron',
      'Unarmed attacks become magical and deal 1d6 bludgeoning; later weapon attacks manual, no initial attack.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Unarmed attacks become magical and deal 1d6 bludgeoning; later weapon attacks manual, no initial attack.',
  }),
  'kobold-press-deepm:flame-wave': deepMagicProfile('Flame Wave', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      damage: [{ formula: '6d8', type: 'fire' }],
      scaling: [5, 6, 7, 8, 9].map((level) => ({
        by: 'slot',
        level,
        damage: [{ formula: `${level + 3}d8`, type: 'fire' }],
      })),
    },
    manual:
      '40-foot cone, failure also pushes 20 feet. Printed scaling starts at slot 5 but says above 3rd; use 8d8 at slot 5 then +1d8, authored variants separate.',
  }),
  'kobold-press-deepm:flesh-to-paper': deepMagicProfile('Flesh to Paper', {
    effect: ruleReminder(
      'Flesh to Paper',
      'Willing target/gear flatten: no attacks/spells, incoming disadvantage, wall-dependent Stealth advantage, 1-inch passage. Ending overlap shunts and deals distance-based force; higher-slot targets/manual.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Willing target/gear flatten: no attacks/spells, incoming disadvantage, wall-dependent Stealth advantage, 1-inch passage. Ending overlap shunts and deals distance-based force; higher-slot targets/manual.',
  }),
  'kobold-press-deepm:flickering-fate': deepMagicProfile('Flickering Fate', {
    manual:
      'Nearby others Wisdom save against declaring next action; touched recipient always gains advantage, failures also incoming disadvantage. Mixed recipients, forced declarations, and 1-round benefits manual.',
  }),
  'kobold-press-deepm:fluctuating-alignment': deepMagicProfile('Fluctuating Alignment', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    manual:
      'Failure rolls alignment table initially and each minute; restore on ending. No automatic change in friendliness; table/behavior manual.',
  }),
  'kobold-press-deepm:flurry': deepMagicProfile('Flurry', {
    effect: ruleReminder(
      'Flurry',
      '5-foot snow aura gives Perception/attack disadvantage only when looking into/out of/through it, including caster; visibility-dependent modifiers manual.',
      { type: 'rounds', rounds: 1 },
      'self',
      false,
      '1 round',
    ),
    manual:
      '5-foot snow aura gives Perception/attack disadvantage only when looking into/out of/through it, including caster; visibility-dependent modifiers manual.',
  }),
  'kobold-press-deepm:forest-native': deepMagicProfile('Forest Native', {
    effect: ruleReminder(
      'Forest Native',
      'Willing forest target ignores natural-vegetation terrain and gains environmental-save advantage only while in forest. Movement/conditional benefits manual.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Willing forest target ignores natural-vegetation terrain and gains environmental-save advantage only while in forest. Movement/conditional benefits manual.',
  }),
  'kobold-press-deepm:forest-sanctuary': deepMagicProfile('Forest Sanctuary', {
    manual:
      'Forest-only 200-foot cube protects climate and blocks printed storm/water/weather spells inside. Daily year-long casting makes permanent; environmental adjudication manual.',
  }),
  'kobold-press-deepm:foretell-distraction': deepMagicProfile('Foretell Distraction', {
    manual:
      'Automatic hiding requires cover/concealment within 10 feet and viable endpoint; optional 10-foot move needs sufficient movement and no restraint/grapple. Position/hiding manual.',
  }),
  'kobold-press-deepm:form-of-the-gods': deepMagicProfile('Form of the Gods', {
    effect: ruleReminder(
      'Form of the Gods',
      'Avatar transformation replaces abilities, size and actions; selected damage resistance plus conditional physical resistance. Copy stat block manually; ends on concentration loss/0 HP.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Avatar transformation replaces abilities, size and actions; selected damage resistance plus conditional physical resistance. Copy stat block manually; ends on concentration loss/0 HP.',
  }),
  'kobold-press-deepm:freeze-blood': deepMagicProfile('Freeze Blood', {
    mechanics: { attackRoll: true },
    attackKind: 'melee',
    manual:
      'Requires living circulatory target. Hit halves speed; only later target turn-start 2d6 cold. Bludgeoning critical rolls three dice sets; target end-turn Constitution release saves manual.',
  }),
  'kobold-press-deepm:freeze-potion': deepMagicProfile('Freeze Potion', {
    manual:
      'Freeze container contents without damage; thaw normally, unusable until melted. +5-foot range per higher slot.',
  }),
  'kobold-press-deepm:freezing-fog': deepMagicProfile('Freezing Fog', {
    effect: ruleReminder(
      'Freezing Fog',
      'Heavily obscured sphere; no initial damage. Target turn-end Constitution half-save 2d6 cold with failure exhaustion; wind dispersion and +1d6 higher-slot damage manual.',
      { type: 'rounds', rounds: 50 },
      'self',
      false,
      'up to 5 minutes',
    ),
    manual:
      'Heavily obscured sphere; no initial damage. Target turn-end Constitution half-save 2d6 cold with failure exhaustion; wind dispersion and +1d6 higher-slot damage manual.',
  }),
  'kobold-press-deepm:frenzied-bolt': deepMagicProfile('Frenzied Bolt', {
    manual:
      'Spell attacks deal randomly typed 3d8; odd natural roll chains to new target until even/miss/no target. Additional higher-slot bolts cannot retarget prior victims; type/chain manual.',
  }),
  'kobold-press-deepm:frostbite': deepMagicProfile('Frostbite', {
    mechanics: {
      save: { ability: 'con', onSave: 'negates' },
      ...reviewedDamage([{ formula: '4d8', type: 'cold' }], 5, [0]),
    },
    effect: ruleReminder(
      'Frostbite',
      'Cold-immune excluded. Failure halves speed/disadvantages attacks/checks; later start-turn cold/repeat saves until third success. Higher slots add two targets; counters/damage manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Cold-immune excluded. Failure halves speed/disadvantages attacks/checks; later start-turn cold/repeat saves until third success. Higher slots add two targets; counters/damage manual.',
  }),
  'kobold-press-deepm:frostbitten-fingers': deepMagicProfile('Frostbitten Fingers', {
    mechanics: { attackRoll: true },
    attackKind: 'ranged',
    manual:
      'Hit disables one hand; separate initial/later Dexterity grip saves, two-hand check disadvantage, and 10-minute Constitution save finger-loss/cold damage manual. No initial damage.',
  }),
  'kobold-press-deepm:frozen-razors': deepMagicProfile('Frozen Razors', {
    effect: ruleReminder(
      'Frozen Razors',
      'Lightly obscured difficult terrain; damage only after moving over 5 feet in area: Dexterity half-save 2d6 slashing plus 3d6 cold. Cold damage halves speed; unspecified higher-slot component allocation manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Lightly obscured difficult terrain; damage only after moving over 5 feet in area: Dexterity half-save 2d6 slashing plus 3d6 cold. Cold damage halves speed; unspecified higher-slot component allocation manual.',
  }),
  'kobold-press-deepm:furious-hooves': deepMagicProfile('Furious Hooves', {
    effect: ruleReminder(
      'Furious Hooves',
      'Increase walking speed by smaller of doubled speed or +30 feet; grant two Strength-based size-dependent hoof attacks and shove-hit damage. Later weapon attacks manual.',
      { type: 'rounds', rounds: 10 },
      'ally',
      true,
      'up to 1 minute',
    ),
    manual:
      'Increase walking speed by smaller of doubled speed or +30 feet; grant two Strength-based size-dependent hoof attacks and shove-hit damage. Later weapon attacks manual.',
  }),
  'kobold-press-deepm:fusillade-of-ice': deepMagicProfile('Fusillade of Ice', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage(
        [
          { formula: '4d6', type: 'cold' },
          { formula: '3d6', type: 'piercing' },
        ],
        4,
        [0, 0],
      ),
    },
    manual:
      '30-foot cone; higher slots choose cold/piercing allocation per extra die, and slot 6+ cone doubles. Initial damage integrated; scaling choices manual.',
  }),
  'kobold-press-deepm:gear-barrage': deepMagicProfile('Gear Barrage', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...reviewedDamage([{ formula: '3d8', type: 'slashing' }], 2, [0]),
    },
    manual:
      '60-foot cone; constructs have save disadvantage only, apply eligibility modifier manually.',
  }),
  'kobold-press-deepm:ghoul-kings-cloak': deepMagicProfile('Ghoul King’s Cloak', {
    effect: ruleReminder(
      'Ghoul King’s Cloak',
      'Armor +2 capped at 20, extra weapon attack, necrotic/radiant immunity, minimum 1 HP. Slot 9 lasts 10 minutes without concentration; defenses/slot exception manual.',
      { type: 'rounds', rounds: 10 },
      'ally',
      true,
      'up to 1 minute',
    ),
    manual:
      'Armor +2 capped at 20, extra weapon attack, necrotic/radiant immunity, minimum 1 HP. Slot 9 lasts 10 minutes without concentration; defenses/slot exception manual.',
  }),
  'kobold-press-deepm:gird-the-spirit': deepMagicProfile('Gird the Spirit', {
    effect: ruleReminder(
      'Gird the Spirit',
      'Immune only to undead ability-score/maximum-HP reductions, not their damage. Apply conditional protection manually.',
      { type: 'rounds', rounds: 10 },
      'ally',
      true,
      '1 minute',
    ),
    manual:
      'Immune only to undead ability-score/maximum-HP reductions, not their damage. Apply conditional protection manually.',
  }),
}
