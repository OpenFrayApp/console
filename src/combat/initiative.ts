// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from '../schema/combatant.ts'
import type { Effect } from '../schema/effect.ts'
import type { Encounter } from '../schema/encounter.ts'
import type { InitiativeTiebreak } from '../schema/campaign.ts'

/**
 * The initiative loop. Turn ownership is by `combatantId`, never raw array
 * index: every function that could reorder the list re-derives position from the
 * active creature's id. This single discipline prevents most "whose turn is it?"
 * bugs. All functions are pure — they return a new Encounter, never mutate.
 */

/**
 * Dex score for tie-breaking. Monsters always carry one; PCs only do when added
 * from the durable roster (anon header-form PCs and quick adds have none, so this
 * returns undefined and the Dex tiebreak falls through to stable order for them).
 */
function dexScore(c: Combatant): number | undefined {
  return c.isPC ? c.abilities?.dex : c.creature.abilities.dex
}

/**
 * Initiative order: highest first, then the campaign's chosen tiebreak (defaulting
 * to Dex, the standard ruleset used by anonymous users and tests). The modes are
 * mutually exclusive primary tiebreaks:
 *   - `dex`: higher Dexterity wins (then stable insertion order).
 *   - `pcs-first`: players act before monsters (then stable order).
 *   - `manual`: leave ties in insertion order for the DM to drag.
 * `Array.prototype.sort` is stable, so equal entries keep their order in every mode.
 */
export function compareInitiative(
  a: Combatant,
  b: Combatant,
  tiebreak: InitiativeTiebreak = 'dex',
): number {
  if (b.initiative !== a.initiative) return b.initiative - a.initiative
  if (tiebreak === 'dex') {
    const ad = dexScore(a)
    const bd = dexScore(b)
    if (ad !== undefined && bd !== undefined && ad !== bd) return bd - ad
  } else if (tiebreak === 'pcs-first' && a.isPC !== b.isPC) {
    return a.isPC ? -1 : 1
  }
  return 0
}

export function sortByInitiative(
  combatants: readonly Combatant[],
  tiebreak: InitiativeTiebreak = 'dex',
): Combatant[] {
  return [...combatants].sort((a, b) => compareInitiative(a, b, tiebreak))
}

/** Whose turn it is, or `undefined` if the encounter is empty. */
export function activeCombatant(e: Encounter): Combatant | undefined {
  return e.combatants[e.activeIndex]
}

/**
 * A creature takes turns while active. A downed (unconscious) PC still gets its
 * turn so the DM can roll/mark a death save; only the truly dead are skipped. A
 * `skipsTurn` effect (e.g. Surprised on round 1) also takes a creature out of the
 * rotation until that effect clears.
 */
function takesTurn(c: Combatant): boolean {
  if (c.effects.some((e) => e.skipsTurn)) return false
  return c.status === 'active' || (c.isPC && c.status === 'unconscious')
}

/**
 * Start combat: sort into initiative order, round 1, and make the first creature
 * that actually takes a turn active (skipping any surprised/dead leaders).
 */
export function beginEncounter(
  e: Encounter,
  tiebreak: InitiativeTiebreak = 'dex',
): Encounter {
  const combatants = sortByInitiative(e.combatants, tiebreak)
  const first = combatants.findIndex(takesTurn)
  return {
    ...e,
    combatants,
    round: 1,
    activeIndex: first < 0 ? 0 : first,
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
 * Randomness stays out of this pure loop: `saveEnds` saves and `Recharge 5–6`
 * dice are rolled in the App layer when the turn advances (autoRollSaveEnds /
 * autoRecharge), keyed to the same start/end-of-turn moments.
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

  // The next taker in the remainder of this round.
  let index = -1
  for (let i = e.activeIndex + 1; i < combatants.length; i++) {
    if (takesTurn(combatants[i])) {
      index = i
      break
    }
  }

  let round = e.round
  if (index === -1) {
    // Wrap into a new round: surprise (skip) effects clear *first*, so a creature
    // surprised on round 1 is back in the rotation and can lead off round 2.
    round = e.round + 1
    combatants = combatants.map((c) =>
      c.effects.some((eff) => eff.skipsTurn)
        ? { ...c, effects: c.effects.filter((eff) => !eff.skipsTurn) }
        : c,
    )
    index = combatants.findIndex(takesTurn)
    if (index < 0) index = 0
  }

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
