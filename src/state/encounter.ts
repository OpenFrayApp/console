// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from '../schema/combatant.ts'
import type { Encounter } from '../schema/encounter.ts'
import { beginEncounter, nextTurn, sortByInitiative } from '../combat/initiative.ts'
import { isFoe } from '../combat/combatant.ts'
import { setCurrentHp } from '../combat/resources.ts'

/**
 * The encounter store as a pure reducer over the tested combat functions. The UI
 * mutates this in-memory and renders immediately (local-first); the reducer keeps
 * turn ownership by `combatantId` across add/remove, never by raw index.
 */

export type EncounterAction =
  | { type: 'begin' }
  | { type: 'pause' }
  | { type: 'resume' }
  | { type: 'stop' }
  | { type: 'nextTurn' }
  | { type: 'add'; combatant: Combatant }
  | { type: 'remove'; id: string }
  | { type: 'update'; id: string; update: (c: Combatant) => Combatant }
  | { type: 'log'; message: string }
  /** Long rest: restore every friendly combatant to full HP; reset the short-rest count. */
  | { type: 'longRest' }
  /** Short rest: set new current HP for the given combatants; bump the short-rest count. */
  | { type: 'shortRest'; hp: Record<string, number> }
  /** Clear the board of enemies — remove every foe, keeping friendly combatants. */
  | { type: 'clearFoes' }
  /** Replace the whole encounter — used when hydrating from the cloud on sign-in. */
  | { type: 'load'; encounter: Encounter }

const activeId = (e: Encounter): string | undefined =>
  e.combatants[e.activeIndex]?.combatantId

const indexOfId = (combatants: Combatant[], id: string | undefined): number => {
  if (!id) return 0
  const i = combatants.findIndex((c) => c.combatantId === id)
  return i >= 0 ? i : 0
}

export function encounterReducer(state: Encounter, action: EncounterAction): Encounter {
  switch (action.type) {
    case 'begin':
      return { ...beginEncounter(state), paused: false }

    case 'pause':
      return { ...state, paused: true }

    case 'resume':
      return { ...state, paused: false }

    // End combat back to setup: keep the combatants on the board, reset the clock.
    case 'stop':
      return { ...state, round: 0, activeIndex: 0, paused: false }

    case 'nextTurn':
      return nextTurn(state)

    case 'add': {
      const keepActive = activeId(state)
      const combatants = sortByInitiative([...state.combatants, action.combatant])
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

    case 'update':
      return {
        ...state,
        combatants: state.combatants.map((c) =>
          c.combatantId === action.id ? action.update(c) : c,
        ),
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
    // untouched. The short-rest tally resets.
    case 'longRest':
      return {
        ...state,
        shortRests: 0,
        combatants: state.combatants.map((c) => (isFoe(c) ? c : setCurrentHp(c, c.hp.max))),
      }

    // A short rest applies the DM-entered current HP per combatant and counts one
    // rest. Only the listed combatants change.
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

    case 'load':
      return action.encounter

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
