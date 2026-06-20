// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Effect } from '../schema/effect.ts'
import { badgeLabel } from '../combat/effects.ts'

/** Tone by the effect's badge category — both light and dark. */
function toneFor(icon: string | undefined): string {
  switch (icon) {
    case 'debuff':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
    case 'buff':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
    case 'reminder':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
    case 'condition':
    default:
      return 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
  }
}

/** A single Effect rendered as a badge; clickable to remove when `onRemove` is set. */
export function EffectBadge({
  effect,
  onRemove,
}: {
  effect: Effect
  onRemove?: () => void
}) {
  const className = `inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${toneFor(effect.icon)}`
  if (onRemove) {
    return (
      <button
        type="button"
        onClick={onRemove}
        title={`Remove ${effect.name}`}
        className={`${className} hover:opacity-80`}
      >
        {badgeLabel(effect)}
        <span aria-hidden>×</span>
      </button>
    )
  }
  return (
    <span title={effect.name} className={className}>
      {badgeLabel(effect)}
    </span>
  )
}
