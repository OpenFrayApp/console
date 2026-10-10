// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { sourceProfile, ruleReminder } from './reviewedProfile.ts'
import { condition, reminder } from '../effects.ts'

export const SPELLS_THAT_DONT_SUCK_4: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-spells-that-dont-suck:injunction': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Injunction',
    {
      mechanics: { save: { ability: 'wis', onSave: 'negates' } },
      effect: {
        summary:
          'Charmed to instructions; contradiction reduces current/maximum HP 5d10 once per turn. Appropriate cures/ending tracked manually.',
        targeting: 'enemy',
        multi: false,
        build: ({ source }) => [
          condition('Charmed', { source, duration: { type: 'manual' } }),
          reminder(
            'Injunction',
            'Charmed to instructions; contradiction reduces current/maximum HP 5d10 once per turn. Appropriate cures/ending tracked manually.',
            { source, duration: { type: 'manual' } },
          ),
        ],
      },
      manual:
        'Select creature that understands caster. Failure Charmed; disobeying reduces current and maximum HP 5d10 once per turn manually, not initial typed damage. Track suicidal-command ending, appropriate cures and restoration; higher slots alter reduction/duration. No automatic 30-day round timer.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:irradiate': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Irradiate',
    {
      effect: ruleReminder(
        'Irradiate',
        'Entry/start Constitution failure stacks maximum-HP loss, speed/roll/DC penalties and light; fifth failure dies. Constructs auto succeed.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial save/damage. First entry/turn start Constitution; constructs auto succeed. Failures stack 7d4 maximum-HP loss, speed -5, -2 attacks/checks/saves/DC, light/no invisibility; fifth failure dies. All nondeath effects end with concentration. Higher slots increase HP loss.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:lashing-vine': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Lashing Vine',
    {
      mechanics: { save: { ability: 'dex', onSave: 'negates' } },
      manual:
        'Optional initial pull: select visible Large or smaller creature within 30 feet of vine for Dexterity save. Failure pull 20 feet manually, no Restrained/damage. Vine AC/HP equal save DC; bonus actions repeat. Vine persists on success. Recast/dismiss ends; higher slots extend pull/range and size limit.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:life-drain': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Life Drain',
    {
      mechanics: {
        attackRoll: true,
        damage: [{ formula: '3d6', type: 'necrotic' }],
        scaling: [
          { by: 'slot', level: 7, damage: [{ formula: '4d6', type: 'necrotic' }] },
          { by: 'slot', level: 8, damage: [{ formula: '4d6', type: 'necrotic' }] },
          { by: 'slot', level: 9, damage: [{ formula: '5d6', type: 'necrotic' }] },
        ],
      },
      manual:
        'Select up to three creatures excluding constructs/undead; make separate ranged spell attacks. Manually heal caster half actual damage dealt. Printed scaling adds 1d6 per two levels above 5th, not above base 3rd; preserve threshold.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:lightning-beam': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Lightning Beam',
    {
      mechanics: {
        save: { ability: 'dex', onSave: 'half' },
        damage: [{ formula: '4d12', type: 'lightning' }],
        scaling: [
          { by: 'slot', level: 4, damage: [{ formula: '5d12', type: 'lightning' }] },
          { by: 'slot', level: 5, damage: [{ formula: '6d12', type: 'lightning' }] },
          { by: 'slot', level: 6, damage: [{ formula: '7d12', type: 'lightning' }] },
          { by: 'slot', level: 7, damage: [{ formula: '8d12', type: 'lightning' }] },
          { by: 'slot', level: 8, damage: [{ formula: '9d12', type: 'lightning' }] },
          { by: 'slot', level: 9, damage: [{ formula: '10d12', type: 'lightning' }] },
        ],
      },
      manual:
        'Select creatures along 100-by-5-foot path, including optional one bounce off visible solid nonconductive object; never damage same target twice for a bounce. Ignite unworn/uncarried objects manually; +1d12 lightning per higher slot.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:lightning-leash': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Lightning Leash',
    {
      attackKind: 'melee',
      mechanics: {
        attackRoll: true,
        damage: [{ formula: '1d6', type: 'lightning' }],
        scaling: [
          { by: 'character', level: 5, damage: [{ formula: '2d6', type: 'lightning' }] },
          { by: 'character', level: 11, damage: [{ formula: '3d6', type: 'lightning' }] },
          { by: 'character', level: 17, damage: [{ formula: '4d6', type: 'lightning' }] },
        ],
      },
      effect: ruleReminder(
        'Lightning Leash',
        'On leaving 30 feet before caster next turn start, optional reaction Strength save to negate lightning and half speed. Leash then dissipates.',
        { type: 'untilSourceTurn', when: 'startOfTurn' },
        'enemy',
        false,
      ),
      manual:
        'Choose visible creature. Hit only creates leash; if target later leaves 30 feet before caster next turn start, optional reaction Strength save to negate 1d6 lightning and half speed until that start. Leash dissipates outside range. Both dice scale at 5/11/17; no initial Strength save.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:lightning-tendril': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Lightning Tendril',
    {
      effect: ruleReminder(
        'Lightning Tendril',
        'Later action automatic 1d12 lightning to one creature; higher-slot bands change damage/range. No attack/save.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial attack/save/damage. Later action automatically deals 1d12 lightning to one creature, with no printed roll. Higher slot bands change damage/range; resolve manually without invented attack or save.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:luminous-smite': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Luminous Smite',
    {
      effect: ruleReminder(
        'Luminous Smite',
        'Next melee weapon hit +2d8 radiant; target cannot be invisible/obscured by Darkness and sheds dim light until concentration ends.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial attack/save/damage. Next melee weapon hit adds 2d8 radiant, prevents target invisibility and Darkness obscuration and sheds dim light while concentration lasts. Higher slots +1d8; track later hit and target manually.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:lunar-beam': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Lunar Beam',
    {
      effect: ruleReminder(
        'Lunar Beam',
        'Own-turn entry/start Constitution 2d10 radiant/half; silver-susceptible targets have disadvantage and extra failed damage. Action moves beam.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial save/damage. Target turn start/entry on own turn Constitution 2d10 radiant/half. Silver-susceptible/shapechanger disadvantage and extra 1d10 on failure, cannot change form in beam. Later action moves beam 60 feet; higher slots increase main damage.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:magic-fruit': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Magic Fruit',
    {
      manual:
        'Imbue fruit, no initial healing. Later action consumes one fruit for 1 HP; ten fruits nourish for a day. Track remaining fruit and 24-hour magic duration manually.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:magic-net': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Magic Net',
    {
      effect: ruleReminder(
        'Magic Net',
        'Entry Dexterity against Restrained/lifted 10 feet; Huge+ or detected-trap targets immune. Action Athletics/Acrobatics escape ends spell.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial save. Place trap on ground; creature entry Dexterity against Restrained and lifted 10 feet. Huge+ auto succeed and detected trap grants immunity. Action Athletics/Acrobatics escape versus caster DC ends spell; detect with Intelligence check manually.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:manipulate-earth': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Manipulate Earth',
    {
      manual:
        'Manual loose-earth excavation, color/carving, or up to three difficult-terrain squares for 1 hour with oldest replaced. No initial attack/save/damage; do not convert terrain manipulation into forced creature movement.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:manipulate-fire': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Manipulate Fire',
    {
      manual:
        'Choose fire resistance until caster next turn start, ignition, dousing, or 10-minute flame appearance change. Options/timers differ; manage defenses and restore manually. No initial save/damage.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:manipulate-water': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Manipulate Water',
    {
      manual:
        'Choose water movement (reverts next caster turn start unless concentration), animation 1 minute, color 1 hour, or unoccupied-water freeze/thaw with natural melt. No initial attack/save or assumed cold damage.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:manipulate-wind': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Manipulate Wind',
    {
      manual:
        'Choose next incoming ranged-weapon-attack disadvantage, Large-or-smaller Strength save against push 5 feet or Prone, next jump +5 feet, or minor gust. Resolve selected option manually; no single initial save for all choices.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:martial-transformation': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Martial Transformation',
    {
      effect: ruleReminder(
        'Martial Transformation',
        '50 temporary HP, chosen equipment, weapon advantage/+2d12 force and eligible extra attack. Cannot cast/concentrate; ending DC 15 Constitution against exhaustion.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Initially grant 50 temporary HP and conjure/equip chosen armor/weapons manually; cannot cast or concentrate. Weapon-only attack advantage/+2d12 force, proficiencies and extra attack depend on chosen weapon/actions, not spell attack resolver. Ends with DC 15 Constitution save against exhaustion; bonus-action dismissal.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:mass-freeze': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Mass Freeze',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'half' },
        damage: [{ formula: '4d8', type: 'cold' }],
      },
      effect: {
        summary:
          'Restrained; start-turn 1d8 cold, end-turn Constitution escape. Remove frozen bundle on success.',
        targeting: 'enemy',
        multi: true,
        build: ({ source }) => [
          condition('Restrained', { source, duration: { type: 'rounds', rounds: 10 } }),
          reminder(
            'Mass Freeze',
            'Restrained; start-turn 1d8 cold, end-turn Constitution escape. Remove frozen bundle on success.',
            { source, duration: { type: 'rounds', rounds: 10 } },
          ),
        ],
      },
      manual:
        'Select creatures in initial 20-foot sphere. Failed targets Restrained and later turn-start 1d8 cold. End-turn Constitution escape manual; remove bundle on success. No ongoing damage in initial roll; concentration owns frozen effects.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:mind-link': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Mind Link',
    {
      manual:
        'Manual Wisdom save with location/familiarity modifiers from printed table or willing failure. On failure telepathic link/sense sharing and remote low-level divination/illusion targeting. Repeated end-turn saves after linked spell; no blanket control or initial damage.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:minor-drain': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Minor Drain',
    {
      mechanics: {
        attackRoll: true,
        damage: [{ formula: '3d6', type: 'necrotic' }],
        scaling: [
          { by: 'slot', level: 2, damage: [{ formula: '4d6', type: 'necrotic' }] },
          { by: 'slot', level: 3, damage: [{ formula: '5d6', type: 'necrotic' }] },
          { by: 'slot', level: 4, damage: [{ formula: '6d6', type: 'necrotic' }] },
          { by: 'slot', level: 5, damage: [{ formula: '7d6', type: 'necrotic' }] },
          { by: 'slot', level: 6, damage: [{ formula: '8d6', type: 'necrotic' }] },
          { by: 'slot', level: 7, damage: [{ formula: '9d6', type: 'necrotic' }] },
          { by: 'slot', level: 8, damage: [{ formula: '10d6', type: 'necrotic' }] },
          { by: 'slot', level: 9, damage: [{ formula: '11d6', type: 'necrotic' }] },
        ],
      },
      manual:
        'Choose one target. On hit grant caster temporary HP equal to half actual damage dealt, fading after 1 minute; no healing. +1d6 necrotic per slot above 1st. Track temporary HP manually.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:misdirection': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Misdirection',
    {
      manual:
        'Manual observer-specific invisibility/hidden state and illusory double with caster AC. Investigation after damage/apparent attack/spell can reveal caster to that creature only. Sense sharing Blinded/Deafened to own surroundings only. No blanket Invisible that remains against successful observers.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:misfortune': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Misfortune',
    {
      manual:
        'Manually reroll triggering d20 and use lower result, including original result. No persistent disadvantage or new unrelated initial save.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:morph-earth': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Morph Earth',
    {
      manual:
        'Choose Mud or Rock before initial save: Mud Strength against Restrained, Rock Dexterity with success movement. Later Mud saves/automatic action release and Rock Athletics action escape differ. Track terrain, movement cost and rock AC 15/25 HP manually; no combined resolver.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:muddy-servant': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Muddy Servant',
    {
      persistsAfterSave: true,
      mechanics: {
        save: { ability: 'str', onSave: 'negates' },
        damage: [{ formula: '2d6', type: 'bludgeoning' }],
      },
      effect: {
        summary:
          'Restrained by mud golem; action Athletics/Acrobatics escape. Caster action squeeze/reform and free release manual.',
        targeting: 'enemy',
        multi: false,
        build: ({ source }) => [
          condition('Restrained', { source, duration: { type: 'rounds', rounds: 10 } }),
          reminder(
            'Muddy Servant',
            'Restrained by mud golem; action Athletics/Acrobatics escape. Caster action squeeze/reform and free release manual.',
            { source, duration: { type: 'rounds', rounds: 10 } },
          ),
        ],
      },
      manual:
        'Optional immediate grab: select Large or smaller creature within 5 feet of golem. Strength failure 2d6 bludgeoning and Restrained, success negates both. Golem persists on success. Manually add AC 12/20 HP construct, action squeeze with half-on-save, reform/grab, free release, and action Athletics/Acrobatics escape.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:nature-s-fury': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    "Nature's Fury",
    {
      effect: ruleReminder(
        "Nature's Fury",
        'Moving difficult terrain; choose Trees/Roots/Rocks/Wind on casting and later bonus actions, resolving each distinct mode manually.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'Choose Trees, Roots, Rocks, or Wind on casting, then bonus-action choices later. Different saves/attacks and damage/size limits require manual resolution. Track moving difficult terrain, roots action escape, rock hit Prone eligibility and wind push; no single unconditional damage resolver.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:nature-s-protection': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    "Nature's Protection",
    {
      effect: ruleReminder(
        "Nature's Protection",
        'Moving aura three-quarters cover/difficult terrain for others. Later bonus action/entry reaction pushes eligible targets, failure also Prone.',
        { type: 'manual' },
        'self',
        false,
      ),
      manual:
        'No initial save/damage. Moving 10-foot aura gives three-quarters cover and difficult terrain for others. Later bonus action or entry reaction Strength saves push Large-or-smaller out, failure also Prone. Apply cover only while inside manually.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:necromantic-infusion': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Necromantic Infusion',
    {
      manual:
        'Manual living/undead branch: living Constitution 5d8 necrotic/half; undead instead gain 5d8 temporary HP and attack advantage while those remain. Cannot use damaging resolver on undead or silently damage all targets.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:necromantic-storm': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Necromantic Storm',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'half' },
        damage: [{ formula: '6d8', type: 'necrotic' }],
      },
      manual:
        'Select only initial non-undead within 10 feet of rift. On death, resolve spreading 10-foot bursts manually, never damage creature twice; maximum ten affected. Humanoid killed rises as zombie at caster next turn start; other undead GM-selected. Higher slots raise target cap.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:necrotic-sphere': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Necrotic Sphere',
    {
      mechanics: {
        save: { ability: 'con', onSave: 'half' },
        damage: [{ formula: '8d8', type: 'necrotic' }],
      },
      manual:
        'Select up to eight creatures in 60-foot radius in printed center-out/fewer-HP priority. Resolve target selection manually before group save; +4 targets per higher slot, no damage scaling.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:oakenhide': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Oakenhide',
    {
      effect: ruleReminder(
        'Oakenhide',
        'Own turn start 6 temporary HP; only while these remain optional AC 15+Dex (max +2). No initial temporary HP.',
        { type: 'rounds', rounds: 10 },
        'self',
        false,
      ),
      manual:
        'No initial temporary HP. At each own turn start gain 6 temporary HP; only while these remain optional AC 15+Dex (max +2). Manually apply/restore AC, do not grant additive bonus. Higher slots increase temporary HP and AC per printed thresholds.',
    },
  ),
  'somanyrobots-spells-that-dont-suck:petrify': sourceProfile(
    'somanyrobots-spells-that-dont-suck',
    '5.0',
    'Petrify',
    {
      manual:
        'Manual initial Constitution save for flesh target: failure by 5+ immediately Petrified, other failure Restrained. Later failure Petrifies, three successes end spell. Petrification persists independently of concentration until appropriate magic. Threshold branch cannot be one automatic condition.',
    },
  ),
}
