// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from '../schema/combatant.ts'
import { isFoe } from '../combat/combatant.ts'

const nameOf = (c: Combatant): string => (c.isPC ? c.name : c.label)
const byName = (a: Combatant, b: Combatant): number => nameOf(a).localeCompare(nameOf(b))

const chip =
  'rounded border border-slate-300 px-2 py-1 text-sm text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
const chipActive =
  'rounded border border-indigo-500 bg-indigo-50 px-2 py-1 text-sm font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'

/**
 * The shared target picker used by the action resolver and the apply-effect panel.
 * Combatants are split into Allies and Foes (each sorted alphabetically) so the GM
 * scans them quickly; the caller's `onToggle` decides single- vs multi-select.
 */
export function TargetChips({
  targets,
  selected,
  onToggle,
  emptyText = 'No other combatants to target.',
}: {
  targets: Combatant[]
  selected: Set<string>
  onToggle: (id: string) => void
  emptyText?: string
}) {
  if (targets.length === 0) {
    return <p className="text-sm text-slate-500 dark:text-slate-400">{emptyText}</p>
  }
  const allies = targets.filter((t) => !isFoe(t)).sort(byName)
  const foes = targets.filter((t) => isFoe(t)).sort(byName)
  const both = allies.length > 0 && foes.length > 0

  const group = (label: string, list: Combatant[]) =>
    list.length === 0 ? null : (
      <div className="space-y-1">
        {both && (
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            {label}
          </p>
        )}
        <div className="flex flex-wrap gap-1.5">
          {list.map((t) => (
            <button
              key={t.combatantId}
              type="button"
              aria-pressed={selected.has(t.combatantId)}
              onClick={() => onToggle(t.combatantId)}
              className={selected.has(t.combatantId) ? chipActive : chip}
            >
              {nameOf(t)}
            </button>
          ))}
        </div>
      </div>
    )

  return (
    <div className="space-y-2">
      {group('Allies', allies)}
      {group('Foes', foes)}
    </div>
  )
}
