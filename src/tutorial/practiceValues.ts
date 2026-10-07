// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 Nicola Mustone

/** Require typed practice values before a normal form commits its draft. */
export function hasPracticeValues(hp: string, ac: string): boolean {
  return hp.trim() === '30' && ac.trim() === '12'
}

/** Accept a finite whole-number initiative explicitly entered by the GM. */
export function isManualInitiative(value: string): boolean {
  return /^[+-]?\d+$/.test(value.trim()) && Number.isSafeInteger(Number(value))
}
