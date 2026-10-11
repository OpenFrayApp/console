// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { kibblesProfile, kibblesDamage } from './kibblesProfile.ts'
import { ruleReminder } from './reviewedProfile.ts'
import { condition } from '../effects.ts'

export const KIBBLES_CASTING_1: Record<string, ReviewedSpellCasting> = {
  'kibblestasty-casting-compendium-v2.3:acid-bubble': kibblesProfile('Acid Bubble', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '3d4', type: 'acid' }], 1, [2]),
    },
    manual:
      'Select creatures in 5-foot burst; resolve objects manually. Initial acid +2d4 per slot above 1st.',
  }),
  'kibblestasty-casting-compendium-v2.3:acid-rain': kibblesProfile('Acid Rain', {
    effect: ruleReminder(
      'Acid Rain',
      'No creation damage. First entry on a turn or turn start: Dexterity save for 6d4 acid, half on success. Failures are covered in acid: 3d4 at turn end until an action clears it. Track cylinder and later damage manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'No creation damage. First entry on a turn or turn start: Dexterity save for 6d4 acid, half on success. Failures are covered in acid: 3d4 at turn end until an action clears it. Track cylinder and later damage manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:acidic-pit': kibblesProfile('Acidic Pit', {
    manual:
      'Manual initial Dexterity save for 6d4+6 acid; success requires a reaction and reaching safety or automatically becomes failure. Track 5-foot fall, pit, 2d4 acid at turn end, and acid becoming sludge after 1 minute. No unconditional success resolver.',
  }),
  'kibblestasty-casting-compendium-v2.3:aero-barrage': kibblesProfile('Aero Barrage', {
    attackKind: 'ranged',
    mechanics: {
      attackRoll: true,
      ...kibblesDamage([{ formula: '2d8', type: 'slashing' }], 4, [0]),
    },
    manual:
      'Resolve four ranged spell attacks separately, 2d8 slashing per hit and 10-foot push. One additional lance per slot above 4th; select targets and apply pushes manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:aether-lance': kibblesProfile('Aether Lance', {
    manual:
      'Automatic 8d4 force to each creature in 30-by-5-foot line; no save or attack. Apply damage manually, +1d4 per slot above 3rd.',
  }),
  'kibblestasty-casting-compendium-v2.3:aether-storm': kibblesProfile('Aether Storm', {
    effect: ruleReminder(
      'Aether Storm',
      'Automatic 8d4 force on creation, no save/attack. Track cylinder, 2d4 per 5 feet traveled, 8d4 turn-end damage, bonus-action movement and three 3d4+3 bolts manually. Higher slots increase specified damage. No invented save.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Automatic 8d4 force on creation, no save/attack. Track cylinder, 2d4 per 5 feet traveled, 8d4 turn-end damage, bonus-action movement and three 3d4+3 bolts manually. Higher slots increase specified damage. No invented save.',
  }),
  'kibblestasty-casting-compendium-v2.3:alacrity': kibblesProfile('Alacrity', {
    effect: ruleReminder(
      'Alacrity',
      'Until caster next turn start: double speed, +2 armor class, Dexterity save advantage, restricted extra action. No benefit while under Haste; apply only after checking this exclusion.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'self',
      false,
    ),
    manual:
      'Until caster next turn start: double speed, +2 armor class, Dexterity save advantage, restricted extra action. No benefit while under Haste; apply only after checking this exclusion.',
  }),
  'kibblestasty-casting-compendium-v2.3:aldricor-s-elemental-rebuke': kibblesProfile(
    "Aldricor's Elemental Rebuke",
    {
      manual:
        'Halve triggering elemental damage manually. Optional retaliatory Dexterity save within 60 feet: 1d8 of triggering damage type, half on success, +1d8 per slot. Damage type must be selected manually; no fixed type.',
    },
  ),
  'kibblestasty-casting-compendium-v2.3:angelic-slash': kibblesProfile('Angelic Slash', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '5d8', type: 'radiant' }], 3, [1]),
    },
    manual:
      'Select creatures in 30-by-5-foot line. Add 1d8 manually for undead or fiends. Base radiant +1d8 per slot above 3rd.',
  }),
  'kibblestasty-casting-compendium-v2.3:animate-shadow': kibblesProfile('Animate Shadow', {
    effect: ruleReminder(
      'Animate Shadow',
      'Requires shadow and eligible challenge rating; creatures without challenge rating are immune. Copy statistics manually with half HP and no spells/legendary abilities. Track lighting defenses, turn after original, reaction control, shadow loss and higher-slot CR.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Requires shadow and eligible challenge rating; creatures without challenge rating are immune. Copy statistics manually with half HP and no spells/legendary abilities. Track lighting defenses, turn after original, reaction control, shadow loss and higher-slot CR.',
  }),
  'kibblestasty-casting-compendium-v2.3:anvil-drop': kibblesProfile('Anvil Drop', {
    manual:
      'No initial roll. Impact at initiative 0 next round: Dexterity escape requires movement and safe space, otherwise failure. Apply 10d10+10 bludgeoning and nearby 4d4 thunder then, reducing impact for intercepted damage. Track surviving anvil and 9th-slot range manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:arcane-ablation': kibblesProfile('Arcane Ablation', {
    effect: ruleReminder(
      'Arcane Ablation',
      'Touch worn armor/clothing: grant 4 temporary HP manually, +1 per higher slot. On exhaustion, renew with 1 fewer at next turn start until zero; remove remaining temporary HP when spell ends.',
      { type: 'manual' },
      'ally',
      false,
    ),
    manual:
      'Touch worn armor/clothing: grant 4 temporary HP manually, +1 per higher slot. On exhaustion, renew with 1 fewer at next turn start until zero; remove remaining temporary HP when spell ends.',
  }),
  'kibblestasty-casting-compendium-v2.3:arcane-conduit': kibblesProfile('Arcane Conduit', {
    effect: ruleReminder(
      'Arcane Conduit',
      'Resistance only to magical-source damage except force. No initial damage; caster turn starts damage caster and creatures within 5 feet for 1d6 force, rising each turn to 4d6. Apply defenses and later damage manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Resistance only to magical-source damage except force. No initial damage; caster turn starts damage caster and creatures within 5 feet for 1d6 force, rising each turn to 4d6. Apply defenses and later damage manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:arcane-weapon': kibblesProfile('Arcane Weapon', {
    manual:
      'Touch weapon: magical, all weapon damage force, ammunition not consumed and no reload. No spell attack on casting. Higher slots change duration to 8 or 24 hours; track selected weapon manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:arcanist-s-sword': kibblesProfile('Arcanist’s Sword', {
    manual:
      'Choose Attack, Guard, or Whirl on creation. Attack uses melee spell attack for 3d10 plus casting modifier force; Guard offers half cover and a later attack; Whirl uses later Dexterity save to negate 3d10. Move sword 20 feet on commands. No unconditional initial attack; not concentration.',
  }),
  'kibblestasty-casting-compendium-v2.3:arctic-aura': kibblesProfile('Arctic Aura', {
    effect: ruleReminder(
      'Arctic Aura',
      'No initial save. Creatures starting within 20 feet make Constitution save for 2d8 cold; failure speed zero, success half damage and speed halved. Bonus action excludes up to casting modifier creatures through next turn end. Track later saves/speed manually; +1d8 per higher slot.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'No initial save. Creatures starting within 20 feet make Constitution save for 2d8 cold; failure speed zero, success half damage and speed halved. Bonus action excludes up to casting modifier creatures through next turn end. Track later saves/speed manually; +1d8 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:arctic-breath': kibblesProfile('Arctic Breath', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '2d8', type: 'cold' }], 1, [1]),
    },
    effect: ruleReminder(
      'Arctic Breath',
      'Failure: speed reduced by 10 feet until affected creature next turn end; track target-owned expiry manually.',
      { type: 'manual' },
      'enemy',
      true,
      'Until the end of the affected creature’s next turn; manual timer',
    ),
    manual:
      'Select creatures in 30-by-5-foot line. Failed save reduces speed by 10 feet until affected creature next turn end; apply speed manually. Initial cold +1d8 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:avalanche': kibblesProfile('Avalanche', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '6d10', type: 'bludgeoning' }], 6, [1]),
    },
    effect: {
      summary: 'Prone',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        {
          ...condition('Prone', { source, duration: { type: 'manual' } }),
          concentration: false,
          durationNote: 'Until it stands up',
        },
      ],
    },
    manual:
      'Select 60-by-15-foot line, doubled on steep slope. Failed saves knock prone; failures by 5 stun until target next turn end, by 10 move to line end. Apply extra margins and difficult terrain manually. +1d10 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:awaken-rope': kibblesProfile('Awaken Rope', {
    manual:
      'Choose Bind, Fasten, or Grab manually. Bind uses Dexterity save against restrained until action Strength check or rope destroyed. Grab held objects uses Strength save; Fasten has none. Higher slots change chain/rope defenses and escape DC. No unconditional initial roll.',
  }),
  'kibblestasty-casting-compendium-v2.3:baba-s-walking-hut': kibblesProfile('Baba’s Walking Hut', {
    manual:
      'Animate eligible building manually with printed HP, armor class, speed, and movement commands. Stepping on Large or smaller creatures later uses Dexterity save against 2d10 bludgeoning and prone. Track permanent-casting requirement; no initial attack.',
  }),
  'kibblestasty-casting-compendium-v2.3:bad-blood': kibblesProfile('Bad Blood', {
    mechanics: {
      save: { ability: 'con', onSave: 'negates' },
      ...kibblesDamage([{ formula: '1d12', type: 'poison' }], 1, [0]),
    },
    effect: {
      summary: 'Poisoned',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        condition('Poisoned', { source: source, duration: { type: 'manual' } }),
      ],
    },
    manual:
      'Requires blood. Initial Constitution failure deals 1d12 poison and poisons; end-turn Constitution success ends spell, failure deals separate 1d4. Additional targets only per slot above 2nd as printed. Later damage and target count manual.',
  }),
  'kibblestasty-casting-compendium-v2.3:beam-of-annihilation': kibblesProfile(
    'Beam of Annihilation',
    {
      effect: ruleReminder(
        'Beam of Annihilation',
        'No initial damage. Choose cold/fire/force/lightning beam; turn-start Dexterity saves for 8d8, half on success. Caster speed zero; action maintains or rotates beam with separate 4d8 save-negated crossing damage. Track maximum 3 rounds and early ending manually.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial damage. Choose cold/fire/force/lightning beam; turn-start Dexterity saves for 8d8, half on success. Caster speed zero; action maintains or rotates beam with separate 4d8 save-negated crossing damage. Track maximum 3 rounds and early ending manually.',
    },
  ),
  'kibblestasty-casting-compendium-v2.3:become-fire': kibblesProfile('Become Fire', {
    effect: ruleReminder(
      'Become Fire',
      'Until caster next turn start: conditional resistances, pass through creatures/ignore terrain, first entry per turn and melee-hit retaliation each 1d6 fire. No initial damage. Higher slots add rounds; adjust reminder timing manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Until caster next turn start: conditional resistances, pass through creatures/ignore terrain, first entry per turn and melee-hit retaliation each 1d6 fire. No initial damage. Higher slots add rounds; adjust reminder timing manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:become-stone': kibblesProfile('Become Stone', {
    effect: ruleReminder(
      'Become Stone',
      'Until caster next turn start: petrified, armor class set to 20, 15 temporary HP. Apply condition, replacement armor class, and temporary HP manually; remove remainder on expiry. +5 temporary HP per higher slot.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'self',
      false,
    ),
    manual:
      'Until caster next turn start: petrified, armor class set to 20, 15 temporary HP. Apply condition, replacement armor class, and temporary HP manually; remove remainder on expiry. +5 temporary HP per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:become-water': kibblesProfile('Become Water', {
    effect: ruleReminder(
      'Become Water',
      'Until caster next turn start: nonmagical attack physical resistance, pass through creatures, ignore terrain. Later passing through Large or smaller target triggers Strength save against prone. Higher slots add rounds; adjust reminder timing manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Until caster next turn start: nonmagical attack physical resistance, pass through creatures, ignore terrain. Later passing through Large or smaller target triggers Strength save against prone. Higher slots add rounds; adjust reminder timing manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:become-wind': kibblesProfile('Become Wind', {
    effect: ruleReminder(
      'Become Wind',
      'Until printed next turn start: conditional resistances, 30-foot flight, pass through creatures, ignore terrain. Fall if airborne at end. Higher slots add rounds; track exact endpoint manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Until printed next turn start: conditional resistances, 30-foot flight, pass through creatures, ignore terrain. Fall if airborne at end. Higher slots add rounds; track exact endpoint manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:befuddling-curse': kibblesProfile('Befuddling Curse', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Befuddling Curse',
      'Initial Wisdom failure believes two similarly sized visible objects/creatures swapped. Repeat Wisdom save on interacting with, attacking, or being attacked by swapped targets. No charmed condition or broad attack modifier.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'Initial Wisdom failure believes two similarly sized visible objects/creatures swapped. Repeat Wisdom save on interacting with, attacking, or being attacked by swapped targets. No charmed condition or broad attack modifier.',
  }),
  'kibblestasty-casting-compendium-v2.3:bile-beam': kibblesProfile('Bile Beam', {
    mechanics: {
      save: { ability: 'dex', onSave: 'half' },
      ...kibblesDamage([{ formula: '12d4', type: 'acid' }], 4, [1]),
    },
    effect: ruleReminder(
      'Bile Beam',
      'Failure: 4d4 acid at affected creature next turn end; roll later and track target-owned timer manually.',
      { type: 'manual' },
      'enemy',
      true,
      'Until acid damage is resolved at the end of the affected creature’s next turn',
    ),
    manual:
      'Resolve first intercepted creature in 100-by-5-foot beam. Failure also owes 4d4 acid at its next turn end, rolled later manually. Continue only after destruction; initial acid +1d4 per higher slot.',
  }),
  'kibblestasty-casting-compendium-v2.3:binding-curse': kibblesProfile('Binding Curse', {
    effect: ruleReminder(
      'Binding Curse',
      'No initial save. Moving away from anchor triggers Wisdom save limiting distance until next turn start; starting more than 10 feet away triggers Strength save and 5-foot pull. Track anchor and conditional movement manually.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'No initial save. Moving away from anchor triggers Wisdom save limiting distance until next turn start; starting more than 10 feet away triggers Strength save and 5-foot pull. Track anchor and conditional movement manually.',
  }),
  'kibblestasty-casting-compendium-v2.3:blackhole': kibblesProfile('Blackhole', {
    effect: ruleReminder(
      'Blackhole',
      'Manual creation Dexterity save: success requires moving fully out or automatically becomes failure. Engulfed targets have speed zero, blinded/deafened/restrained, 12d12 bludgeoning at turn start, action Strength check escape. Track destruction, movement penalties, ranged disadvantage and caster/target pulls manually.',
      { type: 'manual' },
      'self',
      false,
    ),
    manual:
      'Manual creation Dexterity save: success requires moving fully out or automatically becomes failure. Engulfed targets have speed zero, blinded/deafened/restrained, 12d12 bludgeoning at turn start, action Strength check escape. Track destruction, movement penalties, ranged disadvantage and caster/target pulls manually.',
  }),
}
