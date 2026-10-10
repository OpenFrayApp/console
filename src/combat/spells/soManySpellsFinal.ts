// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { condition, modifierEffect, reminder } from '../effects.ts'
import { ruleReminder } from './reviewedProfile.ts'
import { reviewed } from './soManySpells.ts'

export const SO_MANY_SPELLS_FINAL: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-so-many-spells:steelskin': reviewed('Steelskin', {
    effect: ruleReminder(
      'Steelskin',
      'AC floor 19; bludgeoning/piercing/slashing resistance; 10 temporary HP at each target turn start.',
      { type: 'manual' },
      'ally',
    ),
    manual:
      'Choose touched creature. Apply AC floor/defenses and later temporary HP manually; no initial temporary HP or additive AC bonus. Restore changed defenses when 1-hour concentration ends.',
  }),
  'somanyrobots-so-many-spells:storm-of-spirits': reviewed('Storm of Spirits', {
    mechanics: {
      damage: [{ formula: '10d8', type: 'necrotic' }],
      save: { ability: 'wis', onSave: 'half' },
    },
    effect: {
      summary: 'Frightened until end of caster next turn',
      targeting: 'enemy',
      build: ({ source }) => [
        condition('Frightened', {
          source,
          duration: { type: 'untilSourceTurn', when: 'endOfTurn' },
        }),
      ],
    },
    manual:
      'Select ONLY primary visible target for this resolver. Other creatures within 15 feet separately make Wisdom saves to negate 3d8 necrotic manually, with no fear or half damage. Both primary and secondary dice +1d8 per slot above 5th. Primary fear ends at caster next turn end.',
  }),
  'somanyrobots-so-many-spells:stormwall': reviewed('Stormwall', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '4d12', type: 'lightning' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    manual:
      'Select creatures in wall on creation only. Later first entry/end-turn saves and 4d12 lightning are manual, as is bonus-action 2d12 bolt (chosen visible within 30 feet or random within 10). Track opaque wall dimensions/orientation, no sound through, Deafened within 10 feet, and 4 movement per foot. Wall persists despite initial saves; do not deal bonus bolt at creation.',
  }),
  'somanyrobots-so-many-spells:summon-fell-machine': reviewed('Summon Fell Machine', {
    manual:
      'Manually add printed Fell Machine Spirit in unoccupied visible space, choosing Flesh/Iron/Adamantine and slot-dependent AC/HP/attacks. Takes turn after caster, follows verbal commands or Dodges/avoids hazards. No initial attack/save/damage. Track Flesh berserk HP loss, Iron drill grapple and conditional extra fire, Adamantine crit conversion/curse, destruction, and 1-hour concentration.',
  }),
  'somanyrobots-so-many-spells:summon-spider': reviewed('Summon Spider', {
    manual:
      'Manually add printed Spider Spirit in unoccupied visible space; choose Venomous/Webspinner/Sword. Takes turn after caster, follows commands or Dodges/avoids danger. No initial attack/save/damage. Track slot scaling, web destruction/escape, venom recharge and end-turn saves, Sword movement-spending frenzy. Printed HP formula references above 5th although base spell is 4th; do not silently fix it.',
  }),
  'somanyrobots-so-many-spells:surf-skip': reviewed('Surf Skip', {
    effect: ruleReminder(
      'Surf Skip',
      'Move on liquid as solid ground, spending 5 feet for 10 feet travel. Must move at least 30 feet each turn or sink; while moving on liquid, advantage on saves avoiding Restrained/Prone.',
      { type: 'rounds', rounds: 100 },
      'ally',
    ),
    manual:
      'Choose touched creature (header range 15 feet). Track movement, liquid surface, and conditional save advantage manually. No blanket advantage to all saves or permanent doubled movement on land.',
  }),
  'somanyrobots-so-many-spells:terrifying-guise': reviewed('Terrifying Guise', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: {
      summary: 'Frightened; random start-turn table and caster-only bonus damage',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        condition('Frightened', { source, duration: { type: 'rounds', rounds: 10 } }),
        reminder(
          'Terrifying Guise',
          'Caster attacks +1d6 psychic against affected creature. Start-turn d8 table: Prone/Stunned/flee/4d8 psychic/two results. End-turn Wisdom escape; success grants immunity to same casting.',
          { source, duration: { type: 'rounds', rounds: 10 } },
        ),
      ],
    },
    manual:
      'Choose creatures within 60 feet. No initial damage or table roll. Resolve later random effects, caster-only hit bonus, escape and per-casting immunity manually; remove bundle on successful escape. Do not grant automatic Stunned to every failure.',
  }),
  'somanyrobots-so-many-spells:thorn-lance': reviewed('Thorn Lance', {
    mechanics: { attackRoll: true, damage: [{ formula: '6d8', type: 'piercing' }] },
    effect: {
      summary: 'Restrained for 1 minute; turn-end piercing and Strength escape saves',
      targeting: 'enemy',
      build: ({ source }) => [
        condition('Restrained', { source, duration: { type: 'rounds', rounds: 10 } }),
        reminder(
          'Thorn Lance',
          'End turn: 2d8 piercing, then optional Strength escape save. Other creature within 5 feet may clear vines as action.',
          { source, duration: { type: 'rounds', rounds: 10 } },
        ),
      ],
    },
    manual:
      'Choose one visible creature. On hit only apply vines. Later damage, escape, and clearing are manual; remove bundle when no longer Restrained. +1d8 initial damage per slot above 4th; later 2d8 does not scale. Header Instantaneous does not remove printed 1-minute vines.',
  }),
  'somanyrobots-so-many-spells:thunderous-chords': reviewed('Thunderous Chords', {
    manual:
      'Manual 30-foot cone Constitution saves and later action waves. Source labels both full-damage/Deafened/next-attack-disadvantage branch and half-damage/no-effects branch as failed saves. Printed outcome is ambiguous; consult source/GM before resolving instead of silently treating second clause as success. Next-attack penalty is bounded by caster next turn start; track 1-minute concentration.',
  }),
  'somanyrobots-so-many-spells:tieleman-s-cannon': reviewed('Tieleman’s Cannon', {
    effect: ruleReminder(
      'Tieleman’s Cannon',
      'Start caster next turn: 120-by-5-foot line, Dexterity save, 7d10 bludgeoning/half. Early concentration end fires immediately for 4d10/half.',
      { type: 'manual' },
      'self',
    ),
    manual:
      'Place cannon in visible space. No initial save/damage. Resolve cannon before clearing early-broken concentration reminder. +1d10 damage per slot above 4th; fortified structures/ships full damage, smaller objects double. Direction chosen when firing; do not combine normal and premature blasts.',
  }),
  'somanyrobots-so-many-spells:titan-s-might': reviewed('Titan’s Might', {
    effect: ruleReminder(
      'Titan’s Might',
      'Strength-based attacks/checks have advantage; Strength-based attacks +1d8 damage; doubled carrying capacity.',
      { type: 'rounds', rounds: 100 },
      'self',
    ),
    manual:
      'No initial attack/save/damage. Apply advantage and bonus only when actually using Strength; attack resolver does not identify attack ability, so do not grant all-attack advantage. Track carrying and 10-minute concentration manually.',
  }),
  'somanyrobots-so-many-spells:turning-ward': reviewed('Turning Ward', {
    effect: ruleReminder(
      'Turning Ward',
      'Attack/harmful-spell targeting first requires attacker Intelligence save. Failure redirects to caster or alternative if caster ineligible, otherwise loses attack/spell. Area effects bypass ward; successful save or hostile attack/spell from warded creature grants that creature immunity.',
      { type: 'manual' },
      'ally',
    ),
    manual:
      'Choose another touched creature. No initial save/AC bonus. Resolve later attacker saves, legal targets and individual immunity manually; do not redirect area effects. Track 1-hour concentration.',
  }),
  'somanyrobots-so-many-spells:twist-shadow': reviewed('Twist Shadow', {
    effect: {
      summary: 'Invisible; movement/action ends spell at own turn end',
      targeting: 'self',
      build: ({ source }) => [
        condition('Invisible', { source }),
        reminder(
          'Twist Shadow',
          'Requires dim light/darkness on casting. If caster moves or takes any action, ends at end of that turn.',
          { source },
        ),
      ],
    },
    manual:
      'Cast only while in dim light/darkness. Manually end concentration at end of turn when movement/action triggers ending; do not clear immediately when moving. Track up to 10 minutes otherwise.',
  }),
  'somanyrobots-so-many-spells:undead-familiar': reviewed('Undead Familiar', {
    manual:
      'Manual Tiny corpse familiar with selected printed animal stats, Undead type, necrotic/poison immunity; no attacks. Turn after caster; first would-drop-to-0 Constitution save at damage DC may leave 1 HP. Track telepathy/sense sharing/touch delivery within 100 feet, reaction delivery, once-per-rest/recreation +1d4 necrotic. No initial attack/save; recasting kills previous familiar.',
  }),
  'somanyrobots-so-many-spells:unholy-crypt': reviewed('Unholy Crypt', {
    manual:
      'Manual 10-to-60-foot-side crypt structure and one/two selected protective effects, exemptions and command activation. No initial save/damage. Track turn-end mist damage, distracted-only Wisdom/concentration-save disadvantage, darkness, or start-turn Dexterity speed-0 hands. Celestials all-save disadvantage only inside crypt. Dispel 6th+ suppresses one effect 24 hours; daily year permanence and higher-slot size/effect/casting-time increases manual.',
  }),
  'somanyrobots-so-many-spells:vampiric-mist': reviewed('Vampiric Mist', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '2d6', type: 'necrotic' }],
      save: { ability: 'con', onSave: 'negates' },
    },
    manual:
      'Select creature in initial 5-foot mist space. Manually store half actual damage dealt, cap 20 HP (+5 per slot above 4th). Mist persists despite successful save; later bonus action moves 30 feet and leeches, action moves/disgorges all stored HP to heal one creature and ends spell. No initial healing or damage scaling.',
  }),
  'somanyrobots-so-many-spells:venomous-maw': reviewed('Venomous Maw', {
    attackKind: 'melee',
    mechanics: {
      attackRoll: true,
      damage: [
        { formula: '1d12', type: 'piercing' },
        { formula: '5d12', type: 'poison' },
      ],
    },
    effect: {
      summary: 'Poisoned; end-turn Constitution escape saves',
      targeting: 'enemy',
      build: ({ source }) => [
        condition('Poisoned', { source, duration: { type: 'rounds', rounds: 10 } }),
        reminder(
          'Venomous Maw',
          'Constitution save at each turn end ends effect; clear bundle on success.',
          { source, duration: { type: 'rounds', rounds: 10 } },
        ),
      ],
    },
    manual:
      'Choose one visible creature within 30 feet. Initial melee attack, no initial save; Poisoned only on hit. Resolve later escape saves manually. Do not invent later bonus-action snake attacks not printed.',
  }),
  'somanyrobots-so-many-spells:vile-harpoon': reviewed('Vile Harpoon', {
    mechanics: {
      damage: [
        { formula: '4d8', type: 'piercing' },
        { formula: '4d8', type: 'necrotic' },
      ],
      save: { ability: 'dex', onSave: 'negates' },
    },
    manual:
      'Choose one creature within 120 feet; empty hand required. Failed target no more than one size larger than caster can be pulled up to 30 feet by bonus action manually. No automatic Restrained or attack roll. Per slot above 3rd: +1d8 piercing only, +30 feet range, +15 feet haul; necrotic unchanged.',
  }),
  'somanyrobots-so-many-spells:void-rift': reviewed('Void Rift', {
    manual:
      'Manual gravity point; no initial save/damage. Start within 30 feet: Strength failure 3d8 bludgeoning and pull 15 feet, success half/no pull. Within 15 feet instead 6d8. Track different damage zones and 1-minute concentration; do not combine both zone damages.',
  }),
  'somanyrobots-so-many-spells:volcanic-seep': reviewed('Volcanic Seep', {
    manual:
      'Manual trail of up to twenty side-connected 5-foot squares. Initial standing creatures may spend reaction for Dexterity save to move 15 feet on success; no initial automatic damage save. Later start-turn or move into square: Constitution save, 6d10 fire/half. +10 squares per slot above 6th. Track reaction choice, movement, geometry and 1-minute concentration.',
  }),
  'somanyrobots-so-many-spells:voltaic-pulse': reviewed('Voltaic Pulse', {
    mechanics: {
      damage: [{ formula: '3d12', type: 'lightning' }],
      save: { ability: 'con', onSave: 'half' },
    },
    manual:
      'Choose visible host manually, then select only OTHER creatures within 15 feet for initial saves. Host is excluded from pulse damage. Repeat pulse at end of host next turn manually, not caster next turn and not immediately.',
  }),
  'somanyrobots-so-many-spells:waldrip-s-wondrous-wagon': reviewed("Waldrip's Wondrous Wagon", {
    manual:
      'Manual pumpkin transformation into Large wagon and spectral horse, up to 2000 pounds, speed 30 feet/slow pace 3 miles per hour. Moves as directed, no actions or initial attack/save. Track 8 hours plus 8 hours per slot above 3rd; do not add a combat horse attack.',
  }),
  'somanyrobots-so-many-spells:wall-of-blood': reviewed('Wall of Blood', {
    manual:
      'Manual opaque blood wall on solid surface; no initial save/damage. Entering creature Constitution save: 3d8 necrotic/half. Caster may spend 2 HP per entry to add 2d8 damage. Track printed straight/ring geometry and 3 movement per foot, 10-minute concentration; HP cost is not typed self-damage.',
  }),
  'somanyrobots-so-many-spells:wall-of-bones': reviewed('Wall of Bones', {
    manual:
      'Manual ten contiguous vertical grounded panels, AC 10, 80 HP, bludgeoning vulnerability. Creation pushes occupants; enclosed creatures may Dexterity save to choose outside space, not take damage. Later adjacent turn-start/first approach on own turn Dexterity failure: 2d8 necrotic, Grappled, 2d8 each later turn start. Athletics against caster DC or panel destruction frees. Slots 7+ full 10-minute concentration makes permanent/undispellable.',
  }),
  'somanyrobots-so-many-spells:wall-of-insects': reviewed('Wall of Insects', {
    manual:
      'Manual opaque bug wall/ring on solid surface, 3 movement per foot; no initial save/damage. Start-turn/entry on own turn Constitution failure: 2d8 poison +2d8 piercing and Poisoned until next turn ends, half/no poison on success. Ending inside attaches bugs continuing wall effects until action brush-off by creature within 5 feet. Track 1-hour concentration and attachment separately.',
  }),
  'somanyrobots-so-many-spells:wall-of-misery': reviewed('Wall of Misery', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '4d8', type: 'necrotic' }],
      save: { ability: 'cha', onSave: 'negates' },
    },
    effect: {
      summary: '1-minute curse: no healing and d6 roll penalties; end-turn Charisma escape saves',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        {
          ...reminder(
            'Wall of Misery',
            'No healing; subtract 1d6 from each attack/save/check. End-turn Charisma save ends curse.',
            { source, duration: { type: 'rounds', rounds: 10 } },
          ),
          concentration: false,
        },
      ],
    },
    manual:
      'Select initial creatures in wall; initial success negates damage/curse, no half damage printed. Track wall sight geometry, darkness Perception detection, bonus-action move 15 feet, and automatic 4d8 necrotic at turn end inside manually. Curse has its own printed 1-minute timer; remove on successful escape and track independently of 10-minute wall concentration.',
  }),
  'somanyrobots-so-many-spells:wall-of-snow': reviewed('Wall of Snow', {
    manual:
      'Manual ten contiguous grounded vertical snow panels, AC 10, 100 HP, fire vulnerability. Creation pushes occupants; enclosed creature optional Dexterity save moves outside, no initial damage. When panel damaged, creatures within 5 feet automatically take 1d6 cold and Constitution save against Restrained until next turn starts. Full 10-minute concentration makes wall permanent/nonmagical/undispellable; early end removes it.',
  }),
  'somanyrobots-so-many-spells:wave-of-darkness': reviewed('Wave of Darkness', {
    mechanics: {
      damage: [{ formula: '3d8', type: 'necrotic' }],
      save: { ability: 'con', onSave: 'half' },
    },
    manual:
      'Select initial creatures in 10-foot-radius, 5-foot-high circle centered at casting location. Failures by 5+ manually Blinded until start of caster next turn. Later caster turn starts expand to 20-foot then 30-foot rings excluding inner prior radius, with separate saves/damage; fades third turn. Does not move with caster; no initial 30-foot blast.',
  }),
  'somanyrobots-so-many-spells:wheel-of-bone': reviewed('Wheel of Bone', {
    manual:
      'Manual sequential rolling/ricochet collision path, total 30 feet from chosen 5-foot space. Each collision Dexterity save: 2d8 bludgeoning +2d8 necrotic/half; targets hit after <10 feet travel automatically succeed. Shared initial multi-target resolver cannot track sequence, automatic success, or objects. Distance +15 feet per two slots above 3rd as printed; no damage increase.',
  }),
  'somanyrobots-so-many-spells:whiteout': reviewed('Whiteout', {
    manual:
      'Manual 30-foot heavily obscured sphere, freezes water. No initial save/damage. Start-turn/entry on own turn Constitution failure: 6d8 cold and half speed until next turn ends; if already slowed by spell, also Restrained until next turn ends. No half damage on success printed. +1d8 per slot above 7th; track repeat-failure state and 1-minute concentration.',
  }),
  'somanyrobots-so-many-spells:wind-of-ruin': reviewed('Wind of Ruin', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: {
      summary: 'Physical-check disadvantage; attack d6 penalty; later HP reductions',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        modifierEffect(
          {
            name: 'Wind of Ruin',
            applies: 'abilityChecks',
            direction: 'outgoing',
            mode: 'disadvantage',
            abilities: ['str', 'dex', 'con'],
          },
          { source, duration: { type: 'rounds', rounds: 10 } },
        ),
        reminder(
          'Wind of Ruin',
          'Subtract 1d6 from attack rolls. Turn start reduce current/max HP by 2d10, max cannot go below 1; max reduction ends after long rest. End-turn Charisma save ends curse.',
          { source, duration: { type: 'rounds', rounds: 10 } },
        ),
      ],
    },
    manual:
      'Select creatures in 10-foot-wide, 60-foot-long line from chosen visible point. No initial HP loss/damage. Resolve later HP reductions, attack penalty and escape manually; clear bundle on escape. Max HP recovery persists beyond curse/concentration; do not grant disadvantage on saves or mental checks.',
  }),
  'somanyrobots-so-many-spells:wisdom-of-the-forgotten': reviewed('Wisdom of the Forgotten', {
    effect: {
      summary: 'Intelligence/Wisdom check and save advantage; limited failed-skill replacement',
      targeting: 'self',
      build: ({ source }) => [
        modifierEffect(
          {
            name: 'Wisdom of the Forgotten',
            applies: 'abilityChecks',
            direction: 'outgoing',
            mode: 'advantage',
            abilities: ['int', 'wis'],
          },
          { source },
        ),
        modifierEffect(
          {
            name: 'Wisdom of the Forgotten',
            applies: 'savingThrows',
            direction: 'outgoing',
            mode: 'advantage',
            abilities: ['int', 'wis'],
          },
          { source },
        ),
        reminder(
          'Wisdom of the Forgotten',
          'May replace failed skill roll with 20, up to caster spellcasting modifier uses.',
          { source },
        ),
      ],
    },
    manual:
      'Track limited failed-skill replacement and caster modifier manually; no initial save/damage. Authored advantage applies only to Intelligence/Wisdom checks and saves, not attacks or all abilities. Track 1-hour concentration.',
  }),
  'somanyrobots-so-many-spells:wraithbind': reviewed('Wraithbind', {
    mechanics: {
      damage: [{ formula: '8d8', type: 'necrotic' }],
      save: { ability: 'cha', onSave: 'negates' },
    },
    effect: ruleReminder(
      'Wraithbind',
      'If target dies within 1 minute, spirit rises as hostile wraith 24 hours later.',
      { type: 'rounds', rounds: 10 },
    ),
    manual:
      'Choose one creature. Failure only: manually grant caster temporary HP equal to half actual damage dealt. Track death trigger and delayed hostile wraith; no half damage or caster control printed. No concentration.',
  }),
  'somanyrobots-so-many-spells:wraithform': reviewed('Wraithform', {
    effect: ruleReminder(
      'Wraithform',
      'Nonmagical weapon resistance; fly 50 feet, pass through creatures/objects. End turn inside: shunted, 1d10 force. First own-turn creature passage: 1d8 necrotic and half as temporary HP. Later action melee spell attack: 5d8 necrotic and half as temporary HP; bonus action toggles 10-foot darkness.',
      { type: 'rounds', rounds: 100 },
      'self',
    ),
    manual:
      'No initial attack/save/damage. Resolve defense, flight, collision/shunt, once-turn passage damage, later melee attacks, temporary HP and aura toggling manually. Do not grant resistance to all nonmagical damage or infer later attacks at casting.',
  }),
}
