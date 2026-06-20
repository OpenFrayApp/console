// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

/**
 * The core OpenFray schema — define once, use everywhere.
 *
 * Step 1: Creature + Action + Effect, locked together.
 * Step 2: Combatant + PlayerCharacter + Encounter, instantiated from the above.
 */

export type * from './primitives.ts'
export type * from './action.ts'
export type * from './creature.ts'
export type * from './effect.ts'
export type * from './combatant.ts'
export type * from './encounter.ts'
