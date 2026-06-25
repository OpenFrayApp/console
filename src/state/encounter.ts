// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from '../schema/combatant.ts'
import type { Encounter } from '../schema/encounter.ts'
import type { InitiativeTiebreak } from '../schema/campaign.ts'
import { beginEncounter, nextTurn, sortByInitiative } from '../combat/initiative.ts'
import { isFoe } from '../combat/combatant.ts'
import { survivesLongRest } from '../combat/effects.ts'
import { setCurrentHp } from '../combat/resources.ts'
import { addDealt, addTaken, pauseStats, resumeStats, startStats } from '../combat/recap.ts'

/**
 * The encounter store as a pure reducer over the tested combat functions. The UI
 * mutates this in-memory and renders immediately (local-first); the reducer keeps
 * turn ownership by `combatantId` across add/remove, never by raw index.
 */

export type EncounterAction =
  // `tiebreak` carries the active campaign's initiative-tie rule into the sort
  // (defaults to 'dex' — the standard ruleset — when omitted, e.g. anon users).
  | { type: 'begin'; tiebreak?: InitiativeTiebreak }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'stop' }
  | { type: 'nextTurn' }
  | { type: 'add'; combatant: Combatant; tiebreak?: InitiativeTiebreak }
  | { type: 'remove'; id: string }
  | { type: 'update'; id: string; update: (c: Combatant) => Combatant }
  | { type: 'log'; message: string }
  /** Attribute damage dealt to its source (for the recap MVP). Damage *taken* is
   *  captured automatically from any HP drop, so this records the dealer only. */
  | { type: 'recordDamage'; sourceId: string; amount: number }
  /** Long rest: restore every friendly combatant to full HP; reset the short-rest count. */
  | { type: 'longRest' }
  /** Short rest: set new current HP for the given combatants; bump the short-rest count. */
  | { type: 'shortRest'; hp: Record<string, number> }
  /** Clear the board of enemies — remove every foe, keeping friendly combatants. */
  | { type: 'clearFoes' }
  /** Sweep the whole board — remove every combatant, ending the encounter. */
  | { type: 'clearAll' }
  /** Manual reorder (drag): move `id` to where `toId` sits; its initiative is reset
   *  to sit between its new neighbours. */
  | { type: 'reorder'; id: string; toId: string }
  /** Replace the whole encounter — used when hydrating from the cloud on sign-in. */
  | { type: 'load'; encounter: Encounter }

const activeId = (e: Encounter): string | undefined =>
  e.combatants[e.activeIndex]?.combatantId

/**
 * Move `id` to where `toId` sits — dragging down drops below the target, up drops
 * above it. Returns the same array reference when nothing moves. Pure; shared by the
 * reorder reducer and the drag-preview in the UI so both order rows identically.
 */
export function moveById<T extends { combatantId: string }>(
  list: T[],
  id: string,
  toId: string,
): T[] {
  if (id === toId) return list
  const from = list.findIndex((c) => c.combatantId === id)
  const to = list.findIndex((c) => c.combatantId === toId)
  if (from < 0 || to < 0) return list
  const dragged = list[from]
  const without = list.filter((c) => c.combatantId !== id)
  const targetIdx = without.findIndex((c) => c.combatantId === toId)
  const insertAt = from < to ? targetIdx + 1 : targetIdx
  return [...without.slice(0, insertAt), dragged, ...without.slice(insertAt)]
}

const indexOfId = (combatants: Combatant[], id: string | undefined): number => {
  if (!id) return 0
  const i = combatants.findIndex((c) => c.combatantId === id)
  return i >= 0 ? i : 0
}

