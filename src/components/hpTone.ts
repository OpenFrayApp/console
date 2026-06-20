// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { HpTier } from '../combat/resources.ts'

/** Tailwind text colour for a wound tier — works in both themes. Shared by the
 *  combatant row's HP number and the stat block's HP heart. */
export function hpToneFor(tier: HpTier): string {
  switch (tier) {
    case 'hurt':
      return 'text-amber-600 dark:text-amber-400'
    case 'bloodied':
      return 'font-semibold text-rose-600 dark:text-rose-400'
    case 'critical':
      return 'font-bold text-red-700 dark:text-red-400'
    case 'healthy':
      return 'text-emerald-600 dark:text-emerald-400'
    default:
      return 'text-slate-900 dark:text-slate-100'
  }
}
