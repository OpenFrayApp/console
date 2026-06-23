// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Effect } from '../schema/effect.ts'
import { badgeLabel } from '../combat/effects.ts'
import type { SaveEndsGroup } from '../combat/saveEnds.ts'

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
  // A save-ends effect carries its escape save; surface the DC so the DM sees it
  // (and is reminded a save is owed) instead of a bare condition name.
  const save = effect.duration.type === 'saveEnds' ? effect.duration.save : null
  const saveTag = save ? (
    <span className="opacity-70" title={`${save.ability.toUpperCase()} save DC ${save.dc} ends it`}>
      · save DC {save.dc}
    </span>
  ) : null
  if (onRemove) {
    return (
      <button
        type="button"
        onClick={onRemove}
        title={`Remove ${effect.name}`}
        className={`${className} hover:opacity-80`}
      >
        {badgeLabel(effect)}
        {saveTag}
        <span aria-hidden>×</span>
      </button>
    )
  }
  return (
    <span title={effect.name} className={className}>
      {badgeLabel(effect)}
      {saveTag}
    </span>
  )
}

/** Several save-ends conditions that share one save, shown as a single badge (they
 *  roll and end together). Removing it clears the whole group. */
export function SaveEndsBadge({
  group,
  onRemove,
}: {
  group: SaveEndsGroup
  onRemove?: () => void
}) {
  const className = `inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-medium ${toneFor('condition')}`
  const names = group.effects.map((e) => e.name).join(', ')
  const tag = (
    <span className="opacity-70" title={`${group.ability.toUpperCase()} save DC ${group.dc} ends them`}>
      · save DC {group.dc}
    </span>
  )
  if (onRemove) {
    return (
      <button type="button" onClick={onRemove} title={`Remove ${names}`} className={`${className} hover:opacity-80`}>
        {names}
        {tag}
        <span aria-hidden>×</span>
      </button>
    )
  }
  return (
    <span title={names} className={className}>
      {names}
      {tag}
    </span>
  )
}