export function encounterReducer(state: Encounter, action: EncounterAction): Encounter {
  switch (action.type) {
    case 'begin':
      return { ...beginEncounter(state, action.tiebreak), paused: false, combatStats: startStats(Date.now()) }

    case 'pause':
      return {
        ...state,
        paused: true,
        combatStats: state.combatStats && pauseStats(state.combatStats, Date.now()),
      }

    case 'resume':
      return {
        ...state,
        paused: false,
        combatStats: state.combatStats && resumeStats(state.combatStats, Date.now()),
      }

    // End combat back to setup: keep the combatants on the board, reset the clock. The
    // stats are finalized (clock stopped) and kept — App reads them for the recap.
    case 'stop':
      return {
        ...state,
        round: 0,
        activeIndex: 0,
        paused: false,
        combatStats: state.combatStats && pauseStats(state.combatStats, Date.now()),
      }

    case 'nextTurn':
      return nextTurn(state)

    case 'add': {
      const keepActive = activeId(state)
      const combatants = sortByInitiative([...state.combatants, action.combatant], action.tiebreak)
      return { ...state, combatants, activeIndex: indexOfId(combatants, keepActive) }
    }

    case 'remove': {
      const wasActive = activeId(state) === action.id
      const combatants = state.combatants.filter((c) => c.combatantId !== action.id)
      const activeIndex = wasActive
        ? Math.min(state.activeIndex, Math.max(0, combatants.length - 1))
        : indexOfId(combatants, activeId(state))
      return { ...state, combatants, activeIndex }
    }

    case 'update': {
      const before = state.combatants.find((c) => c.combatantId === action.id)
      const combatants = state.combatants.map((c) =>
        c.combatantId === action.id ? action.update(c) : c,
      )
      const after = combatants.find((c) => c.combatantId === action.id)
      // Any HP drop — action damage, a save, a manual edit — is damage taken.
      const lost = before && after ? before.hp.current - after.hp.current : 0
      return {
        ...state,
        combatants,
        combatStats:
          state.combatStats && lost > 0
            ? addTaken(state.combatStats, action.id, lost)
            : state.combatStats,
      }
    }

    case 'recordDamage':
      return {
        ...state,
        combatStats: state.combatStats && addDealt(state.combatStats, action.sourceId, action.amount),
      }

    case 'log':
      return {
        ...state,
        log: [
          ...state.log,
          {
            id: `${state.round}-${state.log.length}`,
            round: state.round,
            message: action.message,
          },
        ],
      }

    // A long rest restores all player characters and friendly NPCs to full HP
    // (setCurrentHp also clears death saves and wakes the unconscious); foes are
    // untouched. The short-rest tally resets. (Monster spell slots aren't reset here:
    // monsters are always foes, so a party rest leaves them be — re-add the creature
    // for a fresh pool, or undo a cast to give a slot back.)
    case 'longRest':
      // Restore friendly HP, and also end concentration and any sub-8h effect on them
      // (a long rest is 8 hours); GM-managed `manual` and ≥8h effects survive.
      return {
        ...state,
        shortRests: 0,
        combatants: state.combatants.map((c) =>
          isFoe(c)
            ? c
            : {
                ...setCurrentHp(c, c.hp.max),
                concentration: null,
                effects: c.effects.filter(survivesLongRest),
              },
        ),
      }

    case 'shortRest':
      return {
        ...state,
        shortRests: (state.shortRests ?? 0) + 1,
        combatants: state.combatants.map((c) =>
          action.hp[c.combatantId] != null ? setCurrentHp(c, action.hp[c.combatantId]) : c,
        ),
      }

    // Sweep the board between fights: drop every foe, keep the party. Only offered
    // outside combat, so the turn cursor resets to the top.
    case 'clearFoes':
      return { ...state, activeIndex: 0, combatants: state.combatants.filter((c) => !isFoe(c)) }

    case 'clearAll':
      return { ...state, round: 0, activeIndex: 0, paused: false, combatants: [] }

    // Drag-to-reorder: move the dragged combatant to the target's slot and reset its
    // initiative to sit between its new neighbours, so the order holds (and turn
    // ownership is re-derived by id, never index — the loop rule).
    case 'reorder': {
      const order = moveById(state.combatants, action.id, action.toId)
      if (order === state.combatants) return state
      const at = order.findIndex((c) => c.combatantId === action.id)
      const above = order[at - 1]
      const below = order[at + 1]
      // Sit between the new neighbours (a midpoint is fractional but the UI floors it,
      // so it just ranks above the lower neighbour and never alters anyone else).
      const initiative =
        above && below
          ? (above.initiative + below.initiative) / 2
          : above
            ? above.initiative - 1
            : below
              ? below.initiative + 1
              : order[at].initiative
      const combatants = order.map((c) =>
        c.combatantId === action.id ? { ...c, initiative } : c,
      )
      return { ...state, combatants, activeIndex: indexOfId(combatants, activeId(state)) }
    }

    case 'load': {
      const e = action.encounter
      // Don't credit time the tab was closed: restart the active clock from now.
      return e.combatStats?.runningSince != null
        ? { ...e, combatStats: { ...e.combatStats, runningSince: Date.now() } }
        : e
    }

    default:
      return state
  }
}

export function emptyEncounter(): Encounter {
  return {
    encounterId: 'local',
    ownerId: null,
    round: 0,
    activeIndex: 0,
    combatants: [],
    log: [],
  }
}
