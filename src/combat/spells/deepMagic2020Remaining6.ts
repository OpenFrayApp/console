// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile, deepMagicTurnConditions } from './deepMagic2020Profile.ts'
import { ruleReminder, reviewedDamage } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_6: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:doom-of-the-earthen-maw': deepMagicProfile('Doom of the Earthen Maw', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    effect: ruleReminder(
      'Doom of the Earthen Maw',
      'Eligible ground becomes difficult terrain; only initial failures restrain. Action Strength saves escape; later size-dependent sinking, suffocation, and burial after ending manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Eligible ground becomes difficult terrain; only initial failures restrain. Action Strength saves escape; later size-dependent sinking, suffocation, and burial after ending manual.',
  }),
  'kobold-press-deepm:doom-of-the-slippery-rogue': deepMagicProfile('Doom of the Slippery Rogue', {
    manual:
      'Wall mode uses DC 20 Athletics against fall; floor mode Dexterity save against prone. Later half-speed movement and Strength/Dexterity saves depend on mode, manual.',
  }),
  'kobold-press-deepm:douse-light': deepMagicProfile('Douse Light', {
    manual:
      'Extinguish one small mundane light or Light/Dancing Lights cantrip manually; no creature attack or save.',
  }),
  'kobold-press-deepm:draconic-smite': deepMagicProfile('Draconic Smite', {
    effect: ruleReminder(
      'Draconic Smite',
      'Next melee weapon hit adds 1d6 cold and up to four nearby secondary Constitution-negated 1d6 cold targets. Both dice +1d6 per higher slot; later hit/saves manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Next melee weapon hit adds 1d6 cold and up to four nearby secondary Constitution-negated 1d6 cold targets. Both dice +1d6 per higher slot; later hit/saves manual.',
  }),
  'kobold-press-deepm:dragon-breath': deepMagicProfile('Dragon Breath', {
    effect: ruleReminder(
      'Dragon Breath',
      'Choose dragon-type cone/line and 6d6 damage; printed card gives no save, do not invent one. Optional initial breath and later d6 recharge bonus-action breaths, +2d6 higher-slot damage manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Choose dragon-type cone/line and 6d6 damage; printed card gives no save, do not invent one. Optional initial breath and later d6 recharge bonus-action breaths, +2d6 higher-slot damage manual.',
  }),
  'kobold-press-deepm:dragon-roar': deepMagicProfile('Dragon Roar', {
    mechanics: {
      save: { ability: 'cha', onSave: 'negates' },
      ...reviewedDamage([{ formula: '1d4', type: 'psychic' }], 0, [1]),
    },
    effect: deepMagicTurnConditions(['Frightened'], 'caster', 'startOfTurn'),
    manual:
      'Target eligible only once per 24 hours. Failure frightens until caster next turn start; rider/immunity manual. Cantrip damage scales at 5/11/17.',
  }),
  'kobold-press-deepm:drown': deepMagicProfile('Drown', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    manual:
      'Exclude Huge+, water-breathers/nonbreathers. Failure starts suffocation/speech restrictions, not immediate damage; breath/Constitution countdown and non-dying end-turn repeat saves manual. Higher slots add targets.',
  }),
  'kobold-press-deepm:dryads-kiss': deepMagicProfile('Dryad’s Kiss', {
    manual:
      'Initial Wisdom negates 3d8 necrotic but buds persist on success. Later other-source damage triggers extra 1d8 and blossom count/removal rules; slots 5/7/9 add targets. Mixed outcomes manual.',
  }),
  'kobold-press-deepm:earthskimmer': deepMagicProfile('Earthskimmer', {
    effect: ruleReminder(
      'Earthskimmer',
      '60-foot terrain-ignoring slab movement. Dash only through eligible-size creatures until cast turn end triggers Strength half-save 4d6/prone. Movement and collision manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      '60-foot terrain-ignoring slab movement. Dash only through eligible-size creatures until cast turn end triggers Strength half-save 4d6/prone. Movement and collision manual.',
  }),
  'kobold-press-deepm:earworm-melody': deepMagicProfile('Earworm Melody', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    manual:
      'Failure only seeds melody. Concentration maintenance uses disadvantaged Constitution check against spell DC; later turn-start psychic and end-turn repeat saves/checks, +1d4 higher-slot damage manual.',
  }),
  'kobold-press-deepm:echoes-of-steel': deepMagicProfile('Echoes of Steel', {
    manual:
      'Requires just-hit melee weapon attack; designated creatures Constitution half-save against thunder equal to that attack’s damage. Variable damage and timing manual.',
  }),
  'kobold-press-deepm:ectoplasm': deepMagicProfile('Ectoplasm', {
    effect: ruleReminder(
      'Ectoplasm',
      'No initial damage; manifestation turn-end proximity or bonus-action crossing triggers Wisdom half-save 2d6 psychic, crossing failure Dexterity-check disadvantage. Movement/light/residue and higher-slot damage manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'No initial damage; manifestation turn-end proximity or bonus-action crossing triggers Wisdom half-save 2d6 psychic, crossing failure Dexterity-check disadvantage. Movement/light/residue and higher-slot damage manual.',
  }),
  'kobold-press-deepm:eidetic-memory': deepMagicProfile('Eidetic Memory', {
    effect: ruleReminder(
      'Eidetic Memory',
      'Recall prior read/heard information and +10 Intelligence checks for up to hour; apply bonus manually.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Recall prior read/heard information and +10 Intelligence checks for up to hour; apply bonus manually.',
  }),
  'kobold-press-deepm:eldritch-communion': deepMagicProfile('Eldritch Communion', {
    manual:
      'One limited answer may be misleading; detect nearby aberrations with awareness chance. Repeated casting risks no answer/madness; GM resolves secret chances manually.',
  }),
  'kobold-press-deepm:elemental-horns': deepMagicProfile('Elemental Horns', {
    effect: ruleReminder(
      'Elemental Horns',
      'Requires horns; chosen acid/cold/fire/lightning/radiant adds 3d6 to later gore attacks, +2d6 per higher slot. No initial attack or fixed damage type.',
      { type: 'rounds', rounds: 10 },
      'ally',
      true,
      'up to 1 minute',
    ),
    manual:
      'Requires horns; chosen acid/cold/fire/lightning/radiant adds 3d6 to later gore attacks, +2d6 per higher slot. No initial attack or fixed damage type.',
  }),
  'kobold-press-deepm:elemental-twist': deepMagicProfile('Elemental Twist', {
    effect: ruleReminder(
      'Elemental Twist',
      'Later eligible elemental spells randomly change damage type by d6 and gain 1d6 damage; preserve other properties, select/resolve damage manually.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Later eligible elemental spells randomly change damage type by d6 and gain 1d6 damage; preserve other properties, select/resolve damage manually.',
  }),
  'kobold-press-deepm:emanation-of-yoth': deepMagicProfile('Emanation of Yoth', {
    effect: ruleReminder(
      'Emanation of Yoth',
      'Summon commanded ghost with independent initiative; caster immune to Horrifying Visage and may accept/end Possession. Higher slots add ghosts; no initial attack.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Summon commanded ghost with independent initiative; caster immune to Horrifying Visage and may accept/end Possession. Higher slots add ghosts; no initial attack.',
  }),
  'kobold-press-deepm:enchant-ring': deepMagicProfile('Enchant Ring', {
    manual:
      'Uncarried ring charms next willing unthreatened wearer for 1 week or friendly harm. No initial creature save; ring and later charm/removal manual.',
  }),
  'kobold-press-deepm:encrypt-decrypt': deepMagicProfile('Encrypt / Decrypt', {
    manual: 'Encode/decode touched written page until recast or Dispel Magic; no combat roll.',
  }),
  'kobold-press-deepm:endow-attribute': deepMagicProfile('Endow Attribute', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    manual:
      'Failure stores one-fifth selected ability score in ring; later action transfers points and ends concentration requirement. Restoration/death/dispelling/higher-slot hours manual.',
  }),
  'kobold-press-deepm:energy-absorption': deepMagicProfile('Energy Absorption', {
    manual:
      'Willing touch grants six printed energy resistances. Unwilling mode requires melee spell hit and later caster-ability save on eligible spells, suppressing or halving damage. Modes/defenses manual.',
  }),
  'kobold-press-deepm:energy-foreknowledge': deepMagicProfile('Energy Foreknowledge', {
    manual:
      'Card references missing energy list; do not invent covered types. Resistance against triggering spell lasts until caster next turn end; higher slots include nearby allies, manually confirm printed ambiguity.',
  }),
  'kobold-press-deepm:enhance-greed': deepMagicProfile('Enhance Greed', {
    effect: ruleReminder(
      'Enhance Greed',
      'Detect valuables direction within 60 feet/exact position within 10; printed barriers block. Higher slots extend time/range; detection manual.',
      { type: 'rounds', rounds: 100 },
      'self',
      false,
      'up to 10 minutes',
    ),
    manual:
      'Detect valuables direction within 60 feet/exact position within 10; printed barriers block. Higher slots extend time/range; detection manual.',
  }),
  'kobold-press-deepm:entomb': deepMagicProfile('Entomb', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    manual:
      'Initial failure trapped in stone cube. Track AC 18/50 HP tomb defenses, air shared by occupants with Large counting four, suffocation, and destruction manually.',
  }),
  'kobold-press-deepm:entropic-damage-field': deepMagicProfile('Entropic Damage Field', {
    effect: ruleReminder(
      'Entropic Damage Field',
      'On caster damage only, Charisma saves split damage equally among failures, remainder caster. New entrants eligible; later successful saves end individual effect. No initial roll.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'On caster damage only, Charisma saves split damage equally among failures, remainder caster. New entrants eligible; later successful saves end individual effect. No initial roll.',
  }),
  'kobold-press-deepm:essence-instability': deepMagicProfile('Essence Instability', {
    effect: ruleReminder(
      'Essence Instability',
      'Moving aura causes later 2d6 poison with Constitution saves; target success ends own damage but aura persists. Barriers/protection and higher-slot time/damage manual; no initial damage assumed.',
      { type: 'rounds', rounds: 10 },
      'enemy',
      true,
      '1 minute',
    ),
    manual:
      'Moving aura causes later 2d6 poison with Constitution saves; target success ends own damage but aura persists. Barriers/protection and higher-slot time/damage manual; no initial damage assumed.',
  }),
  'kobold-press-deepm:evercold': deepMagicProfile('Evercold', {
    mechanics: {
      save: { ability: 'wis', onSave: 'negates' },
      ...reviewedDamage([{ formula: '1d6', type: 'cold' }], 4, [0]),
    },
    effect: ruleReminder(
      'Evercold',
      'Failure curses with hourly DC 10 Constitution exhaustion saves, clothing advantage and cold-magic save disadvantage. Caster/Dispel Magic/Remove Curse end curse manually.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure curses with hourly DC 10 Constitution exhaustion saves, clothing advantage and cold-magic save disadvantage. Caster/Dispel Magic/Remove Curse end curse manually.',
  }),
  'kobold-press-deepm:exsanguinate': deepMagicProfile('Exsanguinate', {
    manual:
      'Constitution success takes 2d6 bludgeoning; failure suffers recurring 4d6, incapacity, speech loss, and matching maximum-HP reduction. Repeat saves/end/rest recovery and higher-slot targets manual.',
  }),
  'kobold-press-deepm:exsanguinating-cloud': deepMagicProfile('Exsanguinating Cloud', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '6d6', type: 'necrotic' }], 5, [0]),
    },
    persistsAfterSave: true,
    manual:
      'Exclude undead/constructs. Initial failures also gain exhaustion; cloud heavily obscured, later caster-start damage/exhaustion and strong-wind dispersion manual.',
  }),
  'kobold-press-deepm:extract-knowledge': deepMagicProfile('Extract Knowledge', {
    manual:
      'Touch recently deceased corpse and frame one specific question for compelled brief known answer; no combat roll.',
  }),
}
