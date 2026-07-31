// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { Combatant } from '../schema/combatant.ts'
import { isFoe, nameOf } from '../combat/combatant.ts'
import { Chip } from './ui.tsx'

/** Sort comparator: display names, locale-aware. */
const byName = (a: Combatant, b: Combatant): number => nameOf(a).localeCompare(nameOf(b))

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

  /** One chip group; the heading only shows when both allies and foes are present. */
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
            <Chip
              key={t.combatantId}
              active={selected.has(t.combatantId)}
              aria-pressed={selected.has(t.combatantId)}
              onClick={() => onToggle(t.combatantId)}
            >
              {nameOf(t)}
            </Chip>
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
