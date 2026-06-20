// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from '../schema/combatant.ts'
import type { Encounter } from '../schema/encounter.ts'
import { beginEncounter, nextTurn, sortByInitiative } from '../combat/initiative.ts'

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
