// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { advantageAgainst, condition, reminder } from '../effects.ts'
import { sourceProfile, ruleReminder, nextTurnCondition } from './reviewedProfile.ts'

/** Bind a reviewed So Many Spells card to its approved source and edition. */
export function reviewed(
  name: string,
  profile: Omit<ReviewedSpellCasting, 'source' | 'edition' | 'name'>,
): ReviewedSpellCasting {
  return sourceProfile('somanyrobots-so-many-spells', '5.0', name, profile)
}

export const SO_MANY_SPELLS_CASTING: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-so-many-spells:accursed-blade': reviewed('Accursed Blade', {
    effect: ruleReminder(
      'Accursed Blade',
      'Chosen weapon attacks subtract 1d4 and deal +4d4 necrotic. After a hit, wielder may spend bonus action to transfer a curse on failed Charisma save, reducing weapon bonus by 1d4.',
      { type: 'manual' },
      'ally',
    ),
    manual:
      'Mark the touched weapon. No initial save. Resolve later curse-transfer saves, shared attack/save penalties, declining bonus damage, and end-turn Charisma escape saves manually. Track 1 hour; recasting ends the previous spell.',
  }),
  'somanyrobots-so-many-spells:acid-jet': reviewed('Acid Jet', {
    mechanics: {
      damage: [{ formula: '12d4', type: 'acid' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: {
      summary: '6d4 acid at end of next turn unless removed with an action',
      targeting: 'enemy',
      multi: true,
      build: ({ source, target }) => [
        reminder(
          'Acid Jet',
          'At end of next turn: 6d4 acid, unless target or creature within 5 feet uses an action to remove acid.',
          {
            source: target?.combatantId ?? source,
            duration: target ? { type: 'untilSourceTurn', when: 'endOfTurn' } : { type: 'manual' },
          },
        ),
      ],
    },
    manual:
      'Select creatures in the 60-foot-long, 5-foot-wide line. Only failures receive the later-damage reminder; do not roll the 6d4 with the initial damage. Remove reminder if acid is removed with an action. Add 2d4 initial damage per slot above 5th; later damage remains 6d4.',
  }),
  'somanyrobots-so-many-spells:alter-metal': reviewed('Alter Metal', {
    manual:
      'Manual object manipulation: choose a Huge-or-smaller nonmagical metal object not worn or carried. Change dimensions, metal, shape, or object HP using the printed options. No initial save, damage, or creature AC modifier.',
  }),
  'somanyrobots-so-many-spells:ambertrap': reviewed('Ambertrap', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: {
      summary: 'Restrained in amber until destroyed or spell ends',
      targeting: 'enemy',
      build: ({ source }) => [
        condition('Restrained', { source, duration: { type: 'rounds', rounds: 10 } }),
        reminder(
          'Ambertrap',
          'Amber: AC 14, 20 HP, lightning resistance, fire vulnerability. Destroying it frees the target; excess damage hits target. Death in amber makes duration permanent.',
          { source, duration: { type: 'rounds', rounds: 10 } },
        ),
      ],
    },
    manual:
      'Choose one visible creature. No repeated escape save. Track amber HP and excess damage manually. Remove the bundle when amber is destroyed; if the target dies trapped, replace timers/concentration linkage with permanent reminders per the source. Add 10 amber HP per slot above 2nd.',
  }),
  'somanyrobots-so-many-spells:astral-armor': reviewed('Astral Armor', {
    effect: ruleReminder(
      'Astral Armor',
      'Minimum AC 16; radiant resistance; dim light 15 feet. Reaction to melee targeting: attacker Constitution save against Blinded, triggering attack at disadvantage regardless of save, then AC minimum drops 1.',
      { type: 'manual' },
      'self',
    ),
    manual:
      'Set an AC floor, not an AC bonus. Track reaction saves, target-next-turn Blinded, and the declining AC floor manually. Ends when floor reaches 10 or after 1 hour; no initial save. Do not grant blanket disadvantage to every attack.',
  }),
  'somanyrobots-so-many-spells:aura-of-iron': reviewed('Aura of Iron', {
    effect: ruleReminder(
      'Aura of Iron',
      'Nonhostile creatures in moving aura resist next nonmagical bludgeoning/piercing/slashing instance and may maximize one die on next piercing/slashing damage; both reset each caster turn.',
      { type: 'rounds', rounds: 10 },
      'self',
    ),
    manual:
      'Resolve aura membership and the two separate once-per-caster-turn benefits manually, including caster. Do not grant permanent resistance or maximize every damage die.',
  }),
  'somanyrobots-so-many-spells:aura-of-slaughter': reviewed('Aura of Slaughter', {
    effect: ruleReminder(
      'Aura of Slaughter',
      'Chosen creatures starting turn in 30-foot aura: +1d6 necrotic on first melee hit that turn; 2d6 temporary HP when reducing a creature to 0 HP with a melee attack.',
      { type: 'rounds', rounds: 10 },
      'self',
    ),
    manual:
      'Track moving aura, start-turn eligibility, first melee hit, kill trigger, and temporary HP manually. No initial attack/save/damage; ranged attacks do not gain these benefits; melee spell attacks can qualify.',
  }),
  'somanyrobots-so-many-spells:auric-lance': reviewed('Auric Lance', {
    mechanics: { attackRoll: true, damage: [{ formula: '10d8', type: 'piercing' }] },
    effect: {
      summary: 'Advantage on attacks against target until start of caster’s next turn',
      targeting: 'enemy',
      build: ({ source }) => [
        advantageAgainst('Auric Lance', {
          source,
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        }),
      ],
    },
    manual:
      'Choose one target within range. Apply the golden-aura effect only on a hit. Add 1d8 damage per slot above 5th.',
  }),
  'somanyrobots-so-many-spells:axiomatic-artillery': reviewed('Axiomatic Artillery', {
    effect: ruleReminder(
      'Axiomatic Artillery',
      'At start of caster’s next turn: 100 force damage. If concentration breaks earlier: 50 force damage. Ends without blast if target leaves the plane.',
      { type: 'manual' },
    ),
    manual:
      'Choose one visible creature. No initial damage or save. Resolve later timing and damage manually, including 50 force before clearing an early-broken concentration reminder. Do not roll a saving throw or deal 100 force on initial casting.',
  }),
  'somanyrobots-so-many-spells:banshee-s-wail': reviewed("Banshee's Wail", {
    mechanics: {
      damage: [{ formula: '10d8', type: 'necrotic' }],
      save: { ability: 'con', onSave: 'half' },
    },
    effect: {
      summary: 'Frightened for 1 minute; Wisdom escape saves at turn end',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        condition('Frightened', { source, duration: { type: 'rounds', rounds: 10 } }),
        reminder(
          "Banshee's Wail",
          'Wisdom escape save at end of each turn. Failure by 5+ on initial Constitution save doubles damage and also Stuns until end of target’s next turn.',
          { source, duration: { type: 'rounds', rounds: 10 } },
        ),
      ],
    },
    manual:
      'Select creatures within 30 feet, excluding undead and constructs. Check initial save margin: failure by 5+ requires doubling that target’s damage manually and adding Stunned until its next turn ends. Escape uses Wisdom, not Constitution. Remove fear bundle on successful escape.',
  }),
  'somanyrobots-so-many-spells:beast-claw': reviewed('Beast Claw', {
    manual:
      'Manual attack choice: melee spell attack or unarmed strike, chosen by caster. On hit: 2d10 plus spellcasting modifier slashing, then next melee attack against target has advantage before end of caster’s next turn. The existing spell action lacks the attack-choice and caster-modifier inputs. Add 1d10 per slot above 1st.',
  }),
  'somanyrobots-so-many-spells:bewitching-phantom': reviewed('Bewitching Phantom', {
    persistsAfterSave: true,
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: {
      summary: 'Charmed by specter until start of target’s next turn',
      targeting: 'enemy',
      build: ({ source }) => [
        {
          ...condition('Charmed', { source, duration: { type: 'manual' } }),
          durationNote: 'Until start of target’s next turn (manual)',
        },
        {
          ...reminder(
            'Bewitching Phantom',
            'Approaches specter without obvious danger; touching specter deals 2d8 necrotic. Remove this bundle at start of target’s next turn.',
            { source, duration: { type: 'manual' } },
          ),
          durationNote: 'Until start of target’s next turn (manual)',
        },
      ],
    },
    manual:
      'Choose one creature within 30 feet of the specter when commanding it on cast. Specter persists even on successful save. Later bonus-action moves/commands and contact damage are manual. Charm expires at target’s next turn start; its timer is manual so concentration remains correctly linked to caster. Losing sight or distance beyond 120 feet ends spell.',
  }),
  'somanyrobots-so-many-spells:black-bolt': reviewed('Black Bolt', {
    manual:
      'Manual ammunition/throw branch: create the bolt, then resolve the chosen thrown ranged spell attack or bow/crossbow shot. Do not grant an extra free attack on creation. A hit deals 8d8 necrotic and causes 1-minute half-healing/dim-light perception with end-turn Constitution escape saves. Bolt expires after 1 minute, firing, or recasting. Add 1d8 per slot above 4th.',
  }),
  'somanyrobots-so-many-spells:black-moon': reviewed('Black Moon', {
    manual:
      'Manual persistent area: no initial save/damage. Living creatures starting in its negative light or ending inside the sphere make Wisdom saves against 5d8 psychic and Blinded until next turn starts, half damage/no blindness on success. Track moon geometry and separate triggers; do not apply the damage at creation.',
  }),
  'somanyrobots-so-many-spells:blade-shell': reviewed('Blade Shell', {
    effect: ruleReminder(
      'Blade Shell',
      'Next melee attack targeting caster (hit or miss) bursts shield: 2d4 piercing to attacker. Otherwise fades at start of caster’s next turn.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'self',
    ),
    manual:
      'No initial damage. On next melee targeting, apply retaliation manually and clear reminder even if attack misses. Damage is 4d4 at character level 5, 6d4 at 11, 8d4 at 17; do not infer player level.',
  }),
  'somanyrobots-so-many-spells:bloody-scythe': reviewed('Bloody Scythe', {
    effect: ruleReminder(
      'Bloody Scythe',
      'Magical blood glaive: 1d10 slashing plus 1d6 necrotic to hit target and 1d6 necrotic to random adjacent creature. Bonus action after a hit can explode it in 30-foot cone: Dexterity save for half of 6d6 necrotic, wielder gains half rolled damage as temporary HP; spell ends.',
      { type: 'rounds', rounds: 100 },
      'ally',
    ),
    manual:
      'Choose wielder and manage the created weapon’s proficiency/properties manually. Creation deals no damage. Resolve later hits, random secondary targets, explosion save/damage, temporary HP, and dismissal manually; explosion is not initial-cast damage.',
  }),
  'somanyrobots-so-many-spells:bone-hatchet': reviewed('Bone Hatchet', {
    attackKind: 'melee',
    mechanics: {
      attackRoll: true,
      damage: [
        { formula: '1d4', type: 'slashing' },
        { formula: '1d4', type: 'necrotic' },
      ],
      scaling: [
        {
          level: 5,
          by: 'character',
          damage: [
            { formula: '1d4', type: 'slashing' },
            { formula: '2d4', type: 'necrotic' },
          ],
        },
        {
          level: 11,
          by: 'character',
          damage: [
            { formula: '1d4', type: 'slashing' },
            { formula: '3d4', type: 'necrotic' },
          ],
        },
        {
          level: 17,
          by: 'character',
          damage: [
            { formula: '1d4', type: 'slashing' },
            { formula: '4d4', type: 'necrotic' },
          ],
        },
      ],
    },
    effect: ruleReminder(
      'Bone Hatchet',
      'Set temporary HP equal to half necrotic damage actually dealt, expiring at start of caster’s next turn.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'self',
    ),
    manual:
      'This is a melee spell attack. Set temporary HP manually using necrotic damage dealt after target defenses, not total slashing+necrotic rolled damage. Select character-level damage variant where available; only necrotic dice scale. Creature casting remains base damage unless GM adjusts it.',
  }),
  'somanyrobots-so-many-spells:bone-spear': reviewed('Bone Spear', {
    mechanics: {
      attackRoll: true,
      damage: [
        { formula: '2d8', type: 'piercing' },
        { formula: '2d8', type: 'necrotic' },
      ],
      scaling: [
        {
          level: 4,
          by: 'slot',
          damage: [
            { formula: '3d8', type: 'piercing' },
            { formula: '3d8', type: 'necrotic' },
          ],
        },
        {
          level: 6,
          by: 'slot',
          damage: [
            { formula: '4d8', type: 'piercing' },
            { formula: '4d8', type: 'necrotic' },
          ],
        },
        {
          level: 8,
          by: 'slot',
          damage: [
            { formula: '5d8', type: 'piercing' },
            { formula: '5d8', type: 'necrotic' },
          ],
        },
      ],
    },
    effect: ruleReminder(
      'Bone Spear',
      'Impaled: healing halved. Action DC 10 Medicine check removes spear; otherwise fades after 1 minute.',
      { type: 'rounds', rounds: 10 },
    ),
    manual:
      'Apply impalement only on a hit. Resolve halved healing and action Medicine removal manually; remove reminder when spear is removed. Both damage types increase by 1d8 per two slot levels above 2nd; use the applicable variant or edit damage manually.',
  }),
  'somanyrobots-so-many-spells:bone-spines': reviewed('Bone Spines', {
    mechanics: {
      damage: [{ formula: '5d8', type: 'piercing' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: ruleReminder(
      'Bone Spines',
      'Impaled: 1d4 piercing per 5 feet moved. Action DC 10 Medicine check removes spine; otherwise fades after 1 minute.',
      { type: 'rounds', rounds: 10 },
      'enemy',
      true,
    ),
    manual:
      'Select creatures in the 5-foot-wide line, up to 60 feet long. Apply impalement only to failed saves. Movement damage and Medicine removal are manual. Add 1d8 initial damage per slot above 4th.',
  }),
  'somanyrobots-so-many-spells:bone-weaving': reviewed('Bone Weaving', {
    manual:
      'Manual willing-target transformation: roll 3d8 once, apply unreducible necrotic damage and equal temporary HP, then choose one source-defined body change. The ordinary damage resolver would incorrectly apply resistances/immunities. Do not infer a chosen natural weapon, AC floor, doubled movement/jumping, or climb speed. No save.',
  }),
  'somanyrobots-so-many-spells:bony-maws': reviewed('Bony Maws', {
    manual:
      'Manual difficult-terrain hazard: no initial save/damage. Movement within the 60-foot square causes 4d6 piercing per 5 feet; starting there separately forces Strength save against 4d6 piercing and Restrained until next turn starts. Keep movement damage separate from the start-turn save.',
  }),
  'somanyrobots-so-many-spells:chaotic-vortex': reviewed('Chaotic Vortex', {
    manual:
      'Manual moving random-effect hazard: entry/turn-start Dexterity saves precede a d8 table selecting damage type, dice, and condition; result 8 creates two other results. No initial save. Resolve random 10-foot drift, carried creatures, conditions, and delayed acid from the source; never assign one fixed damage type to every result.',
  }),
  'somanyrobots-so-many-spells:cinder-cloud': reviewed('Cinder Cloud', {
    manual:
      'Manual cloud: no initial save/damage. At turn start, Constitution save against 5d6 fire and Blinded until next turn starts; success halves damage and avoids blindness. Track heavy obscuration, wind dispersal, and higher-slot radius manually.',
  }),
  'somanyrobots-so-many-spells:cloak-of-wasps': reviewed('Cloak of Wasps', {
    effect: ruleReminder(
      'Cloak of Wasps',
      'Half cover against ranged attacks only. On melee hit, retaliate with 1d4 piercing + 1d4 poison; ends after two retaliations at base slot.',
      { type: 'rounds', rounds: 100 },
      'ally',
    ),
    manual:
      'Choose one visible creature. Do not grant global AC: cover applies only to ranged attacks. Resolve later retaliation and count manually; one extra retaliation per slot above 1st. Creation does not deal damage.',
  }),
  'somanyrobots-so-many-spells:conjure-poltergeist': reviewed('Conjure Poltergeist', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '2d8', type: 'bludgeoning' }],
      save: { ability: 'dex', onSave: 'negates' },
    },
    manual:
      'Before selecting a target, randomly choose a creature within 60 feet other than caster. Bonus-action influence requires a d20: only an odd result permits choice. Initial fling resolves here; later start-turn flings are manual. Track spirit AC 10, 1 HP, invisibility, immunity to damage originating outside the Ethereal Plane, and 30-foot tether. Spirit persists even if target saves.',
  }),
  'somanyrobots-so-many-spells:conjure-weapon': reviewed('Conjure Weapon', {
    manual:
      'Manual created weapon: choose weapon properties and mark it magical; ammunition weapons may create up to five pieces of ammunition. No initial attack/damage/save. Previously conjured weapon/ammunition disappears when recast; lasts 1 hour.',
  }),
  'somanyrobots-so-many-spells:corpselight': reviewed('Corpselight', {
    manual:
      'Manual light field: no initial save. Living creatures starting there make Charisma saves against half-healing until next turn starts; undead starting there gain temporary HP equal to caster’s spellcasting modifier. Track lighting overrides and higher-slot exemptions separately. Do not roll a damage save or infer the modifier from DC.',
  }),
  'somanyrobots-so-many-spells:corrosion': reviewed('Corrosion', {
    manual:
      'Manual object cantrip: choose one printed decay effect on eligible nonmagical object worth at most 100 gp. Choice may affect next damage, next attack, next destruction check, value, or spoilage; never all at once. Track one-minute uses, 24-hour retarget restriction, and Mending reversal within 1 hour. No initial save/attack.',
  }),
  'somanyrobots-so-many-spells:coruscating-flash': reviewed('Coruscating Flash', {
    mechanics: {
      damage: [{ formula: '2d6', type: 'radiant' }],
      save: { ability: 'con', onSave: 'half' },
    },
    effect: nextTurnCondition('Blinded', true),
    manual:
      'Select creatures within 15 feet of chosen point. Failure: Blinded until next turn ends. Success: manually give disadvantage on next attack before that turn ends. Creatures unable to see or immune to Blinded automatically save and suffer no disadvantage; mark those saves successful manually.',
  }),
  'somanyrobots-so-many-spells:creeping-shadow': reviewed('Creeping Shadow', {
    attackKind: 'melee',
    mechanics: { attackRoll: true, damage: [{ formula: '2d10', type: 'necrotic' }] },
    manual:
      'Choose enemy within 30 feet of the chosen darkness. Resolve melee spell attack and damage first. Only on hit, resolve a separate Wisdom save manually against Blinded until end of target’s next turn. Do not apply Blinded just because attack hits.',
  }),
  'somanyrobots-so-many-spells:crown-of-entropy': reviewed('Crown of Entropy', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '6d8', type: 'necrotic' }],
      save: { ability: 'con', onSave: 'half' },
    },
    manual:
      'For initial wave, select crown wearer and chosen creatures within 30 feet of it. Later bonus-action waves are manual; crown persists even when every target saves. Creatures reduced to 0 HP by this damage crumble to dust. Track the 10-minute limit.',
  }),
  'somanyrobots-so-many-spells:crystal-blossom': reviewed('Crystal Blossom', {
    mechanics: {
      damage: [{ formula: '4d8', type: 'cold' }],
      save: { ability: 'con', onSave: 'negates' },
    },
    manual:
      'Initial appearance only: select creatures within 10 feet for 4d8 cold. At caster’s next turn start, a separate 30-foot bloom forces Constitution saves against 8d8 cold; no half damage on success. Track flower AC equal to caster DC, half caster maximum HP, listed resistances, and destruction cancelling bloom. Do not combine both blasts.',
  }),
  'somanyrobots-so-many-spells:cursed-coinage': reviewed('Cursed Coinage', {
    manual:
      'Manual random curse: roll d20 per chosen target, not a saving throw. Legendary Resistance may force result 20. Results 1–10 curse attack/save rolls with the same d6 subtraction and twice that d6 as necrotic damage; results 11–20 are harmless. Locating/discarding coin costs an action. Do not substitute a conventional save or roll separate d6s for linked penalty/damage.',
  }),
  'somanyrobots-so-many-spells:deadly-light': reviewed('Deadly Light', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: ruleReminder(
      'Deadly Light',
      'Reduce current and maximum HP by 9d4 and add 1 exhaustion level; reductions end after long rest. Initial failures glow and cannot benefit from invisibility until next turn ends.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'Select creatures in the initial 30-foot sphere. On failure, roll 9d4 and reduce both HP values directly, not as typed damage; apply exhaustion manually. Later ending turns in the sphere or emitted light repeats effects but never grants a new glow. Light lasts until end of caster’s next turn; HP reductions last through rest.',
  }),
  'somanyrobots-so-many-spells:death-hex': reviewed('Death Hex', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: ruleReminder(
      'Death Hex',
      'Reduce current/max HP by 50 initially, then halve both every 24 hours; death when max HP falls below 10, no revival. Source-defined curse removal and HP recovery.',
      { type: 'manual' },
    ),
    manual:
      'On failure, reduce current and maximum HP manually; this is not force/necrotic damage. Track daily halving, death threshold, Wish/caster death/dismissal/recast termination, and long-rest or Greater Restoration recovery from source. No additional daily saving throw.',
  }),
  'somanyrobots-so-many-spells:deathgrip': reviewed('Deathgrip', {
    mechanics: { attackRoll: true },
    effect: ruleReminder(
      'Deathgrip',
      'At start of each turn: 1d6 necrotic. Speaking/verbal casting requires Constitution save; failure prevents it until turn ends. At 0 HP begins suffocating. Action Strength (Athletics) against caster DC removes hand.',
      { type: 'rounds', rounds: 10 },
    ),
    manual:
      'Choose a target with suitable neck biology that needs to breathe; otherwise attack automatically misses. Initial ranged spell attack deals no damage. Apply hand only on hit; later damage, speaking/casting saves, suffocation, and action Athletics removal are manual. Remove reminder on escape.',
  }),
  'somanyrobots-so-many-spells:deathly-chill': reviewed('Deathly Chill', {
    manual:
      'Manual moving fog: no initial save/damage. Start-turn/first entry Constitution saves cause 2d8 cold and disadvantage on attacks/checks until end of next turn on failure. No half damage is specified. Track light obscuration, bonus-action movement, and wind dispersal manually; do not apply an indefinite penalty.',
  }),
  'somanyrobots-so-many-spells:deepen-shadows': reviewed('Deepen Shadows', {
    manual:
      'Manual light/senses manipulation: choose one or two printed changes to the existing area. Muffling/faded smell gives disadvantage only to non-sight attempts to perceive within it, not all checks. Track size, ordinary/magical darkness, and caster dismissal; no initial save.',
  }),
  'somanyrobots-so-many-spells:detect-treasure': reviewed('Detect Treasure', {
    manual:
      'Manual detection: sense eligible stores of value within 30 feet, with value-dependent gleam, invisibility exclusion, and listed barriers. No initial save or generic Perception advantage. Ritual casting increases material cost to 5 gp; track it manually.',
  }),
  'somanyrobots-so-many-spells:devil-s-dagger': reviewed("Devil's Dagger", {
    mechanics: {
      attackRoll: true,
      damage: [
        { formula: '2d4', type: 'fire' },
        { formula: '1d4', type: 'piercing' },
      ],
    },
    effect: ruleReminder(
      "Devil's Dagger",
      'Embedded: first attack each target turn rolls one d4, subtracts it from attack, and takes the same amount as fire damage. Action by creature within 5 feet removes dagger.',
      { type: 'rounds', rounds: 10 },
    ),
    manual:
      'Apply dagger only on a hit; it disappears on miss or removal. Resolve the linked d4 penalty/fire damage once per target turn manually, using one die result for both. Add 2d4 initial fire per slot above 1st; piercing and later d4 do not scale.',
  }),
}
