// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import { advantageAgainst, condition, reminder } from '../effects.ts'
import { nextTurnCondition, ruleReminder } from './reviewedProfile.ts'
import { reviewed } from './soManySpells.ts'

export const SO_MANY_SPELLS_LATER: Record<string, ReviewedSpellCasting> = {
  'somanyrobots-so-many-spells:rending-gears': reviewed('Rending Gears', {
    mechanics: {
      damage: [{ formula: '5d8', type: 'bludgeoning' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    manual:
      'Choose creatures in union of three 5-foot-wide, 60-foot-long ground lines; each saves once even if multiple gears cross it. Manually add Prone to failed Large-or-smaller targets only. +1 gear per two slots above 3rd starting 5th; damage stays 5d8.',
  }),
  'somanyrobots-so-many-spells:revenant-s-fortitude': reviewed("Revenant's Fortitude", {
    effect: ruleReminder(
      "Revenant's Fortitude",
      'Turn start: 10 temporary HP. Necrotic/psychic resistance; advantage only on saves avoiding Charmed/Frightened/Paralyzed. On death Charisma save: failure returns as revenant in 24 hours if body intact.',
      { type: 'manual' },
      'ally',
    ),
    manual:
      'Choose one willing touched creature. No initial save/damage. Apply defenses and later temporary HP manually. Keep conditional save advantage in prose; do not grant all-save advantage. Track 1-hour concentration and revenant death trigger.',
  }),
  'somanyrobots-so-many-spells:reviving-call': reviewed('Reviving Call', {
    manual:
      'Manual temporary revival of visible creature dead within last minute: 1 HP, no old-age revival or missing-part restoration. Target damage instead reduces caster HP by half. Full 1-minute concentration restores life with optional HP transfer. Early end kills target again and forces caster DC 15 Constitution save or 0 HP. No initial save/damage/healing roll; do not bypass damage-transfer or concentration-break consequences.',
  }),
  'somanyrobots-so-many-spells:river-of-souls': reviewed('River of Souls', {
    manual:
      'Manual 20-foot-wide river between visible points at least 60 feet apart. No initial save/damage. Start-turn/entry on own turn Constitution save: 8d8 necrotic, Prone, swept 30 feet; half/no effects on success. Swept over downstream rift: separate Wisdom save against 1-round Stunned. Track flow geometry and 10-minute concentration.',
  }),
  'somanyrobots-so-many-spells:rotting-sands': reviewed('Rotting Sands', {
    manual:
      'Manual 30-foot-radius difficult-terrain, lightly obscured sandstorm. No initial save/damage. Own-turn movement in area: 1d6 necrotic per 5 feet. Turn end Constitution failure adds exhaustion only if current levels <=3. Track movement, exhaustion threshold, and 1-hour concentration; no generic save damage or initial exhaustion.',
  }),
  'somanyrobots-so-many-spells:savage-rush': reviewed('Savage Rush', {
    effect: ruleReminder(
      'Savage Rush',
      'May immediately move up to speed toward nearest enemy. On next turn first attack has advantage and +1d6 damage on hit.',
      { type: 'manual' },
      'ally',
      true,
    ),
    manual:
      'Select up to three visible creatures, +1 per two slots above 2nd starting 4th. Resolve movement and next-turn first attack manually, then remove reminder; no initial attack or blanket advantage to all attacks. Do not expire at start of next turn before benefit is used.',
  }),
  'somanyrobots-so-many-spells:scintillating-spray': reviewed('Scintillating Spray', {
    manual:
      'Manual one/two adjacent targets within 5 feet: Dexterity save negates. Each failure rolls its own d6 for base 1d6 damage type and extra table effect (delayed acid, cold slowdown, fire, no reactions, Poisoned, or choose). Base scales to 2d6/3d6/4d6 at character levels 5/11/17; table effects do not scale. Never choose one fixed damage type or combine later acid with initial damage.',
  }),
  'somanyrobots-so-many-spells:screaming-skull': reviewed('Screaming Skull', {
    manual:
      'Manual geometry branches: 60-foot-long direct path 5 feet wide vs 15-foot-wide fire trail. Dexterity save: path failure 5d6 bludgeoning +5d6 fire and Frightened until target next turn ends; trail failure fire only. Success half applicable damage/no fear. Shared resolver cannot assign different damage per target in one cast. +10 feet length per slot above 5th; printed damage increases 1d6 per two slots above 6th, do not normalize threshold.',
  }),
  'somanyrobots-so-many-spells:searing-hammer': reviewed('Searing Hammer', {
    manual:
      'Manual two-zone saves at visible point: within 15 feet Strength, failure 4d8 bludgeoning +4d8 fire and Prone, success half. Between 15 and 30 feet Constitution negates same fire roll only. Shared resolver cannot mix abilities/outcomes per target; use same fire roll for outer ring, not combined or freshly rolled fire.',
  }),
  'somanyrobots-so-many-spells:sever-soul': reviewed('Sever Soul', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: ruleReminder(
      'Sever Soul',
      'Initially -40 max HP, -2 attacks/checks/spell and ability DCs. End-turn Charisma failure: -20 max HP and penalty worsens by 2. Any successful save ends spell.',
      { type: 'rounds', rounds: 10 },
    ),
    manual:
      'Choose touched creature. No typed damage or initial current-HP reduction is printed. Apply changing penalties and maximum HP manually; at max HP 0 dies/dust, ghost after 24 hours. Max HP recovers 40 per long rest after spell; recovery outlasts concentration. Remove curse reminder on escape and track recovery separately.',
  }),
  'somanyrobots-so-many-spells:shackle-of-flame': reviewed('Shackle of Flame', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: ruleReminder(
      'Shackle of Flame',
      'Shackled: turn-start 6d6 fire. First movement attempt on own turn: Strength failure adds 4d6 damage and speed 0 until next turn starts; success ends spell.',
      { type: 'rounds', rounds: 10 },
    ),
    manual:
      'Choose one creature in range. No initial damage or immediate Restrained condition. Resolve later turn-start damage and movement save manually. Both damage instances +1d6 per two slots above 4th. Clear reminder on successful movement save.',
  }),
  'somanyrobots-so-many-spells:shademail': reviewed('Shademail', {
    effect: ruleReminder(
      'Shademail',
      'Gain 1d8+caster modifier temporary HP. While held: advantage on Stealth only to hide in dim light/darkness. Melee attack depleting them: attacker Wisdom save or Blinded until next turn ends.',
      { type: 'manual' },
      'ally',
    ),
    manual:
      'Choose touched creature, roll/set temporary HP manually; caster modifier is not inferred from DC. +1d8 temporary HP per slot above 2nd. No initial save or blanket Stealth advantage. Track temporary HP depletion and 1-hour limit; retaliatory save is later.',
  }),
  'somanyrobots-so-many-spells:shaderazor': reviewed('Shaderazor', {
    mechanics: {
      damage: [{ formula: '3d8', type: 'necrotic' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: {
      summary: 'Blinded until start of target next turn',
      targeting: 'enemy',
      multi: true,
      build: ({ source, target }) => [
        condition('Blinded', {
          source: target?.combatantId ?? source,
          duration: target ? { type: 'untilSourceTurn', when: 'startOfTurn' } : { type: 'manual' },
        }),
      ],
    },
    manual:
      'Select three creatures in 30-foot cone. Apply Blinded only on failure; ends at target next turn start, not end. No damage on later turns.',
  }),
  'somanyrobots-so-many-spells:shadow-dagger': reviewed('Shadow Dagger', {
    mechanics: { attackRoll: true, damage: [{ formula: '3d8', type: 'necrotic' }] },
    manual:
      'Choose creature within range. Hit OR miss leaves 5-foot-wide darkness trail caster-to-target until end of caster next turn. Track trail and caster-only ignoring difficult terrain while inside manually; do not gate trail on hit or grant general terrain immunity.',
  }),
  'somanyrobots-so-many-spells:shadow-hunger': reviewed('Shadow Hunger', {
    mechanics: {
      damage: [{ formula: '10d8', type: 'necrotic' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: {
      summary: 'Blinded until end of caster next turn',
      targeting: 'enemy',
      build: ({ source }) => [
        condition('Blinded', { source, duration: { type: 'untilSourceTurn', when: 'endOfTurn' } }),
      ],
    },
    manual:
      'Choose one creature within 10 feet. Failure blinds on caster-next-turn timing; success half damage and no blindness. Do not use target-turn expiry.',
  }),
  'somanyrobots-so-many-spells:shadow-phase': reviewed('Shadow Phase', {
    effect: ruleReminder(
      'Shadow Phase',
      'Other creatures see light within 10 feet as one step darker. Later action in darkness grants invisibility until attack/cast. Aware observer action Perception against caster DC can ignore all spell effects.',
      { type: 'manual' },
      'self',
    ),
    manual:
      'No initial Invisible condition. Track lighting, later action, visibility exceptions per observer, and 1-hour concentration manually. Do not grant blanket incoming disadvantage or initial invisibility.',
  }),
  'somanyrobots-so-many-spells:shadow-puppets': reviewed('Shadow Puppets', {
    manual:
      'Manual shadow cantrip: choose one 5-foot light change, looping animation, or temporary shadow transfer. Obviously illusory; no save/condition or Perception modifier. Up to three 1-minute effects, action dismissal.',
  }),
  'somanyrobots-so-many-spells:shape-metal': reviewed('Shape Metal', {
    manual:
      'Manual Tiny/Small metal object: choose one weight/appearance/form/malleability/next blade damage/hardness option. No unwilling worn/wielded target. Conditional crafting advantage only while effect held; no general ability advantage or creature AC bonus. Object hardness HP uses caster level manually. Recast or 1 minute restores normal.',
  }),
  'somanyrobots-so-many-spells:shard-rain': reviewed('Shard Rain', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '9d8', type: 'piercing' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    manual:
      'Select creatures in 30-foot-radius, 100-foot-high column. Manually add Restrained only to Large-or-smaller targets failing by 5+. Action Athletics against caster DC within 5 feet frees pinned target. Track 1-minute concentration; no repeated damage trigger is printed, do not invent one.',
  }),
  'somanyrobots-so-many-spells:shatter-skeleton': reviewed('Shatter Skeleton', {
    mechanics: {
      damage: [{ formula: '12d8', type: 'necrotic' }],
      save: { ability: 'con', onSave: 'half' },
    },
    manual:
      'Choose one visible creature. Only failed-save damage leaving it below half max HP breaks bones: speed 10 feet, disadvantage on Strength/Dexterity/Constitution saves. Apply consequences manually after actual damage, not every failure. Printed repair requires healing spell restoring 60+ HP or Regenerate; track separately from 10-minute concentration, do not invent repeat saves.',
  }),
  'somanyrobots-so-many-spells:shifting-blade': reviewed('Shifting Blade', {
    effect: ruleReminder(
      'Shifting Blade',
      'Touched weapon adds 1d6 of chosen table type; add that same die to type index, subtract 8 if 9+, for next hit type.',
      { type: 'manual' },
      'ally',
    ),
    manual:
      'Choose initial damage type and track changing eight-type index manually using actual bonus die. No initial attack/damage. Do not grant one fixed damage type for whole hour or roll a separate die for index changes.',
  }),
  'somanyrobots-so-many-spells:silver-wind': reviewed('Silver Wind', {
    mechanics: {
      damage: [{ formula: '6d8', type: 'piercing' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    manual:
      'Select creatures in 5-foot-wide, 30-foot-long line starting at chosen point. Manually set disadvantage only for shapechangers/silver-susceptible; those failures cannot change form until next turn ends. +1d8 per slot above 4th; no blanket disadvantage on other saves.',
  }),
  'somanyrobots-so-many-spells:sirocco': reviewed('Sirocco', {
    mechanics: {
      damage: [{ formula: '3d6', type: 'fire' }],
      save: { ability: 'str', onSave: 'half' },
    },
    manual:
      'Select creatures in 15-foot-wide, 60-foot-long line from chosen visible point. Failures pushed 10 feet along wind manually. Per slot above 2nd: +1d6 fire and +5 feet push; success no push.',
  }),
  'somanyrobots-so-many-spells:skeletal-shield': reviewed('Skeletal Shield', {
    effect: ruleReminder(
      'Skeletal Shield',
      'Empty hand becomes shield (+2 AC, proficient), unusable for other purposes. Critical hit or >20 bludgeoning in one instance shatters it: 10 necrotic; hand remains unusable through duration.',
      { type: 'rounds', rounds: 100 },
      'self',
    ),
    manual:
      'Set shield AC manually; do not stack with an existing shield. Shattering removes shield bonus but not hand restriction. Slots 4+ give magic bonus +1 per two slots above 2nd. No initial damage/save; track 10 minutes.',
  }),
  'somanyrobots-so-many-spells:sonic-blast': reviewed('Sonic Blast', {
    mechanics: {
      attackRoll: true,
      damage: [{ formula: '1d8', type: 'thunder' }],
      scaling: [
        { level: 5, by: 'character', damage: [{ formula: '2d8', type: 'thunder' }] },
        { level: 11, by: 'character', damage: [{ formula: '3d8', type: 'thunder' }] },
        { level: 17, by: 'character', damage: [{ formula: '4d8', type: 'thunder' }] },
      ],
    },
    effect: nextTurnCondition('Deafened'),
    manual:
      'Choose one target. Deafened only on hit, until end of target next turn. Select character-level variant where available; creature casting stays base unless GM adjusts. No save.',
  }),
  'somanyrobots-so-many-spells:sonorous-toll': reviewed('Sonorous Toll', {
    persistsAfterSave: true,
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: {
      summary: 'Charmed; cannot willingly leave area; conditional attack disadvantage',
      targeting: 'enemy',
      multi: true,
      build: ({ source }) => [
        condition('Charmed', { source, duration: { type: 'rounds', rounds: 10 } }),
        reminder(
          'Sonorous Toll',
          'Cannot willingly leave area; attacks against creatures outside area have disadvantage only. End-turn Wisdom escape save.',
          { source, duration: { type: 'rounds', rounds: 10 } },
        ),
      ],
    },
    manual:
      'Select initial creatures in 20-foot sphere. No initial damage or blanket attack disadvantage. Later end-turn entry/escape saves manual. Bonus-action crescendo targets only spell-charmed creatures: Wisdom save, 3d6 psychic/half, then spell ends; +1d6 per slot above 3rd. Remove bundle on escape.',
  }),
  'somanyrobots-so-many-spells:soul-leech': reviewed('Soul Leech', {
    mechanics: {
      attackRoll: true,
      damage: [{ formula: '1d8', type: 'necrotic' }],
      scaling: [
        { level: 6, by: 'slot', damage: [{ formula: '2d8', type: 'necrotic' }] },
        { level: 8, by: 'slot', damage: [{ formula: '3d8', type: 'necrotic' }] },
      ],
    },
    manual:
      'Choose one visible creature. On hit manually grant same amount as temporary HP to chosen creature within 30 feet of caster. Resolve subsequent bonus-action leeches manually; keep original target. Distance >120 feet ends thread. +1d8 per two slots above 4th; no initial save.',
  }),
  'somanyrobots-so-many-spells:spirit-tether': reviewed('Spirit Tether', {
    effect: ruleReminder(
      'Spirit Tether',
      'Later bonus action transfers 2d8 HP either direction. Receiver next attack has advantage, donor disadvantage, before end of next turn. At either 0 HP, other reaction transfers 2d8 and ends spell.',
      { type: 'rounds', rounds: 100 },
      'ally',
    ),
    manual:
      'Choose one willing visible creature. No initial HP transfer/save/damage. Resolve later paired HP changes and single-attack benefits manually, not all attacks. Do not treat HP loss as resistible typed damage.',
  }),
  'somanyrobots-so-many-spells:spiritcraft': reviewed('Spiritcraft', {
    manual:
      'Manual minor spirit effect: choose breeze, small-object levitation, sound, illusory horrifying form, or music. No Frightened/save or generic advantage. Up to three 1-minute effects, action dismissal; night/full moon increases range to 60 feet.',
  }),
  'somanyrobots-so-many-spells:spreading-toxin': reviewed('Spreading Toxin', {
    mechanics: {
      damage: [{ formula: '4d12', type: 'poison' }],
      save: { ability: 'con', onSave: 'half' },
    },
    effect: {
      summary: 'Poisoned; end-turn Constitution escape saves',
      targeting: 'enemy',
      build: ({ source }) => [
        condition('Poisoned', { source, duration: { type: 'rounds', rounds: 100 } }),
        reminder(
          'Spreading Toxin',
          'End-turn Constitution save ends Poisoned. Later caster bonus action spreads to unpoisoned creature within 30 feet of affected target; damage -1d12 per spread.',
          { source, duration: { type: 'rounds', rounds: 100 } },
        ),
      ],
    },
    manual:
      'Choose one visible creature. Later spread saves/damage and declining dice are manual. Remove bundle on escape and end concentration when no spell-poisoned targets remain. Initial successful save half damage/no Poisoned; do not spread automatically.',
  }),
  'somanyrobots-so-many-spells:starburst': reviewed('Starburst', {
    mechanics: {
      damage: [{ formula: '3d6', type: 'radiant' }],
      save: { ability: 'dex', onSave: 'negates' },
    },
    manual:
      'Select initial creatures within 10-foot light. At start of caster next turn, radius becomes 20 feet and repeats same save/3d6 radiant manually, then disappears. Do not use 20-foot radius on initial cast or combine both blasts.',
  }),
  'somanyrobots-so-many-spells:starfire-beam': reviewed('Starfire Beam', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '6d8', type: 'radiant' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: {
      summary: 'Incoming attack advantage until start of caster next turn',
      targeting: 'enemy',
      build: ({ source }) => [
        advantageAgainst('Starfire Beam', {
          source,
          duration: { type: 'untilSourceTurn', when: 'startOfTurn' },
        }),
      ],
    },
    manual:
      'Choose one initial visible creature. Advantage only on failure, expires at caster next turn start. Beam persists despite initial success; later bonus-action move up to 30 feet, pass-over/end-turn saves and damage manual. Cylinder 100 feet high, 5-foot space; track 1-minute concentration independently of short aura.',
  }),
  'somanyrobots-so-many-spells:starlight': reviewed('Starlight', {
    manual:
      'Manual 60-foot dim-light radius at chosen visible point. Once per turn when a creature in light deals radiant/force damage, it may add caster spellcasting modifier. No initial attack/save/damage or blanket bonus to all damage. Modifier not inferred from DC; track eligibility and 1-minute concentration.',
  }),
  'somanyrobots-so-many-spells:starlight-sword': reviewed('Starlight Sword', {
    manual:
      'Manual finesse longsword creation, spellcasting modifier can replace Strength; later attacks 4d8 radiant. Once-turn hit may grant incoming attack advantage until caster next turn starts. Later action throw: 5-by-60-foot Dexterity-negates line, 4d8 and starlight until caster next turn ends, then spell ends. No initial attack; do not confuse throw and hit timing or apply a blanket once-turn modifier.',
  }),
  'somanyrobots-so-many-spells:steal-shadow': reviewed('Steal Shadow', {
    mechanics: {
      damage: [{ formula: '5d6', type: 'necrotic' }],
      save: { ability: 'cha', onSave: 'half' },
    },
    effect: ruleReminder(
      'Steal Shadow',
      'Shadow stolen: target Stealth checks at disadvantage; caster may bonus-action Hide only in darkness/dim light.',
      { type: 'rounds', rounds: 10 },
    ),
    manual:
      'Choose one illuminated visible creature. Apply reminder only on failure. Resolve Stealth-specific disadvantage and conditional Hide manually; no blanket Dexterity/check disadvantage. +1d6 damage per slot above 2nd.',
  }),
}
