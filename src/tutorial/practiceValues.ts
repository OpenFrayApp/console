// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

import type { Combatant } from '../schema/combatant.ts'

/** Prescribe the story's turn order without creating a dice roll. */
export function practiceInitiative(combatant: Combatant): number | null {
  if (combatant.isPC) return combatant.kind === 'quick' ? 14 : 20
  if (['srd-5.2:ogre', 'srd-5.1:ogre'].includes(combatant.creatureId)) return 18
  if (['srd-5.2:mage', 'srd-5.1:mage'].includes(combatant.creatureId)) return 16
  return null
}

/** Require typed practice values before a normal form commits its draft. */
export function hasPracticeValues(hp: string, ac: string): boolean {
  return hp.trim() === '30' && ac.trim() === '12'
}

/** Accept a finite whole-number initiative explicitly entered by the GM. */
export function isManualInitiative(value: string): boolean {
  return /^[+-]?\d+$/.test(value.trim()) && Number.isSafeInteger(Number(value))
}
