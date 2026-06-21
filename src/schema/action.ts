// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Ability, DamageType } from './primitives.ts'

export type ActionKind = 'melee' | 'ranged' | 'save' | 'utility'

/**
 * What a creature takes on a successful save:
 * - `half`    — half the damage (e.g. Fireball)
 * - `none`    — no damage / no effect
 * - `negates` — the rider effect is negated
 */
export type SaveOutcome = 'half' | 'none' | 'negates'

export interface SaveRequirement {
  ability: Ability
  dc: number
  onSave: SaveOutcome
}

/** A single damage component. `formula` is dice grammar; `type` is a metadata tag. */
export interface DamageRoll {
  /** Dice grammar, e.g. `"2d10+8"`. See the dice spec for the full grammar. */
  formula: string
  type: DamageType
}

export interface Range {
  normal: number
  long?: number
}

/**
 * Everything rollable is an Action; dice presets read straight off it.
 *
 * The rule that saves months: mechanics live in structured fields
 * (`toHit`, `damage[].formula`, `save.dc`); prose lives in `text` for display
 * only. Never parse `text` back into numbers.
 */
/**
 * How a limited-use ability comes back:
 * - `dice`     — recharge on a die roll, e.g. "Recharge 5–6" → `value: 5`
 * - `perDay`   — N uses per day
 * - `perRound` — N uses per round
 */
export type Recharge =
  | { type: 'dice'; value: number }
  | { type: 'perDay'; value: number }
  | { type: 'perRound'; value: number }

export interface Action {
  id: string
  name: string
  kind: ActionKind
  /** Attack bonus, or `null` for save-based / utility actions. */
  toHit: number | null
  /** Melee reach in feet. */
  reach?: number
  /** Ranged distances in feet. */
  range?: Range
  damage?: DamageRoll[]
  /** Present for save-based actions; `null`/absent for attacks. */
  save?: SaveRequirement | null
  /** Usage limit, e.g. Recharge 5–6 — matters for the roller, so never dropped. */
  recharge?: Recharge
  /** Legendary actions this one costs (default 1); some cost 2+ of the round's budget. */
  legendaryCost?: number
  /** Original stat-block prose. Display only — never parsed for mechanics. */
  text?: string
}
