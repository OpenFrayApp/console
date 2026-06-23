// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant, Concentration } from '../schema/combatant.ts'
import type { RandomSource } from '../dice/rng.ts'
import type { RollResult } from '../dice/roll.ts'
import { rollSave } from './masssave.ts'
import type { AppliedEffect } from './effectroll.ts'

/**
 * Taking damage forces a CON save (DC 10 or half the damage, whichever is higher) to
 * maintain concentration. Per the never-roll-for-the-player rule, the DM records the
 * result (applyConcentrationResult); rollConcentrationCheck is the optional in-app
 * roll for monsters. Being knocked out or killed ends concentration immediately, but
 * that is handled in applyDamage, not here.
 */

export function concentrationDC(damage: number): number {
  return Math.max(10, Math.floor(Math.max(0, damage) / 2))
}

/**
 * The DC to prompt after a combatant takes damage, or null for no prompt. A
 * concentrator knocked out or killed has already lost concentration (applyDamage
 * clears it), so it isn't asked again.
 */
export function concentrationPromptDC(
  before: Combatant,
  after: Combatant,
  damage: number,
): number | null {
  if (damage <= 0) return null
  if (!isConcentrating(before) || !isConcentrating(after)) return null
  return concentrationDC(damage)
}

export function isConcentrating(c: Combatant): boolean {
  return c.concentration !== null
}

/** Start concentrating, replacing any existing concentration (one at a time). */
export function startConcentration(
  c: Combatant,
  concentration: Concentration,
): Combatant {
  return { ...c, concentration }
}

export function breakConcentration(c: Combatant): Combatant {
  return c.concentration === null ? c : { ...c, concentration: null }
}

/** Record the player's own result (or a monster's) without rolling in-app. */
export function applyConcentrationResult(
  c: Combatant,
  maintained: boolean,
): Combatant {
  return maintained ? c : breakConcentration(c)
}

export interface ConcentrationCheck {
  combatant: Combatant
  maintained: boolean
  dc: number
  roll: RollResult
  applied: AppliedEffect[]
}

/**
 * Optional in-app concentration check for a creature with a CON save (monsters).
 * Rolls through the effect-aware chokepoint; on a failure, concentration breaks.
 * Throws for PCs — record their result with applyConcentrationResult instead.
 */
export function rollConcentrationCheck(
  c: Combatant,
  damage: number,
  ctx: { rand?: RandomSource } = {},
): ConcentrationCheck {
  const dc = concentrationDC(damage)
  const save = rollSave(c, { ability: 'con', dc, onSave: 'negates' }, ctx)
  const maintained = save.result === 'save'
  return {
    combatant: maintained ? c : breakConcentration(c),
    maintained,
    dc,
    roll: save.roll,
    applied: save.applied,
  }
}
