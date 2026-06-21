// SPDX-License-Identifier: AGPL-3.0-or-later
// Copyright (C) 2026 OpenFray contributors

import type { ReactNode } from 'react'
import type { Concentration } from '../schema/combatant.ts'
import { EditableField } from './EditableField.tsx'

const STAT_LABEL = 'text-[10px] font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500'

function concentrationTitle(c: Concentration): string {
  const base = c.spell ? `Concentrating: ${c.spell}` : 'Concentrating'
  return c.rounds != null ? `${base} (${c.rounds} round${c.rounds === 1 ? '' : 's'} left)` : base
}

interface StatEdit {
  initial: string
  onCommit: (value: string) => void
  title: string
}

/** A compact header stat: big value over a small uppercase label, optionally editable. */
export function HeaderStat({ label, value, edit }: { label: string; value: ReactNode; edit?: StatEdit }) {
  return (
    <div className="min-w-[2.5rem] text-center leading-tight">
      <div className="text-lg font-bold tabular-nums">
        {edit ? (
          <EditableField
            initial={edit.initial}
            onCommit={edit.onCommit}
            title={edit.title}
            inputMode="numeric"
            inputClassName="w-14 rounded border border-slate-300 bg-white px-1 text-center text-lg font-bold tabular-nums dark:border-slate-600 dark:bg-slate-800"
          >
            {value}
          </EditableField>
        ) : (
          value
        )}
      </div>
      <div className={STAT_LABEL}>{label}</div>
    </div>
  )
}

/**
 * The shared sticky header for a combatant detail panel — used by both the
 * creature stat block and the PC panel so they look identical. Below a wide
 * container it stacks: name on top, stats (+ speeds) below.
 */
export function StatHeader({
  name,
  onRename,
  subtitle,
  originalName,
  legendary,
  concentration,
  stats,
  speeds,
}: {
  name: string
  onRename?: (value: string) => void
  subtitle: ReactNode
  /** Shown muted after the name (e.g. a creature's original name behind a label). */
  originalName?: string
  legendary?: boolean
  concentration?: Concentration | null
  /** The AC / HP / … HeaderStat elements. */
  stats: ReactNode
  /** Stacked speed lines, right-aligned (creatures only). */
  speeds?: string[]
}) {
  return (
    <div className="sticky top-0 z-10 border-b border-slate-200 bg-white pb-2 pt-1 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex flex-col gap-2 @3xl:flex-row @3xl:items-center @3xl:justify-between @3xl:gap-x-6">
        <div className="min-w-0 @3xl:flex-1">
          <div className="flex min-w-0 items-center gap-2">
            {onRename ? (
              <EditableField
                initial={name}
                onCommit={(v) => {
                  const t = v.trim()
                  if (t) onRename(t)
                }}
                title="Rename — changes how it appears in the tracker"
                inputClassName="min-w-0 rounded border border-slate-300 bg-white px-1 text-2xl font-bold tracking-tight dark:border-slate-600 dark:bg-slate-800"
              >
                <h3 className="truncate text-2xl font-bold tracking-tight">{name}</h3>
              </EditableField>
            ) : (
              <h3 className="truncate text-2xl font-bold tracking-tight">{name}</h3>
            )}
            {legendary && (
              <span
                title="Legendary"
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-amber-200 text-xs font-bold text-amber-800 dark:bg-amber-900 dark:text-amber-200"
              >
                L
              </span>
            )}
            {concentration && (
              <span
                title={concentrationTitle(concentration)}
                className="inline-flex h-5 shrink-0 items-center gap-1 rounded bg-violet-200 px-1 text-xs font-bold text-violet-800 dark:bg-violet-900 dark:text-violet-200"
              >
                C
                {concentration.rounds != null && (
                  <span className="font-medium tabular-nums">{concentration.rounds}</span>
                )}
              </span>
            )}
            {originalName && (
              <span
                className="shrink-0 text-sm text-slate-400 dark:text-slate-500"
                title={`Original name: ${originalName}`}
              >
                ({originalName})
              </span>
            )}
          </div>
          <p className="truncate text-sm italic text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex items-center gap-5">{stats}</div>
          {speeds && speeds.length > 0 && (
            <div className="flex flex-col items-end text-xs leading-tight text-slate-500 dark:text-slate-400">
              {speeds.map((s) => (
                <span key={s}>{s}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
