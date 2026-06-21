// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from '../schema/combatant.ts'
import type { Effect } from '../schema/effect.ts'
import type { Encounter } from '../schema/encounter.ts'

/**
 * The initiative loop. Turn ownership is by `combatantId`, never raw array
 * index: every function that could reorder the list re-derives position from the
 * active creature's id. This single discipline prevents most "whose turn is it?"
 * bugs. All functions are pure — they return a new Encounter, never mutate.
 */

/** Dex score for tie-breaking; PCs don't carry one in the lightweight shape. */
function dexScore(c: Combatant): number | undefined {
  return c.isPC ? undefined : c.creature.abilities.dex
}

/**
 * Initiative order: highest first; ties broken by Dex, then PCs before monsters,
 * then stable insertion order (`Array.prototype.sort` is stable). Deterministic,
 * so reordering is never surprising.
 */
export function compareInitiative(a: Combatant, b: Combatant): number {
  if (b.initiative !== a.initiative) return b.initiative - a.initiative
  const ad = dexScore(a)
  const bd = dexScore(b)
  if (ad !== undefined && bd !== undefined && ad !== bd) return bd - ad
  if (a.isPC !== b.isPC) return a.isPC ? -1 : 1
  return 0
}

export function sortByInitiative(combatants: readonly Combatant[]): Combatant[] {
  return [...combatants].sort(compareInitiative)
}

/** Whose turn it is, or `undefined` if the encounter is empty. */
export function activeCombatant(e: Encounter): Combatant | undefined {
  return e.combatants[e.activeIndex]
}

/**
 * A creature takes turns while active. A downed (unconscious) PC still gets its
 * turn so the DM can roll/mark a death save; only the truly dead are skipped.
 */
function takesTurn(c: Combatant): boolean {
  return c.status === 'active' || (c.isPC && c.status === 'unconscious')
}

/**
 * Start combat: sort into initiative order, round 1, top of the list active.
 * (Surprise is deferred — a one-round skip effect, per the loop spec.)
 */
export function beginEncounter(e: Encounter): Encounter {
  return {
    ...e,
    combatants: sortByInitiative(e.combatants),
    round: 1,
    activeIndex: 0,
  }
}

/** Tick `rounds`-duration effects down by one; drop those that reach zero. */
function tickRoundsEffects(effects: Effect[]): Effect[] {
  return effects.flatMap((e) => {
    if (e.duration.type !== 'rounds') return [e]
    const remaining = (e.duration.rounds ?? 0) - 1
    return remaining <= 0
      ? []
      : [{ ...e, duration: { ...e.duration, rounds: remaining } }]
  })
}

/**
 * End-of-turn ticks for the creature whose turn is ending: decrement its
 * `rounds` effects and reset its legendary actions.
 *
 * Deferred to the dice engine (steps 5–6): rolling `saveEnds` saves and
 * `Recharge 5–6` dice both need randomness, so they are not resolved here yet.
 */
function endTurn(c: Combatant): Combatant {
  const effects = tickRoundsEffects(c.effects)
  if (c.isPC) return { ...c, effects }
  return {
    ...c,
    effects,
    legendaryRemaining: c.creature.legendaryActions?.perRound ?? 0,
  }
}

/**
 * Advance to the next turn:
 *   1. end ticks for the ending creature
 *   2. advance past dead/down creatures (walking by index, identity-checked)
 *   3. round++ if the pointer wrapped past the end of the list
 *   4. start ticks: `untilSourceTurn` effects sourced by the newly-active
 *      creature resolve now — across every combatant, not just the active one
 *      (e.g. Reckless Attack advantage ends as the barbarian's turn begins).
 *
 * Deferred: lair actions on initiative count 20 and recharge rolls arrive with
 * later steps (both need resolution/randomness).
 */
export function nextTurn(e: Encounter): Encounter {
  if (e.combatants.length === 0) return e
  if (!e.combatants.some(takesTurn)) return e

  const endingId = e.combatants[e.activeIndex]?.combatantId
  let combatants = e.combatants.map((c) =>
    c.combatantId === endingId ? endTurn(c) : c,
  )

  let index = e.activeIndex
  let wrapped = false
  for (let step = 0; step < combatants.length; step++) {
    index += 1
    if (index >= combatants.length) {
      index = 0
      wrapped = true
    }
    if (takesTurn(combatants[index])) break
  }

  const round = wrapped ? e.round + 1 : e.round
  const activeId = combatants[index]?.combatantId

  combatants = combatants.map((c) => {
    const effects = c.effects.filter(
      (eff) => !(eff.duration.type === 'untilSourceTurn' && eff.source === activeId),
    )
    if (c.combatantId !== activeId) return { ...c, effects }
    // The newly-active creature regains its reaction and ticks its concentration
    // timer at the start of its turn; concentration lapses when it reaches zero.
    let concentration = c.concentration
    if (concentration?.rounds != null) {
      const left = concentration.rounds - 1
      concentration = left <= 0 ? null : { ...concentration, rounds: left }
    }
    return { ...c, effects, reactionUsed: false, concentration }
  })

  return { ...e, combatants, activeIndex: index, round }
}
