// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Edition } from '../schema/primitives.ts'
import type { Effect, EffectBundle } from '../schema/effect.ts'
import { condition, counterOf, modifierEffect, reminder } from './effects.ts'

/**
 * Exhaustion is the one condition that carries a number, so it is the one condition
 * the console builds rather than toggles. A level from 1 to 6 lands as an anchor
 * condition holding the tally plus the penalties that level implies, all under one
 * bundle — one badge, cleared together.
 *
 * The two editions state those penalties differently: 2024 as one formula, 2014 as a
 * six-row cumulative table. The level is read against the campaign's edition once,
 * when it is set, and lands as ordinary Effect modifiers — so nothing downstream
 * knows Exhaustion exists. The dice engine, Speed, and the hit point maximum read the
 * modifiers they always have.
 *
 * Death at level 6 is a reminder, never a mechanic: reaching a number does not kill a
 * creature here, the Game Master does.
 */

/** The level a creature dies at, and so the highest the console counts to. */
export const EXHAUSTION_MAX = 6

/** The condition's name, which is also the anchor effect's and every part's. */
const NAME = 'Exhaustion'

/** Level 6 kills, and that is the Game Master's call to make rather than the app's. */
const DEATH_NOTE = 'Level 6: the creature dies. You apply it.'

/** Whether this effect is the Exhaustion anchor — the condition holding the level. */
export function isExhaustion(effect: Effect): boolean {
  return effect.icon === 'condition' && effect.name === NAME
}

/** The Exhaustion anchor among a creature's effects, if it carries one. */
export function exhaustionAnchor(effects: Effect[]): Effect | undefined {
  return effects.find(isExhaustion)
}

/** The level a creature is exhausted at — 0 when it isn't. */
export function exhaustionLevel(effects: Effect[]): number {
  const anchor = exhaustionAnchor(effects)
  return anchor ? (counterOf(anchor) ?? 0) : 0
}

/** Clamp a level to the 0–6 the rules define; 0 means the condition is off. */
export function clampLevel(level: number): number {
  if (!Number.isFinite(level)) return 0
  return Math.min(EXHAUSTION_MAX, Math.max(0, Math.trunc(level)))
}

/**
 * The penalties a level implies under the 2024 rules, which state one formula for
 * every level: every D20 Test is reduced by 2 × the level, and Speed by 5 × the level
 * feet. A D20 Test is an attack roll, a saving throw, or an ability check — `all`.
 */
function parts2024(level: number, bundle: EffectBundle): Effect[] {
  const name = bundle.name
  return [
    modifierEffect(
      { name, mode: 'flatBonus', direction: 'outgoing', applies: 'all', value: -2 * level },
      { bundle },
    ),
    modifierEffect(
      { name, mode: 'flatBonus', direction: 'outgoing', applies: 'speed', value: -5 * level },
      { bundle },
    ),
  ]
}

/**
 * The penalties a level implies under the 2014 rules, whose table gives each level a
 * different consequence and stacks them: Disadvantage on ability checks at 1, Speed
 * halved at 2, Disadvantage on attack rolls and saving throws at 3, the hit point
 * maximum halved at 4, and Speed 0 at 5. Attacks and saves are two modifiers because
 * `EffectApplies` names one category of roll at a time, and `all` would reach checks
 * that already carry their own Disadvantage from level 1.
 */
function parts2014(level: number, bundle: EffectBundle): Effect[] {
  const name = bundle.name
  const out: Effect[] = []
  /** One Disadvantage modifier on the creature's own rolls of the given kind. */
  const disadvantage = (applies: 'attackRolls' | 'savingThrows' | 'abilityChecks') =>
    modifierEffect({ name, mode: 'disadvantage', direction: 'outgoing', applies }, { bundle })
  /** One stat modifier — Speed or the hit point maximum — at a rules-worded value. */
  const stat = (applies: 'speed' | 'maxHp', value: string) =>
    modifierEffect({ name, mode: 'flatBonus', direction: 'outgoing', applies, value }, { bundle })

  if (level >= 1) out.push(disadvantage('abilityChecks'))
  // Level 5 pins Speed at 0, which supersedes the halving level 2 laid down.
  if (level >= 2) out.push(stat('speed', level >= 5 ? 'zero' : 'half'))
  if (level >= 3) {
    out.push(disadvantage('attackRolls'))
    out.push(disadvantage('savingThrows'))
  }
  if (level >= 4) out.push(stat('maxHp', 'half'))
  return out
}

/**
 * Every Effect an Exhaustion level lands as: the anchor condition carrying the tally,
 * the edition's penalties, and — at 6 — the reminder that the creature dies. Level 0
 * lands nothing, since the condition ends when the level reaches 0.
 */
export function exhaustionEffects(level: number, edition: Edition): Effect[] {
  const n = clampLevel(level)
  if (n === 0) return []
  const bundle: EffectBundle = { id: crypto.randomUUID(), name: `${NAME} ${n}` }
  // The anchor keeps the bare condition name, which is what resolves its reference
  // card; every part takes the bundle's name, so a roll it swung is attributed to the
  // level rather than to "Exhaustion" with no number on it.
  const anchor = condition(NAME, { duration: { type: 'counter', count: n }, bundle })
  const parts = edition === '5.0' ? parts2014(n, bundle) : parts2024(n, bundle)
  const death = n >= EXHAUSTION_MAX ? [reminder(bundle.name, DEATH_NOTE, { bundle })] : []
  return [anchor, ...parts, ...death]
}

/** The 2014 table's rows, in order, each cumulative with the ones above it. */
const ROWS_2014 = [
  'Disadvantage on ability checks',
  'Speed halved',
  'Disadvantage on attacks and saves',
  'HP maximum halved',
  'Speed 0',
]

/**
 * What a level does, in one line — the hint under the level chips, so a Game Master
 * picking one can see what it lands before it lands. Reads the campaign's edition, the
 * same source the effects themselves are built from.
 */
export function describeExhaustion(level: number, edition: Edition): string {
  const n = clampLevel(level)
  if (n === 0) return 'No Exhaustion.'
  const death = n >= EXHAUSTION_MAX ? ' The creature dies — you apply that.' : ''
  if (edition === '5.0') return `Level ${n}: ${ROWS_2014.slice(0, n).join(', ')}.${death}`
  return `Level ${n}: ${-2 * n} to every d20 roll, Speed ${-5 * n} ft.${death}`
}

/**
 * A change in Exhaustion, in words — "Gains 2 levels", "Removes 1 level". A preset
 * stores the change rather than a level, so this is how its card reads it back.
 */
export function describeExhaustionChange(levels: number): string {
  const n = Math.abs(Math.trunc(levels))
  const plural = n === 1 ? 'level' : 'levels'
  return levels >= 0 ? `Gains ${n} ${plural}` : `Removes ${n} ${plural}`
}

/**
 * A creature's effects with its Exhaustion set to `level`, rebuilt for the edition in
 * play. The whole bundle is replaced rather than patched: the parts a level implies
 * differ level by level under the 2014 table, so there is nothing stable to edit in
 * place. Everything else on the creature is left exactly where it was.
 */
export function withExhaustion(effects: Effect[], level: number, edition: Edition): Effect[] {
  const anchor = exhaustionAnchor(effects)
  const bundleId = anchor?.bundle?.id
  const kept = effects.filter(
    (e) => e !== anchor && (bundleId === undefined || e.bundle?.id !== bundleId),
  )
  return [...kept, ...exhaustionEffects(level, edition)]
}
