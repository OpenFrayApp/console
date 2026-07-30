// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Effect } from '../schema/effect.ts'
import { badgeLabel, describeDuration } from '../combat/effects.ts'
import { resolveCondition } from '../compendium/conditions.ts'
import { HoverCondition } from './HoverCondition.tsx'

/** The badge text, wrapped in a condition hover preview when the effect is a condition. */
function EffectLabel({ effect }: { effect: Effect }) {
  const condition = effect.icon === 'condition' ? resolveCondition(effect.name) : undefined
  const label = badgeLabel(effect)
  if (!condition) return <>{label}</>
  return (
    <HoverCondition name={condition.name} text={condition.text} className="cursor-help">
      {label}
    </HoverCondition>
  )
}

/** Badge tone classes by effect kind: debuff rose, buff emerald, reminder amber, counter indigo, else slate. */
function toneFor(icon: string | undefined): string {
  switch (icon) {
    case 'debuff':
      return 'bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200'
    case 'buff':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
    case 'reminder':
      return 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200'
    case 'counter':
      return 'bg-indigo-100 text-indigo-900 dark:bg-indigo-950 dark:text-indigo-200'
    case 'condition':
    default:
      return 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-100'
  }
}

/**
 * A single Effect as a badge; clickable to remove when `onRemove` is set. The badge
 * carries the label only — how long it lasts, and any escape save, live in the
 * Applied effects list beside the stat block, so a crowded row stays readable.
 */
export function EffectBadge({ effect, onRemove }: { effect: Effect; onRemove?: () => void }) {
  const className = `inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${toneFor(effect.icon)}`
  const title = `${effect.name} — ${describeDuration(effect)}`
  if (onRemove) {
    return (
      <button
        type="button"
        onClick={onRemove}
        title={`Remove ${effect.name}`}
        className={`${className} hover:opacity-80`}
      >
        <EffectLabel effect={effect} />
        <span aria-hidden>×</span>
      </button>
    )
  }
  return (
    <span title={title} className={className}>
      <EffectLabel effect={effect} />
    </span>
  )
}
