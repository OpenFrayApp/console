// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

/**
 * The core OpenFray schema — define once, use everywhere.
 *
 * Build step 1: Creature + Action + Effect, locked together. Combatant,
 * PlayerCharacter, and Encounter (step 2) will instantiate and reference these.
 */

export type * from './primitives.ts'
export type * from './action.ts'
export type * from './creature.ts'
export type * from './effect.ts'
