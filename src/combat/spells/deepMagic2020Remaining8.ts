// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { deepMagicProfile } from './deepMagic2020Profile.ts'
import { reviewedDamage, ruleReminder } from './reviewedProfile.ts'

export const DEEP_MAGIC_2020_REMAINING_8: Record<string, ReviewedSpellCasting> = {
  'kobold-press-deepm:glacial-cascade': deepMagicProfile('Glacial Cascade', {
    mechanics: {
      save: { ability: 'con', onSave: 'half' },
      ...reviewedDamage([{ formula: '10d8', type: 'cold' }], 8, [0]),
    },
    manual:
      '30-foot sphere excludes caster; creatures killed become ice with no original body. Death transformation manual.',
  }),
  'kobold-press-deepm:glacial-fog': deepMagicProfile('Glacial Fog', {
    effect: ruleReminder(
      'Glacial Fog',
      'No initial damage; turn-start Constitution half-save 12d6 cold, failure exhaustion/Perception disadvantage. Frozen items need heat; +1d6 higher-slot damage and later effects manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'No initial damage; turn-start Constitution half-save 12d6 cold, failure exhaustion/Perception disadvantage. Frozen items need heat; +1d6 higher-slot damage and later effects manual.',
  }),
  'kobold-press-deepm:gliding-step': deepMagicProfile('Gliding Step', {
    effect: ruleReminder(
      'Gliding Step',
      'Within carrying capacity, ignore snow movement penalties and traverse even thin ice; still leave tracks. +10 minutes per higher slot; movement/expiry manual.',
      { type: 'rounds', rounds: 100 },
      'self',
      false,
      '10 minutes',
    ),
    manual:
      'Within carrying capacity, ignore snow movement penalties and traverse even thin ice; still leave tracks. +10 minutes per higher slot; movement/expiry manual.',
  }),
  'kobold-press-deepm:glimpse-of-the-void': deepMagicProfile('Glimpse of the Void', {
    mechanics: { save: { ability: 'int', onSave: 'negates' } },
    effect: ruleReminder(
      'Glimpse of the Void',
      'Failure permits only incoherent shrieking actions and GM-controlled erratic movement; no invented named condition. Apply behavior manually.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure permits only incoherent shrieking actions and GM-controlled erratic movement; no invented named condition. Apply behavior manually.',
  }),
  'kobold-press-deepm:gloomwrought-barrier': deepMagicProfile('Gloomwrought Barrier', {
    effect: ruleReminder(
      'Gloomwrought Barrier',
      'Wall/ring side-dependent obscuration; crossing Wisdom failure stops and frightens until target next turn start. Success grants barrier immunity; no initial save.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Wall/ring side-dependent obscuration; crossing Wisdom failure stops and frightens until target next turn start. Success grants barrier immunity; no initial save.',
  }),
  'kobold-press-deepm:gluey-globule': deepMagicProfile('Gluey Globule', {
    manual:
      'Creature mode ranged spell hit restrains; escape Strength save with hit-margin/critical disadvantage tears for 2d6 slashing. Acid/solvent alternatives and object Sovereign Glue hour mode manual.',
  }),
  'kobold-press-deepm:glyph-of-shifting': deepMagicProfile('Glyph of Shifting', {
    manual:
      'No initial roll; unaware later touch Wisdom failure teleports to selected destination, or takes 4d4 force/prone without destination. Single trigger and higher-slot range/duration manual.',
  }),
  'kobold-press-deepm:goats-hoof-charm': deepMagicProfile("Goat's Hoof Charm", {
    effect: ruleReminder(
      "Goat's Hoof Charm",
      'Ignore difficult ascending slopes and +2 Dexterity checks/saves only against falls/ledge movement. Higher slots choose added duration or targets; conditional modifiers manual.',
      { type: 'rounds', rounds: 10 },
      'ally',
      true,
      '1 minute',
    ),
    manual:
      'Ignore difficult ascending slopes and +2 Dexterity checks/saves only against falls/ledge movement. Higher slots choose added duration or targets; conditional modifiers manual.',
  }),
  'kobold-press-deepm:going-in-circles': deepMagicProfile('Going in Circles', {
    manual:
      'Mile-cube navigation illusion: conditional Survival disadvantage, two successes reveal, reentry resets. Password/truesight/Find the Path exceptions and year-long permanence manual.',
  }),
  'kobold-press-deepm:gordolays-pleasant-aroma': deepMagicProfile('Gordolay’s Pleasant Aroma', {
    effect: ruleReminder(
      'Gordolay’s Pleasant Aroma',
      'Only first attack each round triggers Wisdom save; failure attack disadvantage, success casting-specific immunity. Track area and later saves manually.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Only first attack each round triggers Wisdom save; failure attack disadvantage, success casting-specific immunity. Track area and later saves manually.',
  }),
  'kobold-press-deepm:grasp-of-the-tupilak': deepMagicProfile('Grasp of the Tupilak', {
    manual:
      'Later melee hit steals rolled eligible prepared spell slots and deals 2d4 necrotic only if transfer possible. Build-dependent slot selection, caster caps, and recovery manual.',
  }),
  'kobold-press-deepm:greater-maze': deepMagicProfile('Greater Maze', {
    effect: ruleReminder(
      'Greater Maze',
      'Banish as Maze; later turn-start Dexterity save for 4d6 psychic/half. Action DC 20 Intelligence escape needs two successes; banishment/count/damage manual.',
      { type: 'rounds', rounds: 100 },
      'enemy',
      true,
      'up to 10 minutes',
    ),
    manual:
      'Banish as Maze; later turn-start Dexterity save for 4d6 psychic/half. Action DC 20 Intelligence escape needs two successes; banishment/count/damage manual.',
  }),
  'kobold-press-deepm:greater-seal-of-sanctuary': deepMagicProfile('Greater Seal of Sanctuary', {
    manual:
      'Create 100-foot sanctuary seal; later type-specific entry radiant saves/ban and off-plane fiend destruction. Interior ongoing damage/defenses, seal statistics, and removal manual.',
  }),
  'kobold-press-deepm:green-decay': deepMagicProfile('Green Decay', {
    mechanics: { attackRoll: true },
    attackKind: 'melee',
    manual:
      'Hit causes disease; nearby viewers require separate Constitution poison saves. End-turn saves track three successes/failures, later necrotic/max-HP loss and vulnerabilities; caster sight-loss concentration ending manual.',
  }),
  'kobold-press-deepm:grudge-match': deepMagicProfile('Grudge Match', {
    effect: ruleReminder(
      'Grudge Match',
      'Requires equal allies/enemies; +2 rolls involving other targets, −2 against nontargets. Relational modifiers and higher-slot rounds manual.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Requires equal allies/enemies; +2 rolls involving other targets, −2 against nontargets. Relational modifiers and higher-slot rounds manual.',
  }),
  'kobold-press-deepm:guiding-star': deepMagicProfile('Guiding Star', {
    effect: ruleReminder(
      'Guiding Star',
      'Using visible sun/stars determines directions and destination distance without safe-route/obstacle knowledge; navigation manual for 8 hours.',
      { type: 'manual' },
      'self',
      false,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Using visible sun/stars determines directions and destination distance without safe-route/obstacle knowledge; navigation manual for 8 hours.',
  }),
  'kobold-press-deepm:hamstring': deepMagicProfile('Hamstring', {
    mechanics: { attackRoll: true, ...reviewedDamage([{ formula: '1d4', type: 'force' }], 0, [1]) },
    attackKind: 'ranged',
    manual:
      'Hit prevents reactions until target next turn end; rider manual. Cantrip scales at 5/11/17.',
  }),
  'kobold-press-deepm:hard-heart': deepMagicProfile('Hard Heart', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Hard Heart',
      'Willing failure allowed only if not already charmed. Failure removes charm, grants charm immunity, and incoming Charisma-check disadvantage. Higher-slot durations/manual protections.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Willing failure allowed only if not already charmed. Failure removes charm, grants charm immunity, and incoming Charisma-check disadvantage. Higher-slot durations/manual protections.',
  }),
  'kobold-press-deepm:harry': deepMagicProfile('Harry', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Harry',
      'Failure gives caster-relative Stealth disadvantage, sight-dependent fear, mile-limited tracking/rest restriction. Repeat saves at printed intervals; initial success prevents recast 24 hours. Higher-slot hours manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure gives caster-relative Stealth disadvantage, sight-dependent fear, mile-limited tracking/rest restriction. Repeat saves at printed intervals; initial success prevents recast 24 hours. Higher-slot hours manual.',
  }),
  'kobold-press-deepm:harrying-hounds': deepMagicProfile('Harrying Hounds', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Harrying Hounds',
      'Failure compels safe travel opposite chosen direction; fear/cowering outside combat, suspended in combat. Repeat hourly/minute saves, forced march, and higher-slot duration manual.',
      { type: 'manual' },
      'enemy',
      true,
      'Track printed consequence and endpoint manually',
    ),
    manual:
      'Failure compels safe travel opposite chosen direction; fear/cowering outside combat, suspended in combat. Repeat hourly/minute saves, forced march, and higher-slot duration manual.',
  }),
  'kobold-press-deepm:harsh-light-of-summers-glare': deepMagicProfile(
    'Harsh Light of Summer’s Glare',
    {
      mechanics: { save: { ability: 'con', onSave: 'negates' } },
      manual:
        'Only creatures seeing caster: failure blinds, additionally stuns those with darkvision. Neither blindfold nor averting avoids effect; 1-round conditions manual.',
    },
  ),
  'kobold-press-deepm:heart-to-heart': deepMagicProfile('Heart to Heart', {
    effect: ruleReminder(
      'Heart to Heart',
      'Link caster/target: 0 HP stable/unconscious only while other has HP; both 0 resume death saves. Healing may split only within 60 feet; state/healing manual.',
      { type: 'manual' },
      'ally',
      true,
      'Track printed duration and any early endpoint manually',
    ),
    manual:
      'Link caster/target: 0 HP stable/unconscious only while other has HP; both 0 resume death saves. Healing may split only within 60 feet; state/healing manual.',
  }),
  'kobold-press-deepm:heart-seeking-arrow': deepMagicProfile('Heart-Seeking Arrow', {
    effect: ruleReminder(
      'Heart-Seeking Arrow',
      'Next ranged weapon attack adds weapon-typed 6d6 on hit, half damage on miss; undead/constructs excluded. Death-save/resurrection restrictions and +1d6 higher-slot damage manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Next ranged weapon attack adds weapon-typed 6d6 on hit, half damage on miss; undead/constructs excluded. Death-save/resurrection restrictions and +1d6 higher-slot damage manual.',
  }),
  'kobold-press-deepm:heartache': deepMagicProfile('Heartache', {
    mechanics: {
      save: { ability: 'cha', onSave: 'half' },
      ...reviewedDamage([{ formula: '5d6', type: 'psychic' }], 2, [0]),
    },
    manual: 'Initial psychic save; higher slots add targets, not damage dice.',
  }),
  'kobold-press-deepm:heartstop': deepMagicProfile('Heartstop', {
    effect: ruleReminder(
      'Heartstop',
      'Willing target appears dead with slowed heartbeat/breathing, returns unharmed on ending. No imposed unconsciousness or damage; appearance manual.',
      { type: 'rounds', rounds: 100 },
      'ally',
      true,
      'up to 10 minutes',
    ),
    manual:
      'Willing target appears dead with slowed heartbeat/breathing, returns unharmed on ending. No imposed unconsciousness or damage; appearance manual.',
  }),
  'kobold-press-deepm:heartstrike': deepMagicProfile('Heartstrike', {
    effect: ruleReminder(
      'Heartstrike',
      'Ranged weapon advantage and ignore half/three-quarters cover/light obscuration until caster next turn start despite Instantaneous header; attacks/cover manual.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'self',
      false,
      'Until caster next turn start',
    ),
    manual:
      'Ranged weapon advantage and ignore half/three-quarters cover/light obscuration until caster next turn start despite Instantaneous header; attacks/cover manual.',
  }),
  'kobold-press-deepm:heavenly-crown': deepMagicProfile('Heavenly Crown', {
    effect: ruleReminder(
      'Heavenly Crown',
      'Light and optional initial/later bonus-action willing listener reaction weapon attack plus half-speed movement; no automatic attack or reaction expenditure.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      'up to 1 minute',
    ),
    manual:
      'Light and optional initial/later bonus-action willing listener reaction weapon attack plus half-speed movement; no automatic attack or reaction expenditure.',
  }),
  'kobold-press-deepm:hedrens-birds-of-clay': deepMagicProfile('Hedren’s Birds of Clay', {
    effect: ruleReminder(
      'Hedren’s Birds of Clay',
      'Roll 1d4 plus casting modifier pigeons; reaction intercepts ranged attacks via printed proficiency/ability checks, spending pigeon regardless. Higher-slot bonuses and early ending manual.',
      { type: 'rounds', rounds: 50 },
      'self',
      false,
      'up to 5 minutes',
    ),
    manual:
      'Roll 1d4 plus casting modifier pigeons; reaction intercepts ranged attacks via printed proficiency/ability checks, spending pigeon regardless. Higher-slot bonuses and early ending manual.',
  }),
  'kobold-press-deepm:hematomancy': deepMagicProfile('Hematomancy', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    manual:
      'Requires blood; dead source reveals automatically, aware target may fail willingly. Failure reveals printed facts or 1-hour location-at-cast path; success blocks recast 24 hours. Information manual.',
  }),
  'kobold-press-deepm:heros-steel': deepMagicProfile("Hero's Steel", {
    effect: ruleReminder(
      "Hero's Steel",
      'Enchant metal melee weapon; brandish Intimidation advantage. Later target-HP-dependent Charisma saves stun/frighten, end-turn repeat saves and 24-hour weapon immunity manual.',
      { type: 'rounds', rounds: 10 },
      'self',
      false,
      '1 minute',
    ),
    manual:
      'Enchant metal melee weapon; brandish Intimidation advantage. Later target-HP-dependent Charisma saves stun/frighten, end-turn repeat saves and 24-hour weapon immunity manual.',
  }),
}
