// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { ConditionName } from '../../schema/effect.ts'
import type { ReviewedSpellCasting } from '../reviewedSpells.ts'
import type { SpellEffectDef } from './shared.ts'
import { condition, flatBonus, modifierEffect, reminder } from '../effects.ts'
import { reviewed } from './tomeOfHeroes.ts'
import { ruleReminder } from './reviewedProfile.ts'

/** Apply the printed condition and preserve its manually resolved escape rules. */
function lingeringCondition(name: string, state: ConditionName, note: string): SpellEffectDef {
  return {
    summary: `${state}; ${note}`,
    targeting: 'enemy',
    multi: true,
    build: ({ source }) => [
      condition(state, { source, duration: { type: 'rounds', rounds: 10 } }),
      reminder(name, note, { source, duration: { type: 'rounds', rounds: 10 } }),
    ],
  }
}

/** Mark a permanent-until-removed consequence of the initial save. */
function prone(): SpellEffectDef {
  return {
    summary: 'Knocked prone',
    targeting: 'enemy',
    multi: true,
    build: ({ source }) => [{ ...condition('Prone', { source }), concentration: false }],
  }
}

export const TOME_OF_HEROES_REMAINDER: Record<string, ReviewedSpellCasting> = {
  'kobold-press-toh:butterfly-effect': reviewed('Butterfly Effect', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: lingeringCondition(
      'Butterfly Effect',
      'Charmed',
      'Cannot take reactions. Roll d10 behavior each turn using the source table. Charisma escape save at end of each turn and whenever damaged.',
    ),
    manual:
      'Choose a visible target. Resolve the d10 behavior table, random movement/attacks, and escape saves manually. Remove the bundle on a successful escape save. Add one target per slot above 2nd, within 30 feet of each other.',
  }),
  'kobold-press-toh:calm-beasts': reviewed('Calm Beasts', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: ruleReminder(
      'Calm Beasts',
      'Choose suppression of charm/fear or hostility. Suppressed effects resume when this spell ends if their original durations remain. Indifference ends on harm to the beast or witnessed harm to its allies.',
      { type: 'rounds', rounds: 10 },
      'enemy',
      true,
    ),
    manual:
      'Select beasts only in the 20-foot-radius sphere. Choose the suppression effect for each failed target manually. Do not delete suppressed conditions permanently. No repeated save is granted.',
  }),
  'kobold-press-toh:conjure-spectral-allies': reviewed('Conjure Spectral Allies', {
    mechanics: {
      damage: [{ formula: '6d10', type: 'necrotic' }],
      save: { ability: 'wis', onSave: 'half' },
    },
    effect: lingeringCondition(
      'Conjure Spectral Allies',
      'Frightened',
      'Wisdom escape save at end of each turn ends the spell on this creature.',
    ),
    manual:
      'Base slot: 6d10. Select creatures in the 30-foot-radius sphere. Apply Frightened only to failed saves and remove the bundle on a successful manual escape save. Add 1d10 per slot above 7th.',
  }),
  'kobold-press-toh:divine-retribution': reviewed('Divine Retribution', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: lingeringCondition(
      'Divine Retribution',
      'Stunned',
      'Constitution escape save at end of each turn ends Stunned.',
    ),
    manual:
      'First apply radiant damage manually: 1d8 plus damage from the triggering attack, plus 1d8 if the attacker is a fiend or undead. This damage occurs regardless of the subsequent Constitution save. Only the Stunned condition is resolved by this save. Add 1d8 per slot above 1st. Resolve escape saves manually.',
  }),
  'kobold-press-toh:emerald-eyes': reviewed('Emerald Eyes', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Emerald Eyes',
      'Must attack the nearest creature other than itself or caster. Special Wisdom saves when no reachable target and whenever damaged; consult the source for temporary freedom versus ending the spell.',
      { type: 'rounds', rounds: 10 },
      'enemy',
      true,
    ),
    manual:
      'Choose visible targets; one additional target per slot above 3rd, within 30 feet of each other. Resolve forced actions and special escape saves manually. The first successful no-target save permits free action for that turn; it does not end the spell.',
  }),
  'kobold-press-toh:eruption': reviewed('Eruption', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '8d6', type: 'bludgeoning' }],
      save: { ability: 'str', onSave: 'half' },
    },
    effect: prone(),
    manual:
      'Initial eruption only: select creatures within 30 feet of the cinder cone. Later rounds add smoke, lava, burning, expanding areas, and separately targeted rocks. Resolve every later stage from the source manually; never repeat the initial 8d6 for those stages. Smoke/lava persist 1 minute after the spell ends.',
  }),
  'kobold-press-toh:glare': reviewed('Glare', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Glare',
      'No actions on next turn; no actions on next two turns if the save failed by 5 or more. Not the Incapacitated condition.',
      { type: 'manual' },
      'enemy',
      true,
    ),
    manual:
      'Select up to two visible creatures. Check each save margin manually and remove the reminder after the correct number of turns. Do not remove reactions or movement: the spell restricts actions only.',
  }),
  'kobold-press-toh:immolating-gibbet': reviewed('Immolating Gibbet', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: lingeringCondition(
      'Immolating Gibbet',
      'Restrained',
      'At start of turn: Constitution save, 7d6 fire on failure, half on success. At end of turn: Dexterity escape save. Action: Intelligence (Arcana) escape check against caster DC.',
    ),
    manual:
      'Select up to three visible creatures. Pull failed targets into the air per the printed wording; the printed distance lacks a unit. No fire damage occurs on the initial cast. Resolve later saves, Arcana actions, and falling damage manually. Escape ends the effect on that creature.',
  }),
  'kobold-press-toh:inexorable-summons': reviewed('Inexorable Summons', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    manual:
      'Only an unwilling target makes the Wisdom save. Move a willing or failed target to a visible, unoccupied ground/floor space within 5 feet of the caster. Never teleport into dangerous terrain. Movement is manual.',
  }),
  'kobold-press-toh:jarring-growl': reviewed('Jarring Growl', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Jarring Growl',
      'Caster has advantage on attacks against this creature until the end of the caster’s turn.',
      { type: 'untilSourceTurn', when: 'endOfTurn' },
      'enemy',
      true,
    ),
    manual:
      'Select creatures within 5 feet for Wisdom saves. Grant attack advantage only to this caster against failed targets, not to all attackers. Independently, caster has advantage on Charisma (Intimidation) checks before the beginning of the caster’s next turn. Resolve these scoped rolls manually.',
  }),
  'kobold-press-toh:lightless-torch': reviewed('Lightless Torch', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    manual:
      'The Dexterity save applies only if the object is held or worn by a hostile creature; select that bearer only. Otherwise no save is needed. Manage the object’s 30-foot shadow miasma and darkvision interactions manually. Covering the object blocks it; overlapping Darkness can dispel it. Add 2 hours per slot above 1st.',
  }),
  'kobold-press-toh:long-game': reviewed('Long Game', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: ruleReminder(
      'Long Game',
      'Latent effect for 7 days. Caster may use an action on the same plane to deal 5d8 psychic plus 1d8 per elapsed 24 hours, capped at 12d8, once.',
      { type: 'manual' },
    ),
    manual:
      'Converse during casting. No damage occurs on the initial save. Resolve the later action, elapsed days, and psychic damage manually. Greater Restoration or Wish ends the spell; caster knows this only on the same plane. A successful initial save alerts the target to the magic.',
  }),
  'kobold-press-toh:magma-spray': reviewed('Magma Spray', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '3d8', type: 'fire' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    manual:
      'Initial fountain only: select the creature in the chosen 5-foot-diameter space. Later entry on its turn or ending a turn there triggers 3d8 fire with a Dexterity save for half, at most once per turn; resolve those triggers manually. Add 1d8 per slot above 2nd. A creature killed by the spell becomes ash.',
  }),
  'kobold-press-toh:mass-faerie-fire': reviewed('Mass Faerie Fire', {
    mechanics: { save: { ability: 'dex', onSave: 'negates' } },
    effect: ruleReminder(
      'Mass Faerie Fire',
      'Outlined in light; sheds dim light 10 feet; cannot benefit from invisibility. Attackers who can see this target have advantage.',
      { type: 'rounds', rounds: 10 },
      'enemy',
      true,
    ),
    manual:
      'Select creatures in up to three chosen 20-foot cubes, once each. Objects are outlined automatically. Resolve sight-dependent attack advantage manually; do not give advantage to attackers who cannot see the target.',
  }),
  'kobold-press-toh:oathbound-implement': reviewed('Oathbound Implement', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      'Oathbound Implement',
      'Bound to the chosen weapon task. First weapon attack each turn toward the task has advantage; other weapon attacks have disadvantage and roll damage twice, taking lower total.',
      { type: 'manual' },
    ),
    manual:
      'Choose a visible creature that can understand the caster. Resolve task-dependent attacks manually. Completing the task, a suicidal task, caster dismissal, Remove Curse, Greater Restoration, or Wish ends the spell. Track the 10-day limit manually.',
  }),
  'kobold-press-toh:outmaneuver': reviewed('Outmaneuver', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: {
      summary: 'Speed 0 until the end of its next turn',
      targeting: 'enemy',
      build: ({ source, target }) => [
        flatBonus('Outmaneuver', 'zero', {
          source: target?.combatantId ?? source,
          applies: 'speed',
          duration: target ? { type: 'untilSourceTurn', when: 'endOfTurn' } : { type: 'manual' },
        }),
      ],
    },
    manual:
      'Resolve the triggering ally opportunity attack first. On a failed Wisdom save, set target Speed to 0 through its next turn; caster may move up to their Speed toward it without opportunity attacks. Resolve caster movement manually.',
  }),
  'kobold-press-toh:power-word-fling': reviewed('Power Word Fling', {
    mechanics: { save: { ability: 'str', onSave: 'negates' } },
    effect: ruleReminder(
      'Power Word Fling',
      'Thrown on failed Strength save. Caster may use a bonus action on later turns to attempt another fling against this same creature.',
      { type: 'rounds', rounds: 10 },
    ),
    manual:
      'On failure, move target up to 15 feet vertically or horizontally. Apply 3d6 bludgeoning only on collision, falling damage only when applicable, and Prone only after a horizontal throw or completed fall. Collision with another creature requires a separate Strength save for that creature against Prone. Later flings and slot increases are manual.',
  }),
  'kobold-press-toh:reapers-knell': reviewed("Reaper's Knell", {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: ruleReminder(
      "Reaper's Knell",
      'Marked. If reduced to 0 HP or killed during the spell, heal caster or one visible ally in range for 2d8 plus spellcasting ability modifier.',
      { type: 'rounds', rounds: 10 },
      'enemy',
      true,
    ),
    manual:
      'Select creatures in the 20-foot-radius sphere. No damage or healing occurs on cast. Resolve later healing when a marked target falls to 0 HP or dies. Add 1d8 healing per slot above 4th.',
  }),
  'kobold-press-toh:shared-frenzy': reviewed('Shared Frenzy', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    effect: ruleReminder(
      'Shared Frenzy',
      'Bludgeoning/piercing/slashing resistance and advantage on attacks. At base slot, attacks against this creature also have advantage.',
      { type: 'rounds', rounds: 10 },
      'enemy',
      true,
    ),
    manual:
      'Select friendly creatures only; they may choose to fail. Resolve damage resistance and roll modifiers manually. At slot 4+, omit the incoming attack advantage. This is not a save against hostile creatures.',
  }),
  'kobold-press-toh:silvershout': reviewed('Silvershout', {
    mechanics: { save: { ability: 'con', onSave: 'negates' } },
    effect: ruleReminder(
      'Silvershout',
      'Weapon attacks against this creature count as silvered against nonsilvered nonmagical-attack resistance/immunity for 1 minute.',
      { type: 'rounds', rounds: 10 },
      'enemy',
      true,
    ),
    manual:
      'Select creatures in the 30-foot cone for Constitution saves. All creatures are dusted regardless of saves; the dust glows on source-defined shapechangers and can be removed as an action. Apply the silvered-attack reminder only to failed saves. Do not remove unrelated resistances.',
  }),
  'kobold-press-toh:smelting-blast': reviewed('Smelting Blast', {
    mechanics: { attackRoll: true, damage: [{ formula: '2d8', type: 'fire' }] },
    manual:
      'Initial attack and 2d8 fire only. After a hit, separately resolve a Constitution save; only failure coats the target in metal. Coated targets take 1d8 fire at start of each turn and may make Constitution escape saves at end of each turn, for up to 1 minute. Add 1d8 to both initial and later damage per slot above 2nd. Do not coat a missed target or one that succeeds on its save.',
  }),
  'kobold-press-toh:sneer': reviewed('Sneer', {
    mechanics: { save: { ability: 'cha', onSave: 'negates' } },
    manual:
      'On a failed Charisma save, roll and apply 2d4 plus the caster’s spellcasting ability modifier as psychic damage manually. The caster modifier is not inferred from save DC or attack bonus; no damage is rolled automatically.',
  }),
  'kobold-press-toh:steam-gout': reviewed('Steam Gout', {
    persistsAfterSave: true,
    mechanics: {
      damage: [{ formula: '2d8', type: 'fire' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: prone(),
    manual:
      'Initial gout only: select creatures in the 5-foot-radius cylinder and apply Prone only to failures. Later entry/start-of-turn saves cause Prone only, with no fire damage; resolve manually. Add 1d8 initial damage and one gout per slot above 3rd; overlapping gouts affect a creature only once.',
  }),
  'kobold-press-toh:sudden-stampede': reviewed('Sudden Stampede', {
    mechanics: {
      damage: [{ formula: '6d10', type: 'bludgeoning' }],
      save: { ability: 'dex', onSave: 'half' },
    },
    effect: prone(),
    manual:
      'Select creatures in the 10-foot-wide, 60-foot-long line. Apply Prone only to failed saves. The horses vanish after the charge; no summoned combatants remain.',
  }),
  'kobold-press-toh:war-horn': reviewed('War Horn', {
    mechanics: { save: { ability: 'wis', onSave: 'negates' } },
    effect: lingeringCondition(
      'War Horn',
      'Frightened',
      'Wisdom escape save at end of each turn ends Frightened on this creature.',
    ),
    manual:
      'Select up to three hostile creatures for saves, not friendly recipients. Separately give up to three friends 2d4 plus spellcasting ability modifier temporary HP (lasting 1 hour) and advantage on their next attack within 1 minute. Resolve those buffs and the foes’ escape saves manually.',
  }),
  'kobold-press-toh:bloodlust': reviewed('Bloodlust', {
    effect: {
      summary: 'Advantage on Strength checks; temporary HP and weapon damage tracked manually',
      targeting: 'ally',
      build: ({ source }) => [
        modifierEffect(
          {
            name: 'Bloodlust',
            mode: 'advantage',
            direction: 'outgoing',
            applies: 'abilityChecks',
            abilities: ['str'],
          },
          { source, duration: { type: 'rounds', rounds: 10 } },
        ),
        reminder(
          'Bloodlust',
          'Set 1d6 temporary HP; +1d6 weapon damage. When spell ends: 1 exhaustion level for 1 minute.',
          { source, duration: { type: 'rounds', rounds: 10 } },
        ),
      ],
    },
    manual:
      'Choose one willing creature. Set temporary HP and apply extra weapon damage manually; never add the extra damage to spell attacks. When the spell ends, apply its 1-minute exhaustion penalty manually.',
  }),
  'kobold-press-toh:dreamwine': reviewed('Dreamwine', {
    effect: {
      summary: 'Advantage on Charisma checks and saves; see invisible and Ethereal creatures',
      targeting: 'ally',
      multi: true,
      build: ({ source }) => [
        modifierEffect(
          {
            name: 'Dreamwine',
            mode: 'advantage',
            direction: 'outgoing',
            applies: 'abilityChecks',
            abilities: ['cha'],
          },
          { source, duration: { type: 'manual' } },
        ),
        modifierEffect(
          {
            name: 'Dreamwine',
            mode: 'advantage',
            direction: 'outgoing',
            applies: 'savingThrows',
            abilities: ['cha'],
          },
          { source, duration: { type: 'manual' } },
        ),
        reminder(
          'Dreamwine',
          'See invisible creatures/objects and into Ethereal plane as ghostly/translucent.',
          { source, duration: { type: 'manual' } },
        ),
      ],
    },
    manual:
      'Select only the caster and up to seven others who drank during casting. Track the 1-hour duration manually. Sight benefits do not grant general attack advantage.',
  }),
  'kobold-press-toh:wild-hunt': reviewed('Wild Hunt', {
    effect: {
      summary: '+1 AC; hunt benefits and ending exhaustion tracked manually',
      targeting: 'ally',
      multi: true,
      build: ({ source }) => [
        flatBonus('Wild Hunt', 1, { source, applies: 'ac', duration: { type: 'manual' } }),
        reminder(
          'Wild Hunt',
          'Immune to Charmed/Frightened; extra damage die on first weapon/spell attack each turn; choose advantage on Strength or Dexterity saves. On ending: 1 exhaustion level.',
          { source, duration: { type: 'manual' } },
        ),
      ],
    },
    manual:
      'Select the caster and up to nine participants in the chant. Track 24 hours manually. Resolve chosen-save advantage, damage die, condition immunity, and ending exhaustion manually; never grant both Strength and Dexterity save advantage.',
  }),
  'kobold-press-toh:armored-formation': reviewed('Armored Formation', {
    effect: ruleReminder(
      'Armored Formation',
      'In contiguous formation: 2+ creatures gives +2 AC; 4+ adds 1d6 weapon damage; 6+ gives +3 AC and 2d6 weapon damage instead.',
      { type: 'rounds', rounds: 100 },
      'ally',
      true,
    ),
    manual:
      'Select up to twelve willing creatures. Resolve formation membership and 5-foot spacing manually; isolated members get no bonus. Bonuses change with formation size and are not cumulative. Adjust AC/damage manually when membership changes.',
  }),
  'kobold-press-toh:battle-mind': reviewed('Battle Mind', {
    effect: ruleReminder(
      'Battle Mind',
      'Surprise-related Perception advantage; allies not surprised if caster is not. Bonus action chooses a scoped ally/foe benefit, reveals a location, or grants three allies individual Bless/Guidance/Resistance benefits on their turns.',
      { type: 'rounds', rounds: 100 },
      'self',
    ),
    manual:
      'Resolve surprise, bonus-action choice, visibility/hearing, and the selected benefits manually. Location knowledge does not negate invisibility. Perception advantage is only for determining surprise; never grant blanket Wisdom check advantage.',
  }),
  'kobold-press-toh:beast-within': reviewed('Beast Within', {
    effect: ruleReminder(
      'Beast Within',
      'Resistance to nonsilvered nonmagical bludgeoning/piercing/slashing. Hearing/smell Perception advantage. Claws 1d4+STR slashing; bite 1d6+STR piercing; no lycanthropy transmission.',
      { type: 'manual' },
      'ally',
      true,
    ),
    manual:
      'Select willing creatures; one extra target per slot above 4th. Resolve attack-source-dependent resistance, sensory checks, and new unarmed strikes manually. Track 1 hour manually; do not grant blanket Perception advantage or resistance to magic/silver.',
  }),
  'kobold-press-toh:feint': reviewed('Feint', {
    effect: ruleReminder(
      'Feint',
      'Advantage on the caster’s next attack against the chosen creature before end of caster’s next turn.',
      { type: 'untilSourceTurn', when: 'endOfTurn' },
    ),
    manual:
      'Choose the attacked creature. Resolve the caster-only, target-specific next attack advantage manually; remove the reminder after that attack. Do not grant advantage to allies or attacks against other creatures.',
  }),
  'kobold-press-toh:fey-touched-blade': reviewed('Fey-Touched Blade', {
    effect: ruleReminder(
      'Fey-Touched Blade',
      'Chosen nonmagical weapon becomes magical and deals +1d4 force, psychic, necrotic, or radiant (choose one) on each hit.',
      { type: 'manual' },
      'ally',
      true,
    ),
    manual:
      'Mark the chosen weapon and damage type manually; the reminder may be placed on its wielder. Only attacks with that weapon gain the bonus. One extra weapon per slot above 2nd; track 1 hour manually.',
  }),
  'kobold-press-toh:invested-champion': reviewed('Invested Champion', {
    effect: ruleReminder(
      'Invested Champion',
      'Choose champion/charge roles. Source-defined spell reach, magical attacks, bonus actions, reactions, and conditional attack benefits; ends if pair separates more than 60 feet.',
      { type: 'manual' },
      'ally',
      true,
    ),
    manual:
      'Choose one touched creature and one of the two roles. Resolve role-specific benefits, action costs, range, shield/Protection requirements, and rerolls manually. Never grant blanket attack advantage. Track 1 hour manually.',
  }),
  'kobold-press-toh:less-fool-i': reviewed('Less Fool, I', {
    effect: ruleReminder(
      'Less Fool, I',
      'Others have disadvantage on Charisma checks to influence this creature. Source states advantage on spells causing Charmed/Frightened; interpret that printed wording at the table.',
      { type: 'rounds', rounds: 100 },
      'ally',
    ),
    manual:
      'Touch one creature. Influence-only Charisma disadvantage and the printed conditional advantage remain manual. At higher slots use the printed duration/concentration changes; do not apply a global Charisma penalty or guess an unprinted save.',
  }),
  'kobold-press-toh:mantle-of-the-brave': reviewed('Mantle of the Brave', {
    effect: ruleReminder(
      'Mantle of the Brave',
      'Advantage on the next save against a spell/effect causing Frightened; then ends on this creature.',
      { type: 'manual' },
      'ally',
      true,
    ),
    manual:
      'Touch up to four creatures. Resolve only the next qualifying fear save with advantage and remove that recipient’s reminder. Do not consume on another save. Track the 1-hour maximum manually.',
  }),
  'kobold-press-toh:martyrs-rally': reviewed("Martyr's Rally", {
    effect: ruleReminder(
      "Martyr's Rally",
      'Advantage on attack rolls while caster remains at 0 HP. Ends immediately if caster regains HP.',
      { type: 'rounds', rounds: 10 },
      'ally',
      true,
    ),
    manual:
      'Select allies within 60 feet who can see and hear the caster. Resolve attacks with advantage manually and clear all reminders immediately if the caster regains HP; the timer alone cannot watch this condition.',
  }),
  'kobold-press-toh:muted-foe': reviewed('Muted Foe', {
    effect: ruleReminder(
      'Muted Foe',
      'Chosen weapon’s next hit within 1 minute deals +1d6 thunder; struck target becomes Deafened, thunder-immune, and unable to cast verbal spells for 1 minute, with end-turn Wisdom escape saves.',
      { type: 'rounds', rounds: 10 },
      'ally',
    ),
    manual:
      'Mark one touched nonmagical weapon, not a target at initial casting. Resolve the later hit, thunder damage, conditions, and escape saves manually; move the consequence to the struck target only on a hit. Add 1d6 per slot above 1st.',
  }),
  'kobold-press-toh:never-surrender': reviewed('Never Surrender', {
    effect: ruleReminder(
      'Never Surrender',
      'At 0 HP remains conscious. First death save at end of next turn has disadvantage at base slot; massive damage threshold becomes twice maximum HP. Ends on regaining HP.',
      { type: 'manual' },
      'ally',
    ),
    manual:
      'Apply to the creature just reduced to 0 HP. Resolve consciousness, death-save timing, first-save disadvantage, and massive damage manually; clear when it regains HP. At slot 6+, omit first-save disadvantage. Do not grant disadvantage on every death save.',
  }),
  'kobold-press-toh:oversized-paws': reviewed('Oversized Paws', {
    effect: ruleReminder(
      'Oversized Paws',
      '+1d4 damage on unarmed strikes only.',
      { type: 'rounds', rounds: 10 },
      'ally',
      true,
    ),
    manual:
      'Select willing creatures. Apply the extra die only to unarmed strike damage, never manufactured weapons or spell attacks. One extra target per slot above 2nd.',
  }),
  'kobold-press-toh:retribution': reviewed('Retribution', {
    effect: ruleReminder(
      'Retribution',
      'On next melee hit against caster: attacker takes force damage equal to half damage dealt and makes Strength save; failure pushes up to 5 feet. Then spell ends.',
      { type: 'manual' },
      'self',
    ),
    manual:
      'No save or damage at initial casting. Resolve the later melee hit, reflected damage, Strength save, and push manually, then remove the reminder. Track the 1-hour maximum manually.',
  }),
  'kobold-press-toh:sightburst': reviewed('Sightburst', {
    effect: ruleReminder(
      'Sightburst',
      '100-foot blindsight and knowledge of natural hazards. Advantage on saves against detected hazards only.',
      { type: 'untilSourceTurn', when: 'startOfTurn' },
      'self',
    ),
    manual:
      'Resolve detected-hazard saves manually, not all saves. Base slot ends at start of next turn. Slot 3+, 5+, or 7+ changes duration and adds concentration per the source; update both manually. Do not retain the base timer when upcasting.',
  }),
  'kobold-press-toh:spite': reviewed('Spite', {
    effect: ruleReminder(
      'Spite',
      'First creature to hit caster takes 3d6 psychic; then spell ends.',
      { type: 'manual' },
      'self',
    ),
    manual:
      'Caster takes 1 piercing damage during casting; apply it manually. Only on the first subsequent hit apply 3d6 psychic to the attacker and remove the reminder. Add 1d6 per slot above 2nd. Track 1 hour manually.',
  }),
  'kobold-press-toh:trollish-charge': reviewed('Trollish Charge', {
    effect: ruleReminder(
      'Trollish Charge',
      'After a qualifying 10-foot straight charge and attack, target makes Wisdom save against 1-minute Frightened. A hit against that frightened target rolls damage twice, taking higher total.',
      { type: 'rounds', rounds: 10 },
      'ally',
      true,
    ),
    manual:
      'Select willing recipients, one additional per slot above 4th within 30 feet of each other. No initial save or damage. Resolve later qualifying attacks, fear saves, higher damage, and end-turn escape saves manually. On escape, target is immune to this spell’s fear for 24 hours.',
  }),
  'kobold-press-toh:ambush-chute': reviewed('Ambush Chute', {
    manual:
      'Manual terrain/portal spell: create the passage between eligible touched surfaces. No initial save, attack, or damage. Track passage dimensions, maximum five simultaneous travelers, slot extensions, and safe ejection when the spell ends from the source.',
  }),
  'kobold-press-toh:betraying-bauble': reviewed('Betraying Bauble', {
    manual:
      'Manual object-location spell: touch two handheld objects. Resolve direction, relative motion, distance limits, vibration within 30 feet, and lead blocking from the source. No attack, save, or target condition.',
  }),
  'kobold-press-toh:bolster-fortifications': reviewed('Bolster Fortifications', {
    manual:
      'Manual structure ward: apply damage threshold 5 (or +5 to existing threshold), dimensions, area, and slot increases to eligible structures only. Do not grant creatures AC or resistance. Handle dispelling per structure and one-year permanence manually.',
  }),
  'kobold-press-toh:conjure-construct': reviewed('Conjure Construct', {
    manual:
      'Manual summoned combatant: GM selects a construct of eligible CR, adds its statistics and initiative, and handles commands and double damage to objects. Breaking concentration makes it hostile rather than dismissing it; it then remains until 1 hour after summoning. Slot increases change allowed CR.',
  }),
  'kobold-press-toh:convey-inner-peace': reviewed('Convey Inner Peace', {
    manual:
      'Manual rest benefit: caster and up to five willing recipients may each take one 4-hour trance long rest within 24 hours. No initial save, attack, healing, or combat modifier. This does not immediately grant a completed rest.',
  }),
  'kobold-press-toh:enchanted-bloom': reviewed('Enchanted Bloom', {
    manual:
      'Manual delayed trap: no save on enchanting the rose. First toucher other than caster makes Charisma save against 24-hour slumber, with another save whenever damaged. Track waking restrictions, cessation of aging/needs, caster dismissal, and slot-dependent slumber durations separately.',
  }),
  'kobold-press-toh:fey-food': reviewed('Fey Food', {
    manual:
      'Manual consumable trap: choose Slumber, Friendly Face, or Muddled Memory when enchanting food/drink. No initial save; eligible consumers later make Charisma saves. Apply only the chosen effect, its separate duration, and its damage/harm/waking/restoration exceptions. Slot increases change the amount enchanted.',
  }),
  'kobold-press-toh:fuse-armor': reviewed('Fuse Armor', {
    manual:
      'Manual object/construct branches: ordinary objects and worn armor have no initial save; constructs make Strength saves. Armor/constructs lose 10 feet Speed and suffer source-specific weapon/check penalties. End-turn Strength saves or an action Strength check on other objects end the effect. Choose the branch before resolving; never force armor wearers into the construct save.',
  }),
  'kobold-press-toh:gale': reviewed('Gale', {
    manual:
      'Manual persistent area: no initial damage/save. Entry/start-turn Constitution saves deal 1d6 cold on failure; concentrating creatures separately save against caster DC. Handle flying/landing, difficult terrain, obscuration, doused flames, outdoor requirement, and loss of sky access from the source. These are not ordinary damage-based concentration checks.',
  }),
  'kobold-press-toh:high-ground': reviewed('High Ground', {
    manual:
      'Manual terrain: create eligible outdoor hillock and displace creatures. Climbing later uses Strength (Athletics) or Dexterity (Acrobatics) checks against caster DC, not saves. Resolve elevation-dependent range, discretionary bonuses, stability, and slot dimensions manually; no initial roll is required.',
  }),
  'kobold-press-toh:instant-armored-vehicle': reviewed('Instant Armored Vehicle', {
    manual:
      'Manual vehicle stat block and piloting: creation has no save/damage. Later Careen action forces Dexterity saves against 5d8 bludgeoning and Prone, with the source’s successful-save movement choice and driver-proficiency advantage. Track AC 18, 100 HP, movement, cover, and capacity independently.',
  }),
  'kobold-press-toh:jagged-forcelance': reviewed('Jagged Forcelance', {
    manual:
      'Manual linked-creature tether: choose two willing creatures within 15 feet; no initial damage/save. Contact or ending a turn across the tether later forces Strength save against 3d6 force and Prone, half damage on success. Enforce separation, height limits, once-until-caster-turn restriction, and slot increases manually.',
  }),
  'kobold-press-toh:life-burst': reviewed('Life Burst', {
    manual:
      'Manual class-resource healing: uses all remaining Lay on Hands, cures diseases/poisons first starting with nearest ally at 5 points each, then heals caster with the remainder. The console does not model this player-character resource. No save or damage attack should be invented.',
  }),
  'kobold-press-toh:mud': reviewed('Mud', {
    manual:
      'Manual persistent terrain: no initial save. Entry/start-turn Strength saves set Speed to 0 until start of that creature’s next turn on failure. Do not apply Restrained or reduce Speed for the whole spell. Mark the 20-foot-radius difficult terrain separately.',
  }),
  'kobold-press-toh:pipers-lure': reviewed("Piper's Lure", {
    manual:
      'Manual instrument aura: no initial target save. Entry/start-turn within 150 feet forces Wisdom save against 10-minute Charmed, forced Dash toward instrument, and Incapacitated only within 5 feet. Handle ten-minute repeat saves, ending on attack, instrument movement, and 24-hour repeat-charm restriction separately.',
  }),
  'kobold-press-toh:portal-jaunt': reviewed('Portal Jaunt', {
    manual:
      'Manual one-way crafted-door portal: use valid known/seen destination, transported possessions/creatures, and source’s passage limits. No save or damage. Base spell ends on passage or after 1 round; slot increases alter range, duration, and permitted travelers.',
  }),
  'kobold-press-toh:portal-trap': reviewed('Portal Trap', {
    manual:
      'Manual persistent trap: creation has no initial save. Interaction later forces Wisdom save against random-direction teleport up to 30 feet; roll d8 direction and avoid solid objects. Examining the illusion uses an action Intelligence (Investigation) check against caster DC, not a save. Slot increases add portals.',
  }),
  'kobold-press-toh:rebounding-bolt': reviewed('Rebounding Bolt', {
    manual:
      'Manual sequential multi-target damage: each target makes Constitution save for half. Base bounces deal 5d6, 4d6, 3d6, 2d6, then 1d6 force, never one shared damage total. Targets must be distinct and each bounce within 30 feet of the previous target. Slot increases add damage and bounces. The existing mass-damage resolver cannot represent this sequence safely.',
  }),
  'kobold-press-toh:repulsing-wall': reviewed('Repulsing Wall', {
    manual:
      'Manual asymmetric wall: no initial save/damage. Harmful-side entry/end-turn causes 5d8 radiant, without a damage save. Attempted passage separately forces Strength save against push/Prone, with conditional disadvantage for undead, fiends, or radiant-vulnerable creatures. Handle Perception checks, geometry, safe side, and slot damage manually.',
  }),
  'kobold-press-toh:rockfall-ward': reviewed('Rockfall Ward', {
    manual:
      'Manual debris suspension: eligible nonmagical material slows to 60 feet/round then hovers 5 feet above ground. No initial save or damage. Do not block missile weapons or suspend oversized objects without the source’s GM permission. Slot increases enlarge the cube.',
  }),
  'kobold-press-toh:sacrifice-pawn': reviewed('Sacrifice Pawn', {
    manual:
      'Manual triggered healing: only when a visible friendly creature drops to 0 HP. Heal caster by fallen creature’s level (or CR) plus spellcasting ability modifier. The console does not infer those player-character build/resource values. No attack, save, or damage is required.',
  }),
  'kobold-press-toh:sacrificial-healing': reviewed('Sacrificial Healing', {
    manual:
      'Manual paired healing/damage: roll 4d8 once, heal target by that amount and deal the same amount to caster or another willing recipient in range. Do not invent a damage type or a saving throw; source does not specify one. Healing and untyped transferred damage need separate GM application.',
  }),
  'kobold-press-toh:safe-transposition': reviewed('Safe Transposition', {
    manual:
      'Manual reaction redirection: qualifying ally below half maximum HP swaps spaces with caster if both fit. Compare the triggering attack to caster AC after swapping, not ally AC. The existing resolver cannot redirect an already-started attack automatically. No independent save or damage roll.',
  }),
  'kobold-press-toh:secret-blind': reviewed('Secret Blind', {
    manual:
      'Manual stationary sphere: source-defined occupants, passage and magic restrictions, climate, and illusion. Examining it later uses an action Intelligence (Investigation) check against caster DC, not a save. Leaving the sphere, Disintegration, or successful Dispel Magic ends it. No initial roll.',
  }),
  'kobold-press-toh:spiked-barricade': reviewed('Spiked Barricade', {
    manual:
      'Manual terrain/objects: create six separate unoccupied 5-foot barriers. Later entry/start-turn Strength saves prevent 3d6 piercing. No initial damage. Track difficult terrain, half cover, AC 13, 20 HP, vulnerabilities, destruction, slot count, and permanence after full concentration separately.',
  }),
  'kobold-press-toh:stone-fetch': reviewed('Stone Fetch', {
    manual:
      'Manual summoned duplicate using earth elemental statistics, unable to attack. Track orders and temporary shared senses. Later explosion forces Dexterity save against 4d10 slashing, half on success; do not explode on creation. Killing it before explosion causes caster exhaustion. Apply printed slot damage/duration/concentration changes manually.',
  }),
  'kobold-press-toh:toadstool-ring': reviewed('Toadstool Ring', {
    manual:
      'Manual divination: meditation and three past/present/future questions use GM-provided visions. Repeated casting before a long rest adds a cumulative secret 25% unrelated-vision chance. No initial save, attack, damage, or board modifier.',
  }),
  'kobold-press-toh:vine-carpet': reviewed('Vine Carpet', {
    manual:
      'Manual cover/terrain: motionless covered objects/prone creatures have total cover; moving beneath grants three-quarters cover; standing ends coverage. Do not grant unconditional AC or impose Restrained. Track 20-foot area, covered occupants, and disappearance after 1 hour manually.',
  }),
}
