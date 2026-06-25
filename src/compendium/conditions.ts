// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { ConditionName } from '../schema/effect.ts'

/**
 * Reference text for the 15 standard 5e conditions, used for the hover preview in
 * action prose and on the initiative tracker's condition badges. This is SRD 5.2
 * (2024) rules content, used under CC-BY-4.0 — the WotC attribution lives in the
 * in-app Credits and `CREDITS.md`. Display-only prose; no mechanics are derived
 * from it (the dice engine reads `combat/conditionrules.ts`).
 */
export const CONDITION_TEXT: Record<ConditionName, string> = {
  Blinded: [
    "- **Can't See.** You can't see and automatically fail any ability check that requires sight.",
    '- **Attacks Affected.** Attack rolls against you have Advantage, and your attack rolls have Disadvantage.',
  ].join('\n'),
  Charmed: [
    "- **Can't Harm the Charmer.** You can't attack the charmer or target the charmer with damaging abilities or magical effects.",
    '- **Social Advantage.** The charmer has Advantage on any ability check to interact with you socially.',
  ].join('\n'),
  Deafened: "- **Can't Hear.** You can't hear and automatically fail any ability check that requires hearing.",
  Exhaustion: [
    '- **Exhaustion Levels.** This condition is cumulative. Each time you receive it, you gain 1 Exhaustion level. You die if your Exhaustion level is 6.',
    '- **D20 Tests Affected.** When you make a D20 Test, the roll is reduced by 2 times your Exhaustion level.',
    '- **Speed Reduced.** Your Speed is reduced by a number of feet equal to 5 times your Exhaustion level.',
    '- **Removing Exhaustion Levels.** Finishing a Long Rest removes 1 of your Exhaustion levels. When your Exhaustion level reaches 0, the condition ends.',
  ].join('\n'),
  Frightened: [
    '- **Ability Checks and Attacks Affected.** You have Disadvantage on ability checks and attack rolls while the source of your fear is within line of sight.',
    "- **Can't Approach.** You can't willingly move closer to the source of your fear.",
  ].join('\n'),
  Grappled: [
    "- **Speed 0.** Your Speed is 0 and can't increase.",
    '- **Attacks Affected.** You have Disadvantage on attack rolls against any target other than the grappler.',
    '- **Movable.** The grappler can drag or carry you when it moves, but every foot of movement costs it 1 extra foot unless you are Tiny or two or more sizes smaller than it.',
  ].join('\n'),
  Incapacitated: [
    "- **Inactive.** You can't take any action, Bonus Action, Reaction, or Legendary Action.",
    '- **No Concentration.** Your Concentration is broken.',
    "- **Speechless.** You can't speak.",
    "- **Surprised.** If you're Incapacitated when you roll Initiative, you have Disadvantage on the roll.",
  ].join('\n'),
  Invisible: [
    "- **Surprise.** If you're Invisible when you roll Initiative, you have Advantage on the roll.",
    "- **Concealed.** You aren't affected by any effect that requires its target to be seen unless the effect's creator can somehow see you. Any equipment you are wearing or carrying is also concealed.",
    '- **Attacks Affected.** Attack rolls against you have Disadvantage, and your attack rolls have Advantage.',
  ].join('\n'),
  Paralyzed: [
    '- **Incapacitated.** You have the Incapacitated condition.',
    "- **Speed 0.** Your Speed is 0 and can't increase.",
    '- **Saving Throws Affected.** You automatically fail Strength and Dexterity saving throws.',
    '- **Attacks Affected.** Attack rolls against you have Advantage.',
    '- **Automatic Critical Hits.** Any attack roll that hits you is a Critical Hit if the attacker is within 5 feet of you.',
  ].join('\n'),
  Petrified: [
    '- **Turned to Inanimate Substance.** You are transformed, along with any nonmagical object you are wearing or carrying, into a solid inanimate substance (usually stone). Your weight increases by a factor of ten, and you cease aging.',
    '- **Incapacitated.** You have the Incapacitated condition.',
    "- **Speed 0.** Your Speed is 0 and can't increase.",
    '- **Attacks Affected.** Attack rolls against you have Advantage.',
    '- **Saving Throws Affected.** You automatically fail Strength and Dexterity saving throws.',
    '- **Resist Damage.** You have Resistance to all damage.',
    '- **Poison Immunity.** You have Immunity to the Poisoned condition.',
  ].join('\n'),
  Poisoned: '- **Ability Checks and Attacks Affected.** You have Disadvantage on attack rolls and ability checks.',
  Prone: [
    '- **Restricted Movement.** Your only movement options are to crawl or to spend an amount of movement equal to half your Speed (round down) to right yourself and thereby end the condition. If your Speed is 0, you can\'t right yourself.',
    '- **Attacks Affected.** You have Disadvantage on attack rolls. An attack roll against you has Advantage if the attacker is within 5 feet of you. Otherwise, that attack roll has Disadvantage.',
  ].join('\n'),
  Restrained: [
    "- **Speed 0.** Your Speed is 0 and can't increase.",
    '- **Attacks Affected.** Attack rolls against you have Advantage, and your attack rolls have Disadvantage.',
    '- **Saving Throws Affected.** You have Disadvantage on Dexterity saving throws.',
  ].join('\n'),
  Stunned: [
    '- **Incapacitated.** You have the Incapacitated condition.',
    '- **Saving Throws Affected.** You automatically fail Strength and Dexterity saving throws.',
    '- **Attacks Affected.** Attack rolls against you have Advantage.',
  ].join('\n'),
  Unconscious: [
    '- **Inert.** You have the Incapacitated condition, can\'t move or speak, and are unaware of your surroundings.',
    '- **Drops Held Items.** You drop whatever you\'re holding and fall Prone.',
    "- **Speed 0.** Your Speed is 0 and can't increase.",
    '- **Saving Throws Affected.** You automatically fail Strength and Dexterity saving throws.',
    '- **Attacks Affected.** Attack rolls against you have Advantage.',
    '- **Automatic Critical Hits.** Any attack roll that hits you is a Critical Hit if the attacker is within 5 feet of you.',
  ].join('\n'),
}

const CONDITION_NAMES = Object.keys(CONDITION_TEXT) as ConditionName[]

const isConditionName = (name: string): name is ConditionName => name in CONDITION_TEXT

/** Resolve a condition name to its reference text, or undefined if unknown. */
export function resolveCondition(name: string): { name: ConditionName; text: string } | undefined {
  return isConditionName(name) ? { name, text: CONDITION_TEXT[name] } : undefined
}

// Matches an existing markdown link (so we never rewrite inside one) OR a
// capitalized, whole-word condition name. Case-sensitive: SRD prose capitalizes
// condition names, which avoids false hits on lowercase words ("prone to anger").
const LINKIFY_RE = new RegExp(
  `(\\[[^\\]]*\\]\\([^)]*\\))|\\b(${CONDITION_NAMES.join('|')})\\b`,
  'g',
)

/**
 * Wrap bare condition names in prose with `condition:<Name>` markdown links, which
 * `Markdown` turns into hover previews — the same mechanism as ingest-added
 * `spell:` links. Existing links are left untouched.
 */
export function linkifyConditions(text: string): string {
  return text.replace(LINKIFY_RE, (_m, link: string | undefined, cond: string | undefined) =>
    link ? link : `[${cond}](condition:${cond})`,
  )
}
