// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Edition } from '../schema/primitives.ts'
import type {
  CritRule,
  HpMethod,
  InitiativeTiebreak,
  SurpriseRule,
} from '../schema/campaign.ts'

/** A selectable option: the stored value and its human label. */
export interface Option<T extends string> {
  value: T
  label: string
}

export const EDITION_OPTIONS: Option<Edition>[] = [
  { value: '5.5', label: 'DnD 5.5 (2024)' },
  { value: '5.0', label: 'DnD 5.0 (2014)' },
]

export const CRIT_OPTIONS: Option<CritRule>[] = [
  { value: 'double-dice', label: 'Double the dice (standard)' },
  { value: 'max-plus-roll', label: 'Max normal dice + roll crit dice' },
  { value: 'double-total', label: 'Double the total damage' },
]

export const SURPRISE_OPTIONS: Option<SurpriseRule>[] = [
  { value: 'disadvantage', label: 'Disadvantage on initiative (5.5)' },
  { value: 'skip', label: 'Skip the first turn (5.0)' },
]

export const HP_OPTIONS: Option<HpMethod>[] = [
  { value: 'average', label: 'Average' },
  { value: 'roll', label: 'Roll' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
]

export const TIEBREAK_OPTIONS: Option<InitiativeTiebreak>[] = [
  { value: 'dex', label: 'Higher Dexterity' },
  { value: 'pcs-first', label: 'Players first' },
  { value: 'manual', label: 'Manual order' },
]

/** The human label for a stored value, falling back to the raw value if unknown. */
export function labelOf<T extends string>(options: Option<T>[], value: T): string {
  return options.find((o) => o.value === value)?.label ?? value
}

/** Acronym from a campaign name's word initials, e.g. "Sands of Eternity" → "SoE". */
export function campaignAcronym(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
}
